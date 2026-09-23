import { useState, type FormEvent, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { REGEXP_ONLY_DIGITS } from 'input-otp'
import { supabase } from '@/lib/supabase/client'
import { ApiError } from '@/lib/api/apiClient'
import { brand } from '@/lib/design-tokens'
import { ErrorAlert } from '@/components/ErrorAlert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Spinner } from '@/components/ui/spinner'
import { fetchMe, requestLoginOtp } from './authApi'
import type { RedirectReason } from './auth.types'
import pragmaIcon from '@/assets/pragma-icon.png'
import pragmaLogo from '@/assets/pragma-logo-dark.png'

const MIN_PASSWORD_LENGTH = 8
const OTP_LENGTH = 6

function reasonMessage(reason: RedirectReason): string {
  // 'forbidden' trae el message tal cual lo mandó la API en el 403
  // (usuario no registrado, cuenta deshabilitada, etc.) — ver
  // PragmaCRM-Web/CLAUDE.md. 'role' es el único mensaje que genera este
  // repo, porque /api/v1/me no rechaza por rol.
  switch (reason.kind) {
    case 'forbidden':
      return reason.message
    case 'expired':
      return 'Tu sesión expiró o ya no es válida. Vuelve a iniciar sesión.'
    case 'role':
      return 'Esta cuenta no tiene permisos de Administrador.'
  }
}

// Login sin contraseña propia: la API dispara un código, Supabase lo
// verifica y, si la cuenta todavía no tiene contraseña (`passwordSetAt`
// null en /api/v1/me), este mismo formulario la pide antes de entrar. Ver
// "Flujo de login (OTP)" en PragmaCRM-Web/CLAUDE.md.
type Step =
  | { kind: 'email' }
  | { kind: 'code'; email: string; info: string }
  | { kind: 'password'; email: string }

function FormHeading({ title, description }: { title: string; description: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-sm text-balance text-muted-foreground">{description}</p>
    </div>
  )
}

function SubmitButton({ submitting, idle, busy }: { submitting: boolean; idle: string; busy: string }) {
  return (
    <Button type="submit" disabled={submitting}>
      {submitting && <Spinner data-icon="inline-start" />}
      {submitting ? busy : idle}
    </Button>
  )
}

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

    try {
      const appUser = await fetchMe()
      if (appUser.passwordSetAt) {
        navigate('/', { replace: true })
        return
      }
      setStep({ kind: 'password', email: currentStep.email })
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
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <span className="flex items-center gap-2 font-heading font-semibold">
            <img src={pragmaIcon} alt="" className="size-6 object-contain" />
            {brand.name}
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="flex w-full max-w-xs flex-col gap-6">
            {reason && <ErrorAlert>{reasonMessage(reason)}</ErrorAlert>}

            {step.kind === 'email' && (
              <form onSubmit={handleRequestOtp} noValidate>
                <FieldGroup>
                  <FormHeading
                    title="Ingresá a tu cuenta"
                    description="Te enviamos un código de acceso a tu correo."
                  />

                  {error && <ErrorAlert>{error}</ErrorAlert>}

                  <Field>
                    <FieldLabel htmlFor="login-email">Correo electrónico</FieldLabel>
                    <Input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      autoFocus
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </Field>

                  <Field>
                    <SubmitButton submitting={submitting} idle="Enviar código" busy="Enviando…" />
                  </Field>
                </FieldGroup>
              </form>
            )}

            {step.kind === 'code' && (
              <form onSubmit={(e) => handleVerifyCode(e, step)} noValidate>
                <FieldGroup>
                  <FormHeading
                    title="Revisá tu correo"
                    description={
                      <>
                        Enviamos un código a <strong>{step.email}</strong>. {step.info}
                      </>
                    }
                  />

                  {error && <ErrorAlert>{error}</ErrorAlert>}

                  <Field>
                    <FieldLabel htmlFor="login-code" className="sr-only">
                      Código de {OTP_LENGTH} dígitos
                    </FieldLabel>
                    <InputOTP
                      id="login-code"
                      maxLength={OTP_LENGTH}
                      pattern={REGEXP_ONLY_DIGITS}
                      autoComplete="one-time-code"
                      autoFocus
                      value={code}
                      onChange={setCode}
                      containerClassName="justify-center"
                    >
                      <InputOTPGroup>
                        {Array.from({ length: OTP_LENGTH }, (_, index) => (
                          <InputOTPSlot key={index} index={index} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                    <FieldDescription className="text-center">
                      Ingresá el código de {OTP_LENGTH} dígitos.
                    </FieldDescription>
                  </Field>

                  <Field>
                    <Button type="submit" disabled={submitting || code.length < OTP_LENGTH}>
                      {submitting && <Spinner data-icon="inline-start" />}
                      {submitting ? 'Verificando…' : 'Ingresar'}
                    </Button>
                    <Button type="button" variant="ghost" disabled={submitting} onClick={() => handleResend(step)}>
                      Reenviar código
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={submitting}
                      onClick={() => {
                        setStep({ kind: 'email' })
                        setError(null)
                      }}
                    >
                      Usar otro correo
                    </Button>
                  </Field>
                </FieldGroup>
              </form>
            )}

            {step.kind === 'password' && (
              <form onSubmit={handleSetPassword} noValidate>
                <FieldGroup>
                  <FormHeading
                    title="Fijá tu contraseña"
                    description="Es tu primer ingreso. Fijá una contraseña para tu cuenta."
                  />

                  {error && <ErrorAlert>{error}</ErrorAlert>}

                  <Field>
                    <FieldLabel htmlFor="login-new-password">Nueva contraseña</FieldLabel>
                    <Input
                      id="login-new-password"
                      type="password"
                      autoComplete="new-password"
                      autoFocus
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <FieldDescription>Mínimo {MIN_PASSWORD_LENGTH} caracteres.</FieldDescription>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="login-confirm-password">Confirmar contraseña</FieldLabel>
                    <Input
                      id="login-confirm-password"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </Field>

                  <Field>
                    <SubmitButton submitting={submitting} idle="Guardar y entrar" busy="Guardando…" />
                  </Field>
                </FieldGroup>
              </form>
            )}
          </div>
        </div>
      </div>

      <aside className="relative hidden flex-col justify-center gap-3 bg-brand-panel p-16 text-brand-panel-foreground lg:flex">
        <img className="h-12 w-auto self-start" src={pragmaLogo} alt="Farmacia Pragma" />
        <span className="font-display text-3xl tracking-wide text-brand-accent italic">{brand.name}</span>
        <p className="max-w-[32ch] leading-normal text-brand-panel-foreground/70">{brand.tagline}</p>
        <RouteMark />
      </aside>
    </div>
  )
}

function RouteMark() {
  return (
    <svg className="mt-6 h-auto w-44 text-brand-accent" viewBox="0 0 220 120" fill="none" aria-hidden="true">
      <path
        d="M18 96 C 60 96, 60 40, 100 40 S 160 20, 202 20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="18" cy="96" r="5" fill="currentColor" />
      <circle cx="100" cy="40" r="5" fill="currentColor" />
      <circle cx="202" cy="20" r="5" fill="currentColor" />
    </svg>
  )
}
