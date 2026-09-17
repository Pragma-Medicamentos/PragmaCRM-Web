import { useState } from 'react'
import { supabase } from '../../lib/supabase/client'
import { ApiError } from '../../lib/api/apiClient'
import { createVendor } from './vendorsApi'
import type { Vendor } from './vendors.types'
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

interface CreateVendorDialogProps {
  onClose: () => void
  onCreated: () => void
}

/**
 * Modal de alta de vendedor (HU-01 / CA1, wireframe 1l). La cuenta nace sin
 * contraseña: la API crea el usuario en Supabase Auth y envía un código OTP
 * al correo para que el vendedor la fije desde la app (ver
 * create-seller.use-case.ts en PragmaCRM-Api). Este dashboard no pide ni
 * muestra contraseñas.
 */
export function CreateVendorDialog({ onClose, onCreated }: CreateVendorDialogProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [created, setCreated] = useState<Vendor | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fieldErrors = validate(name, email)
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) return

    setSubmitting(true)
    setSubmitError(null)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const vendor = await createVendor(session?.access_token ?? null, {
        name: name.trim(),
        email: email.trim(),
      })
      setCreated(vendor)
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'No se pudo crear el vendedor. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Vendedor creado</DialogTitle>
              <DialogDescription>
                Se envió un código de acceso al correo de <strong>{created.name}</strong> ({created.email}). El
                vendedor debe usarlo desde la app para verificar su cuenta y fijar su contraseña. Expira en 10
                minutos — si no llega a tiempo, se puede reenviar desde el listado.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" onClick={onCreated}>
                Listo
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <DialogHeader>
              <DialogTitle>Nuevo vendedor</DialogTitle>
              <DialogDescription>Perfil y credenciales de acceso a la app.</DialogDescription>
            </DialogHeader>

            {submitError && (
              <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                {submitError}
              </p>
            )}

            <div className="flex flex-col gap-4">
              <Field data-invalid={Boolean(errors.name)}>
                <FieldLabel htmlFor="vendor-name">Nombre completo</FieldLabel>
                <Input
                  id="vendor-name"
                  type="text"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={Boolean(errors.name)}
                />
                {errors.name && <FieldError>{errors.name}</FieldError>}
              </Field>

              <Field data-invalid={Boolean(errors.email)}>
                <FieldLabel htmlFor="vendor-email">Correo electrónico</FieldLabel>
                <Input
                  id="vendor-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={Boolean(errors.email)}
                />
                {errors.email && <FieldError>{errors.email}</FieldError>}
              </Field>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creando…' : 'Crear vendedor'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
