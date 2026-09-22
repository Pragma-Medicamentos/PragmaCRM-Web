import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase/client'
import { ApiError } from '../../lib/api/apiClient'
import { getGoogleMapsApiKey, loadGoogleMaps } from '../../lib/googleMaps'
import { updateCustomerLocation } from './customersApi'
import type { CustomerCore } from './customers.types'
import { LocationPickerMap, type LocationPoint } from '../../components/LocationPickerMap'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Field, FieldLabel } from '../../components/ui/field'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'

const GPS_VALIDATION_RADIUS_METERS = 80

interface AssignLocationDialogProps {
  customerId: string
  customerName: string
  initialLocation: LocationPoint | null
  onClose: () => void
  onUpdated: (result: CustomerCore) => void
}

/**
 * Wireframe 1p "Ubicación GPS del cliente · RF-02": Places Autocomplete,
 * pin arrastrable / clic en mapa y "Usar mi ubicación". Persiste lat/lng y,
 * cuando Places los aporta, address/place_id vía PATCH .../location.
 */
export function AssignLocationDialog({
  customerId,
  customerName,
  initialLocation,
  onClose,
  onUpdated,
}: AssignLocationDialogProps) {
  const [point, setPoint] = useState<LocationPoint | null>(initialLocation)
  const [formattedAddress, setFormattedAddress] = useState<string | null>(null)
  const [placeId, setPlaceId] = useState<string | null>(null)
  const [searchText, setSearchText] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [locating, setLocating] = useState(false)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const hasMapsKey = Boolean(getGoogleMapsApiKey())

  function handleMapChange(next: LocationPoint) {
    setPoint(next)
    // Pin movido a mano: omitir address/place_id en el PATCH (Api: omit = leave alone).
    setFormattedAddress(null)
    setPlaceId(null)
  }

  function handleMapReady(map: google.maps.Map) {
    mapRef.current = map
    void attachAutocomplete(map)
  }

  async function attachAutocomplete(map: google.maps.Map) {
    if (!searchInputRef.current || autocompleteRef.current) return
    try {
      await loadGoogleMaps()
      const autocomplete = new google.maps.places.Autocomplete(searchInputRef.current, {
        fields: ['formatted_address', 'geometry', 'place_id', 'name'],
        componentRestrictions: { country: 'sv' },
      })
      autocomplete.bindTo('bounds', map)
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        const loc = place.geometry?.location
        if (!loc) return
        const next = { lat: loc.lat(), lng: loc.lng() }
        setPoint(next)
        setFormattedAddress(place.formatted_address ?? place.name ?? null)
        setPlaceId(place.place_id ?? null)
        setSearchText(place.formatted_address ?? place.name ?? searchInputRef.current?.value ?? '')
        map.panTo(next)
        map.setZoom(16)
      })
      autocompleteRef.current = autocomplete
    } catch {
      // Sin key o fallo de loader: el input queda como texto; el mapa ya avisa.
    }
  }

  useEffect(() => {
    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current)
        autocompleteRef.current = null
      }
    }
  }, [])

  function handleUseMyLocation() {
    setGeoError(null)
    if (!navigator.geolocation) {
      setGeoError('Tu navegador no soporta geolocalización.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setPoint(next)
        setFormattedAddress(null)
        setPlaceId(null)
        mapRef.current?.panTo(next)
        mapRef.current?.setZoom(16)
        setLocating(false)
      },
      () => {
        setGeoError('No se pudo obtener tu ubicación. Revisá los permisos del navegador.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 15_000 }
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!point) return

    setSubmitting(true)
    setSubmitError(null)
    try {
      const { data } = await supabase.auth.getSession()
      const payload: Parameters<typeof updateCustomerLocation>[2] = {
        latitude: point.lat,
        longitude: point.lng,
      }
      if (formattedAddress) payload.address = formattedAddress
      if (placeId) payload.place_id = placeId

      const result = await updateCustomerLocation(
        data.session?.access_token ?? null,
        customerId,
        payload
      )
      onUpdated(result)
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : 'No se pudo guardar la ubicación. Intenta de nuevo.'
      )
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>Ubicación de {customerName}</DialogTitle>
            <DialogDescription>
              Buscá una dirección o tocá el mapa / arrastrá el pin para fijar el punto exacto.
            </DialogDescription>
          </DialogHeader>

          {submitError && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {submitError}
            </p>
          )}

          <div className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="location-search">Buscar dirección</FieldLabel>
              <Input
                id="location-search"
                ref={searchInputRef}
                type="text"
                autoComplete="off"
                placeholder={hasMapsKey ? 'Ej. Colonia Escalón, San Salvador' : 'Mapa no disponible sin API key'}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                disabled={!hasMapsKey}
              />
              {formattedAddress && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Dirección seleccionada: {formattedAddress}
                </p>
              )}
            </Field>

            <LocationPickerMap
              value={point}
              onChange={handleMapChange}
              radiusMeters={GPS_VALIDATION_RADIUS_METERS}
              onMapReady={handleMapReady}
              className="overflow-hidden rounded-lg border border-border"
            />

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUseMyLocation}
                disabled={locating || !hasMapsKey}
              >
                {locating ? 'Obteniendo…' : 'Usar mi ubicación'}
              </Button>
              {point && (
                <span className="text-xs text-muted-foreground">
                  {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
                </span>
              )}
            </div>
            {geoError && (
              <p role="alert" className="text-sm text-destructive">
                {geoError}
              </p>
            )}

            <p className="text-sm text-muted-foreground">
              El círculo muestra los {GPS_VALIDATION_RADIUS_METERS} m de radio que la app usa para
              validar la visita (RF-06). Es una referencia fija del sistema.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || !point}>
              {submitting ? 'Guardando…' : 'Guardar ubicación'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
