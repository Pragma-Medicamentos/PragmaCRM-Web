import { useState } from 'react'
import { ApiError } from '../../lib/api/apiClient'
import { LocationPickerMap, type LocationPoint } from '../../components/LocationPickerMap'
import { updateProspectLocation } from './prospectsApi'
import type { Prospect } from './prospects.types'
import { Button } from '../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'

interface SetProspectLocationDialogProps {
  prospect: Prospect
  onClose: () => void
  onUpdated: (prospect: Prospect) => void
}

/**
 * Agrega o corrige el GPS de un prospecto dado de alta sin ubicación (ver
 * CreateProspectDialog) — la opción "agregarla luego" pedida para PCRM-64.
 * Reutiliza el mismo picker de mapa que la ubicación de clientes (RF-02).
 */
export function SetProspectLocationDialog({ prospect, onClose, onUpdated }: SetProspectLocationDialogProps) {
  const [point, setPoint] = useState<LocationPoint | null>(prospect.location)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [locating, setLocating] = useState(false)

  function handleUseMyLocation() {
    setGeoError(null)
    if (!navigator.geolocation) {
      setGeoError('Tu navegador no soporta geolocalización.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude })
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
      const updated = await updateProspectLocation(prospect.id, {
        latitude: point.lat,
        longitude: point.lng,
      })
      onUpdated(updated)
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'No se pudo guardar la ubicación. Intenta de nuevo.')
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>Ubicación de {prospect.name}</DialogTitle>
            <DialogDescription>Tocá el mapa o arrastrá el pin para fijar el punto.</DialogDescription>
          </DialogHeader>

          {submitError && (
            <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {submitError}
            </p>
          )}

          <div className="flex flex-col gap-4">
            <LocationPickerMap
              value={point}
              onChange={setPoint}
              className="overflow-hidden rounded-lg border border-border"
            />

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleUseMyLocation} disabled={locating}>
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
