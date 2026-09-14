import { useEffect, useId, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase/client'
import { ApiError } from '../../lib/api/apiClient'
import { updateVendor } from './vendorsApi'
import type { Vendor } from './vendors.types'

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
 * Modal de edición de vendedor (HU-01). Solo nombre y correo — el estado
 * (activo/inactivo) se cambia desde el listado, no desde este formulario, y
 * la contraseña la fija el vendedor por su cuenta vía OTP (ver
 * CreateVendorDialog).
 */
export function EditVendorDialog({ vendor, onClose, onUpdated }: EditVendorDialogProps) {
  const [name, setName] = useState(vendor.name)
  const [email, setEmail] = useState(vendor.email ?? '')
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const firstFieldRef = useRef<HTMLInputElement>(null)
  const titleId = useId()

  useEffect(() => {
    firstFieldRef.current?.focus()
  }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fieldErrors = validate(name, email)
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) return

    setSubmitting(true)
    setSubmitError(null)
    try {
      const { data } = await supabase.auth.getSession()
      const updated = await updateVendor(data.session?.access_token ?? null, vendor.id, {
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
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} noValidate>
          <h2 id={titleId}>Editar vendedor</h2>

          {submitError && (
            <p className="form-banner" role="alert">
              {submitError}
            </p>
          )}

          <div className="field">
            <label htmlFor="edit-vendor-name">Nombre completo</label>
            <input
              id="edit-vendor-name"
              ref={firstFieldRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'edit-vendor-name-error' : undefined}
            />
            {errors.name && (
              <span id="edit-vendor-name-error" className="field__error">
                {errors.name}
              </span>
            )}
          </div>

          <div className="field">
            <label htmlFor="edit-vendor-email">Correo electrónico</label>
            <input
              id="edit-vendor-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'edit-vendor-email-error' : undefined}
            />
            {errors.email && (
              <span id="edit-vendor-email-error" className="field__error">
                {errors.email}
              </span>
            )}
          </div>

          <div className="modal__actions">
            <button type="button" className="button button--ghost" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className="button button--primary" disabled={submitting}>
              {submitting ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
