import { useState } from 'react'
import { supabase } from '../../lib/supabase/client'
import { ApiError, isRouteNotImplemented } from '../../lib/api/apiClient'
import { updateCustomerLocation } from './customersApi'
import type { CustomerLocationUpdateResult } from './customers.types'
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

// Radio de validación GPS (RF-06). Constante global, no un campo por cliente
// (CLAUDE.md 5.3) — se muestra solo como referencia visual sobre el pin.
const GPS_VALIDATION_RADIUS_METERS = 80

function isValidLat(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90
}

function isValidLng(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180
}

interface AssignLocationDialogProps {
  customerId: string
  customerName: string
  initialLocation: LocationPoint | null
  onClose: () => void
  onUpdated: (result: CustomerLocationUpdateResult) => void
}

/**
 * Wireframe 1p "Ubicación GPS del cliente · RF-02": fijar el punto exacto del
 * cliente arrastrando el pin o tocando el mapa, con edición manual de
 * latitud/longitud como alternativa. Sin buscador de direcciones: requeriría
 * un servicio de geocodificación externo no presupuestado (mismo riesgo ya
 * señalado con Google Places en CLAUDE.md 9.2).
 */
export function AssignLocationDialog({
  customerId,
  customerName,
  initialLocation,
  onClose,
  onUpdated,
}: AssignLocationDialogProps) {
  const [point, setPoint] = useState<LocationPoint | null>(initialLocation)
  const [latText, setLatText] = useState(initialLocation ? String(initialLocation.lat) : '')
  const [lngText, setLngText] = useState(initialLocation ? String(initialLocation.lng) : '')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [pendingBackend, setPendingBackend] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  function handleMapChange(next: LocationPoint) {
    setPoint(next)
    setLatText(next.lat.toFixed(6))
    setLngText(next.lng.toFixed(6))
  }

  function handleLatChange(text: string) {
    setLatText(text)
    const lat = Number(text)
    if (point && isValidLat(lat)) setPoint({ ...point, lat })
    else if (!point && isValidLat(lat) && isValidLng(Number(lngText))) setPoint({ lat, lng: Number(lngText) })
  }

  function handleLngChange(text: string) {
    setLngText(text)
    const lng = Number(text)
    if (point && isValidLng(lng)) setPoint({ ...point, lng })
    else if (!point && isValidLng(lng) && isValidLat(Number(latText))) setPoint({ lat: Number(latText), lng })
  }

  const coordinatesInvalid = point !== null && (!isValidLat(point.lat) || !isValidLng(point.lng))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!point || coordinatesInvalid) return

    setSubmitting(true)
    setSubmitError(null)
    setPendingBackend(false)
    try {
      const { data } = await supabase.auth.getSession()
      const result = await updateCustomerLocation(data.session?.access_token ?? null, customerId, point)
      onUpdated(result)
    } catch (err) {
      if (isRouteNotImplemented(err)) {
        setPendingBackend(true)
      } else {
        setSubmitError(
          err instanceof ApiError ? err.message : 'No se pudo guardar la ubicación. Intenta de nuevo.'
        )
      }
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
              Definí el punto exacto del cliente para el ruteo. Tocá el mapa o arrastrá el pin.
            </DialogDescription>
          </DialogHeader>

          {pendingBackend && (
            <p className="rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground">
              Esta ventana ya guarda la ubicación; falta implementar{' '}
              <code>PATCH /api/v1/customers/{customerId}/location</code> en PragmaCRM-Api.
            </p>
          )}
          {submitError && (
            <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {submitError}
            </p>
          )}

          <div className="flex flex-col gap-4">
            <LocationPickerMap
              value={point}
              onChange={handleMapChange}
              radiusMeters={GPS_VALIDATION_RADIUS_METERS}
              className="overflow-hidden rounded-lg border border-border"
            />

            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={point !== null && !isValidLat(point.lat)}>
                <FieldLabel htmlFor="location-lat">Latitud</FieldLabel>
                <Input
                  id="location-lat"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={latText}
                  onChange={(e) => handleLatChange(e.target.value)}
                />
              </Field>
              <Field data-invalid={point !== null && !isValidLng(point.lng)}>
                <FieldLabel htmlFor="location-lng">Longitud</FieldLabel>
                <Input
                  id="location-lng"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={lngText}
                  onChange={(e) => handleLngChange(e.target.value)}
                />
              </Field>
            </div>

            <p className="text-sm text-muted-foreground">
              El círculo punteado muestra los {GPS_VALIDATION_RADIUS_METERS} m de radio que la app usa para validar
              la visita (RF-06). Es una referencia fija del sistema, no algo que se ajuste por cliente.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || !point || coordinatesInvalid}>
              {submitting ? 'Guardando…' : 'Guardar ubicación'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
