import { useEffect, useId, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase/client'
import { ApiError } from '../../lib/api/apiClient'
import { createVendor } from './vendorsApi'
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

interface CreateVendorDialogProps {
  onClose: () => void
  onCreated: () => void
}

/**
 * Modal de alta de vendedor (HU-01 / CA1). La cuenta nace sin contraseña:
 * la API crea el usuario en Supabase Auth y envía un código OTP al correo
 * para que el vendedor la fije desde la app (ver create-seller.use-case.ts
 * en PragmaCRM-Api). Este dashboard no pide ni muestra contraseñas.
 */
export function CreateVendorDialog({ onClose, onCreated }: CreateVendorDialogProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [created, setCreated] = useState<Vendor | null>(null)
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
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        {created ? (
          <>
            <h2 id={titleId}>Vendedor creado</h2>
            <p className="modal__hint">
              Se envió un código de acceso al correo de <strong>{created.name}</strong> (
              {created.email}). El vendedor debe usarlo desde la app para verificar su cuenta y fijar
              su contraseña. Expira en 10 minutos — si no llega a tiempo, se puede reenviar desde el
              listado.
            </p>
            <div className="modal__actions">
              <button type="button" className="button button--primary" onClick={onCreated}>
                Listo
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <h2 id={titleId}>Nuevo vendedor</h2>

            {submitError && (
              <p className="form-banner" role="alert">
                {submitError}
              </p>
            )}

            <div className="field">
              <label htmlFor="vendor-name">Nombre completo</label>
              <input
                id="vendor-name"
                ref={firstFieldRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'vendor-name-error' : undefined}
              />
              {errors.name && (
                <span id="vendor-name-error" className="field__error">
                  {errors.name}
                </span>
              )}
            </div>

            <div className="field">
              <label htmlFor="vendor-email">Correo electrónico</label>
              <input
                id="vendor-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'vendor-email-error' : undefined}
              />
              {errors.email && (
                <span id="vendor-email-error" className="field__error">
                  {errors.email}
                </span>
              )}
            </div>

            <div className="modal__actions">
              <button type="button" className="button button--ghost" onClick={onClose} disabled={submitting}>
                Cancelar
              </button>
              <button type="submit" className="button button--primary" disabled={submitting}>
                {submitting ? 'Creando…' : 'Crear vendedor'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
