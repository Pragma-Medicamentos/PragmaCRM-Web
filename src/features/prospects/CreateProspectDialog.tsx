import { useState } from 'react'
import { ApiError } from '../../lib/api/apiClient'
import { useVendors } from '../vendors/useVendors'
import { createProspect } from './prospectsApi'
import type { Prospect } from './prospects.types'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Field, FieldError, FieldLabel } from '../../components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
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
  phone?: string
  user_id?: string
}

function validate(name: string, phone: string, userId: string): FormErrors {
  const errors: FormErrors = {}
  if (!name.trim()) errors.name = 'El nombre es obligatorio.'
  if (!phone.trim()) errors.phone = 'El teléfono es obligatorio.'
  if (!userId) errors.user_id = 'Elegí a qué vendedor se le atribuye.'
  return errors
}

interface CreateProspectDialogProps {
  onClose: () => void
  onCreated: (prospect: Prospect) => void
}

/**
 * Alta manual de prospecto desde el admin (PCRM-64) — para leads que llegan
 * por teléfono, redes u oficina, a diferencia del registro en campo desde la
 * app móvil (PCRM-62). Se atribuye a un vendedor elegido acá; sin GPS — se
 * agrega después desde la fila del listado (ver SetProspectLocationDialog).
 */
export function CreateProspectDialog({ onClose, onCreated }: CreateProspectDialogProps) {
  const { state: vendorsState } = useVendors()
  const activeVendors = vendorsState.status === 'ready' ? vendorsState.vendors.filter((v) => v.active) : []

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [userId, setUserId] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fieldErrors = validate(name, phone, userId)
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) return

    setSubmitting(true)
    setSubmitError(null)
    try {
      const prospect = await createProspect({
        user_id: userId,
        name: name.trim(),
        phone: phone.trim(),
      })
      onCreated(prospect)
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'No se pudo registrar el prospecto. Intenta de nuevo.')
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>Nuevo prospecto</DialogTitle>
            <DialogDescription>
              Para leads que llegan por teléfono, redes o en oficina. La ubicación GPS se puede agregar después
              desde el listado.
            </DialogDescription>
          </DialogHeader>

          {submitError && (
            <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {submitError}
            </p>
          )}

          <div className="flex flex-col gap-4">
            <Field data-invalid={Boolean(errors.name)}>
              <FieldLabel htmlFor="prospect-name">Nombre</FieldLabel>
              <Input
                id="prospect-name"
                type="text"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name && <FieldError>{errors.name}</FieldError>}
            </Field>

            <Field data-invalid={Boolean(errors.phone)}>
              <FieldLabel htmlFor="prospect-phone">Teléfono</FieldLabel>
              <Input
                id="prospect-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                aria-invalid={Boolean(errors.phone)}
              />
              {errors.phone && <FieldError>{errors.phone}</FieldError>}
            </Field>

            <Field data-invalid={Boolean(errors.user_id)}>
              <FieldLabel htmlFor="prospect-vendor">Vendedor</FieldLabel>
              <Select value={userId || undefined} onValueChange={setUserId}>
                <SelectTrigger id="prospect-vendor" aria-invalid={Boolean(errors.user_id)}>
                  <SelectValue placeholder="Elegir vendedor" />
                </SelectTrigger>
                <SelectContent>
                  {activeVendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.user_id && <FieldError>{errors.user_id}</FieldError>}
              {vendorsState.status === 'ready' && activeVendors.length === 0 && (
                <p className="mt-1 text-sm text-muted-foreground">No hay vendedores activos.</p>
              )}
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Registrando…' : 'Registrar prospecto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
