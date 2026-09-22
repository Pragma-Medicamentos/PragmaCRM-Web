import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AtSign, Eye, EyeOff, Lock } from 'lucide-react'
import { supabase } from '../../lib/supabase/client'
import { apiFetch, ApiError } from '../../lib/api/apiClient'
import { requestLoginOtp } from './authApi'
import type { AppUser, RedirectReason } from './auth.types'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '../../components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '../../components/ui/input-group'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../../components/ui/input-otp'
import { Spinner } from '../../components/ui/spinner'
import brandWordmark from '../../assets/brand-wordmark.png'
import brandIcon from '../../assets/brand-icon.png'

const MIN_PASSWORD_LENGTH = 8
const OTP_LENGTH = 6

// Campo del login: pastilla rellena en vez del input con borde del resto del
// panel. Es la única pantalla sin AppShell, y el contraste con el fondo blanco
// de la tarjeta lo pide.
const PILL_FIELD = 'h-11 rounded-full border-transparent bg-muted'

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
  const [showPassword, setShowPassword] = useState(false)
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
    <div className="flex min-h-dvh items-center justify-center bg-surface p-4 sm:p-6 lg:p-10">
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl bg-background shadow-2xl shadow-primary/10 ring-1 ring-foreground/5 lg:min-h-[34rem] lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        {/* z-10: el arco verde barre por debajo del formulario, no por encima. */}
        <main className="relative z-10 flex flex-col justify-center gap-8 px-7 py-10 sm:px-12">
          <img src={brandWordmark} alt="Farmacia Pragma" className="h-8 w-auto self-start" />

          <div className="flex flex-col gap-2">
            <h1 className="font-display text-4xl leading-tight text-foreground">{headline(step)}</h1>
            <p className="max-w-[44ch] text-sm text-muted-foreground">{subheadline(step)}</p>
          </div>

          {reason && (
            <Alert variant="destructive">
              <AlertDescription>{reasonMessage(reason)}</AlertDescription>
            </Alert>
          )}

          {step.kind === 'email' && (
            <form onSubmit={handleRequestOtp} noValidate>
              <FieldGroup className="max-w-sm">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Field>
                  <FieldLabel htmlFor="login-email-input" className="sr-only">
                    Correo electrónico
                  </FieldLabel>
                  <InputGroup className={PILL_FIELD}>
                    <InputGroupAddon className="pl-3.5">
                      <AtSign />
                    </InputGroupAddon>
                    <InputGroupInput
                      id="login-email-input"
                      type="email"
                      autoComplete="email"
                      placeholder="Correo electrónico"
                      required
                      autoFocus
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </InputGroup>
                </Field>

                <Button
                  type="submit"
                  size="lg"
                  className="h-11 w-full rounded-full"
                  disabled={submitting}
                >
                  {submitting && <Spinner data-icon="inline-start" />}
                  {submitting ? 'Enviando…' : 'Enviar código'}
                </Button>
              </FieldGroup>
            </form>
          )}

          {step.kind === 'code' && (
            <form onSubmit={(e) => handleVerifyCode(e, step)} noValidate>
              <FieldGroup className="max-w-sm">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Field>
                  <FieldLabel htmlFor="login-code-input">Código de {OTP_LENGTH} dígitos</FieldLabel>
                  <InputOTP
                    id="login-code-input"
                    maxLength={OTP_LENGTH}
                    value={code}
                    onChange={setCode}
                    autoFocus
                  >
                    <InputOTPGroup>
                      {Array.from({ length: OTP_LENGTH }, (_, i) => (
                        <InputOTPSlot
                          key={i}
                          index={i}
                          className="size-11 border-transparent bg-muted text-base first:rounded-l-full last:rounded-r-full"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  <FieldDescription>El código vence a los 10 minutos.</FieldDescription>
                </Field>

                <Button
                  type="submit"
                  size="lg"
                  className="h-11 w-full rounded-full"
                  disabled={submitting || code.length < OTP_LENGTH}
                >
                  {submitting && <Spinner data-icon="inline-start" />}
                  {submitting ? 'Verificando…' : 'Ingresar'}
                </Button>

                <p className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
                  ¿No te llegó?
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    disabled={submitting}
                    onClick={() => handleResend(step)}
                  >
                    Reenviar
                  </Button>
                  <span aria-hidden="true">·</span>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    disabled={submitting}
                    onClick={() => {
                      setStep({ kind: 'email' })
                      setError(null)
                    }}
                  >
                    Usar otro correo
                  </Button>
                </p>
              </FieldGroup>
            </form>
          )}

          {step.kind === 'password' && (
            <form onSubmit={handleSetPassword} noValidate>
              <FieldGroup className="max-w-sm">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Field>
                  <FieldLabel htmlFor="login-new-password" className="sr-only">
                    Nueva contraseña
                  </FieldLabel>
                  <InputGroup className={PILL_FIELD}>
                    <InputGroupAddon className="pl-3.5">
                      <Lock />
                    </InputGroupAddon>
                    <InputGroupInput
                      id="login-new-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Nueva contraseña"
                      required
                      autoFocus
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <InputGroupAddon align="inline-end" className="pr-3">
                      <InputGroupButton
                        type="button"
                        size="icon-xs"
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        {showPassword ? <EyeOff /> : <Eye />}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  <FieldDescription>Al menos {MIN_PASSWORD_LENGTH} caracteres.</FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="login-confirm-password" className="sr-only">
                    Confirmar contraseña
                  </FieldLabel>
                  <InputGroup className={PILL_FIELD}>
                    <InputGroupAddon className="pl-3.5">
                      <Lock />
                    </InputGroupAddon>
                    <InputGroupInput
                      id="login-confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Confirmar contraseña"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </InputGroup>
                </Field>

                <Button
                  type="submit"
                  size="lg"
                  className="h-11 w-full rounded-full"
                  disabled={submitting}
                >
                  {submitting && <Spinner data-icon="inline-start" />}
                  {submitting ? 'Guardando…' : 'Guardar y entrar'}
                </Button>
              </FieldGroup>
            </form>
          )}

          <p className="text-xs text-muted-foreground">
            Acceso exclusivo para administradores. Los vendedores usan la app móvil.
          </p>
        </main>

        <BrandArt />
      </div>
    </div>
  )
}

function headline(step: Step): string {
  if (step.kind === 'code') return 'Revisá tu correo'
  if (step.kind === 'password') return 'Fijá tu contraseña'
  return 'Bienvenido al panel'
}

function subheadline(step: Step): string {
  if (step.kind === 'code') return `Enviamos un código a ${step.email}. ${step.info}`
  if (step.kind === 'password') return 'Es tu primer ingreso. Elegí una contraseña para tu cuenta.'
  return 'Ingresá el correo de tu cuenta de administrador y te mandamos un código de acceso.'
}

/** Mitad derecha: bloque verde, arco que barre sobre el blanco y las tarjetas
 *  del panel apiladas. Es decoración — de ahí el aria-hidden del conjunto. */
function BrandArt() {
  return (
    <div className="relative hidden lg:block" aria-hidden="true">
      {/* El arco desborda hacia la izquierda sobre el blanco; lo recorta el
          overflow-hidden de la tarjeta, no este contenedor. */}
      <svg
        className="pointer-events-none absolute inset-y-0 -left-28 h-full w-[calc(100%+7rem)] text-primary/12"
        viewBox="0 0 420 600"
        preserveAspectRatio="none"
        fill="none"
      >
        <path d="M420 0 H214 C 96 168, 292 404, 132 600 H420 Z" fill="currentColor" />
      </svg>

      <div className="absolute inset-y-6 right-6 left-4 overflow-hidden rounded-3xl bg-linear-to-br from-primary via-primary to-brand-accent">
        <div className="absolute -top-20 -right-12 size-72 rounded-full bg-white/15 blur-3xl" />
      </div>

      {/* Tarjetas apiladas: la de arriba es un panel real en miniatura. */}
      <div className="absolute top-1/2 left-1/2 w-60 -translate-x-1/2 -translate-y-1/2">
        <div className="absolute inset-0 translate-x-7 translate-y-9 rotate-6 rounded-2xl bg-white/15 ring-1 ring-white/20" />
        <div className="absolute inset-0 translate-x-3.5 translate-y-4.5 rotate-3 rounded-2xl bg-white/25 ring-1 ring-white/30" />

        <div className="relative overflow-hidden rounded-2xl bg-background shadow-2xl">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <img src={brandIcon} alt="" className="h-4 w-auto" />
            <span className="font-heading text-xs font-semibold text-foreground">Pragma CRM</span>
          </div>
          <div className="flex flex-col gap-2.5 p-3">
            {[
              { label: 'Vendedores', width: '82%', tone: 'bg-primary' },
              { label: 'Clientes', width: '64%', tone: 'bg-brand-accent' },
              { label: 'Ventas importadas', width: '45%', tone: 'bg-primary/50' },
            ].map((row) => (
              <div key={row.label} className="flex flex-col gap-1">
                <span className="text-[0.65rem] text-muted-foreground">{row.label}</span>
                <span className="block h-1.5 w-full rounded-full bg-muted">
                  <span className={`block h-full rounded-full ${row.tone}`} style={{ width: row.width }} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
