import { useState } from 'react'
import { ApiError } from '../../lib/api/apiClient'
import { updateRoute } from './routesApi'
import type { Route, UpdateRouteInput } from './routes.types'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Field, FieldError, FieldLabel } from '../../components/ui/field'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'

interface EditRouteDialogProps {
  route: Route
  onClose: () => void
  onUpdated: (route: Route) => void
}

/** Edita nombre, municipio y zona de una ruta (PATCH /api/v1/routes/:id). Solo manda lo que cambió. */
export function EditRouteDialog({ route, onClose, onUpdated }: EditRouteDialogProps) {
  const [name, setName] = useState(route.name)
  const [municipality, setMunicipality] = useState(route.municipality ?? '')
  const [zone, setZone] = useState(route.zone ?? '')
  const [nameError, setNameError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setNameError('El nombre es obligatorio.')
      return
    }
    setNameError(null)

    const input: UpdateRouteInput = {}
    if (name.trim() !== route.name) input.name = name.trim()
    if (municipality.trim() !== (route.municipality ?? '')) input.municipality = municipality.trim()
    if (zone.trim() !== (route.zone ?? '')) input.zone = zone.trim()

    if (Object.keys(input).length === 0) {
      onClose()
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    try {
      onUpdated(await updateRoute(route.id, input))
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'No se pudo guardar la ruta. Intenta de nuevo.')
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>Editar ruta</DialogTitle>
            <DialogDescription>
              La zona y el municipio se usan para filtrar reportes por zona.
            </DialogDescription>
          </DialogHeader>

          {submitError && (
            <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {submitError}
            </p>
          )}

          <div className="flex flex-col gap-4">
            <Field data-invalid={Boolean(nameError)}>
              <FieldLabel htmlFor="edit-route-name">Nombre de la ruta</FieldLabel>
              <Input
                id="edit-route-name"
                type="text"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={Boolean(nameError)}
              />
              {nameError && <FieldError>{nameError}</FieldError>}
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-route-municipality">Municipio</FieldLabel>
              <Input
                id="edit-route-municipality"
                type="text"
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-route-zone">Zona</FieldLabel>
              <Input id="edit-route-zone" type="text" value={zone} onChange={(e) => setZone(e.target.value)} />
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
