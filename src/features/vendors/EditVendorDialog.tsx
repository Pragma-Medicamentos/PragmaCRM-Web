import { useState } from 'react'
import { ApiError } from '../../lib/api/apiClient'
import { updateVendor } from './vendorsApi'
import type { Vendor } from './vendors.types'
import { ErrorAlert } from '@/components/ErrorAlert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface FormErrors {
  name?: string
  email?: string
}

function validate(name: string, email: string): FormErrors {
  const errors: FormErrors = {}
  if (!name.trim()) errors.name = 'El nombre es obligatorio.'
  if (!email.trim()) errors.email = 'El correo es obligatorio.'
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'El correo no tiene un formato válido.'
  return errors
}

interface EditVendorDialogProps {
  vendor: Vendor
  onClose: () => void
  onUpdated: (vendor: Vendor) => void
}

/**
 * Modal de edición de vendedor (HU-01, wireframe 1l). Solo nombre y correo —
 * el estado (activo/inactivo) se cambia desde el listado, no desde este
 * formulario, y la contraseña la fija el vendedor por su cuenta vía OTP (ver
 * CreateVendorDialog).
 */
export function EditVendorDialog({ vendor, onClose, onUpdated }: EditVendorDialogProps) {
  const [name, setName] = useState(vendor.name)
  const [email, setEmail] = useState(vendor.email ?? '')
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fieldErrors = validate(name, email)
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) return

    setSubmitting(true)
    setSubmitError(null)
    try {
      const updated = await updateVendor(vendor.id, {
        name: name.trim(),
        email: email.trim(),
      })
      onUpdated(updated)
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'No se pudo actualizar el vendedor. Intenta de nuevo.')
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Editar vendedor</DialogTitle>
            <DialogDescription>Actualiza el nombre o el correo del vendedor.</DialogDescription>
          </DialogHeader>

          {submitError && <ErrorAlert>{submitError}</ErrorAlert>}

          <FieldGroup>
            <Field data-invalid={Boolean(errors.name)}>
              <FieldLabel htmlFor="edit-vendor-name">Nombre completo</FieldLabel>
              <Input
                id="edit-vendor-name"
                type="text"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name && <FieldError>{errors.name}</FieldError>}
            </Field>

            <Field data-invalid={Boolean(errors.email)}>
              <FieldLabel htmlFor="edit-vendor-email">Correo electrónico</FieldLabel>
              <Input
                id="edit-vendor-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email && <FieldError>{errors.email}</FieldError>}
            </Field>
          </FieldGroup>

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
