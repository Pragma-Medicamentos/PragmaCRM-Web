import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase/client'
import { ApiError } from '../../lib/api/apiClient'
import { createRoute } from './routesApi'
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

interface FormErrors {
  name?: string
}

function validate(name: string): FormErrors {
  const errors: FormErrors = {}
  if (!name.trim()) errors.name = 'El nombre es obligatorio.'
  return errors
}

interface CreateRouteDialogProps {
  onClose: () => void
  onCreated: () => void
}

/**
 * Modal de alta de ruta (RF-04). Crea name/municipality/zone y navega al
 * editor de paradas (PCRM-141).
 */
export function CreateRouteDialog({ onClose, onCreated }: CreateRouteDialogProps) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [municipality, setMunicipality] = useState('')
  const [zone, setZone] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fieldErrors = validate(name)
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) return

    setSubmitting(true)
    setSubmitError(null)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const route = await createRoute(session?.access_token ?? null, {
        name: name.trim(),
        municipality: municipality.trim() || undefined,
        zone: zone.trim() || undefined,
      })
      onCreated()
      navigate(`/rutas/${route.id}/paradas`)
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'No se pudo crear la ruta. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>Nueva ruta</DialogTitle>
            <DialogDescription>
              Nombre, municipio y zona. Después podés configurar las paradas de la ruta.
            </DialogDescription>
          </DialogHeader>

          {submitError && (
            <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {submitError}
            </p>
          )}

          <div className="flex flex-col gap-4">
            <Field data-invalid={Boolean(errors.name)}>
              <FieldLabel htmlFor="route-name">Nombre de la ruta</FieldLabel>
              <Input
                id="route-name"
                type="text"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name && <FieldError>{errors.name}</FieldError>}
            </Field>

            <Field>
              <FieldLabel htmlFor="route-municipality">Municipio</FieldLabel>
              <Input
                id="route-municipality"
                type="text"
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="route-zone">Zona</FieldLabel>
              <Input id="route-zone" type="text" value={zone} onChange={(e) => setZone(e.target.value)} />
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Guardando…' : 'Guardar ruta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
