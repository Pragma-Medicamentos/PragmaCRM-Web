import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase/client'
import { apiFetch, ApiError } from '../../lib/api/apiClient'
import { requestLoginOtp } from './authApi'
import type { AppUser, RedirectReason } from './auth.types'
import pragmaLogo from '../../assets/pragma-logo-dark.png'

const MIN_PASSWORD_LENGTH = 8

function reasonMessage(reason: RedirectReason): string {
  // 'forbidden' trae el message tal cual lo mandó la API en el 403
  // (usuario no registrado, cuenta deshabilitada, etc.) — ver
  // PragmaCRM-Web/CLAUDE.md. 'role' es el único mensaje que genera este
  // repo, porque /api/v1/me no rechaza por rol.
  return reason.kind === 'forbidden' ? reason.message : 'Esta cuenta no tiene permisos de Administrador.'
}

// Login sin contraseña propia: la API dispara un código, Supabase lo
// verifica y, si la cuenta todavía no tiene contraseña (`passwordSetAt`
// null en /api/v1/me), este mismo formulario la pide antes de entrar. Ver
// "Flujo de login (OTP)" en PragmaCRM-Web/CLAUDE.md.
type Step =
  | { kind: 'email' }
  | { kind: 'code'; email: string; info: string }
  | { kind: 'password'; email: string; token: string }

export function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const reason = (location.state as { reason?: RedirectReason } | null)?.reason

  const [step, setStep] = useState<Step>({ kind: 'email' })
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRequestOtp(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const message = await requestLoginOtp(email.trim())
      setStep({ kind: 'code', email: email.trim(), info: message })
      setCode('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo enviar el código. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVerifyCode(e: FormEvent, currentStep: Extract<Step, { kind: 'code' }>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: currentStep.email,
      token: code.trim(),
      type: 'email',
    })

    if (verifyError || !data.session) {
      setSubmitting(false)
      setError('Código inválido o expirado. Pedí uno nuevo.')
      return
    }

    const token = data.session.access_token

    try {
      const appUser = await apiFetch<AppUser>('/api/v1/me', token)
      if (appUser.passwordSetAt) {
        navigate('/', { replace: true })
        return
      }
      setStep({ kind: 'password', email: currentStep.email, token })
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo verificar la cuenta. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSetPassword(e: FormEvent) {
    e.preventDefault()

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`)
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setSubmitting(true)
    setError(null)

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })

    setSubmitting(false)

    if (updateError) {
      setError('No se pudo fijar la contraseña. Intenta de nuevo.')
      return
    }

    navigate('/', { replace: true })
  }

  async function handleResend(currentStep: Extract<Step, { kind: 'code' }>) {
    setSubmitting(true)
    setError(null)
    try {
      const message = await requestLoginOtp(currentStep.email)
      setStep({ kind: 'code', email: currentStep.email, info: message })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo reenviar el código.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login">
      <aside className="login__panel">
        <img className="login__logo" src={pragmaLogo} alt="Farmacia Pragma" />
        <span className="login__brand">Pragma CRM</span>
        <p className="login__tagline">Panel de administración de Droguería Pragma.</p>
        <RouteMark />
      </aside>

      <main className="login__form-area">
        <div className="login__form-card">
          {reason && (
            <p className="login__banner" role="alert">
              {reasonMessage(reason)}
            </p>
          )}

          {step.kind === 'email' && (
            <form className="login__fields" onSubmit={handleRequestOtp} noValidate>
              {error && (
                <p className="form-banner" role="alert">
                  {error}
                </p>
              )}

              <div className="field">
                <label htmlFor="login-email">Correo electrónico</label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <button type="submit" className="button button--primary" disabled={submitting}>
                {submitting ? 'Enviando…' : 'Enviar código'}
              </button>
            </form>
          )}

          {step.kind === 'code' && (
            <form className="login__fields" onSubmit={(e) => handleVerifyCode(e, step)} noValidate>
              <p className="modal__hint">
                Enviamos un código a <strong>{step.email}</strong>. {step.info}
              </p>

              {error && (
                <p className="form-banner" role="alert">
                  {error}
                </p>
              )}

              <div className="field">
                <label htmlFor="login-code">Código de 6 dígitos</label>
                <input
                  id="login-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>

              <button type="submit" className="button button--primary" disabled={submitting}>
                {submitting ? 'Verificando…' : 'Ingresar'}
              </button>
              <button
                type="button"
                className="button button--ghost"
                disabled={submitting}
                onClick={() => handleResend(step)}
              >
                Reenviar código
              </button>
              <button
                type="button"
                className="button button--ghost"
                disabled={submitting}
                onClick={() => {
                  setStep({ kind: 'email' })
                  setError(null)
                }}
              >
                Usar otro correo
              </button>
            </form>
          )}

          {step.kind === 'password' && (
            <form className="login__fields" onSubmit={handleSetPassword} noValidate>
              <p className="modal__hint">Es tu primer ingreso. Fijá una contraseña para tu cuenta.</p>

              {error && (
                <p className="form-banner" role="alert">
                  {error}
                </p>
              )}

              <div className="field">
                <label htmlFor="login-new-password">Nueva contraseña</label>
                <input
                  id="login-new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="login-confirm-password">Confirmar contraseña</label>
                <input
                  id="login-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <button type="submit" className="button button--primary" disabled={submitting}>
                {submitting ? 'Guardando…' : 'Guardar y entrar'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}

function RouteMark() {
  return (
    <svg className="login__routemark" viewBox="0 0 220 120" fill="none" aria-hidden="true">
      <path
        d="M18 96 C 60 96, 60 40, 100 40 S 160 20, 202 20"
        stroke="#00ac00"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="18" cy="96" r="5" fill="#00ac00" />
      <circle cx="100" cy="40" r="5" fill="#00ac00" />
      <circle cx="202" cy="20" r="5" fill="#00ac00" />
    </svg>
  )
}
