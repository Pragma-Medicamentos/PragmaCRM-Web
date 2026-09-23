import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../../lib/supabase/client'
import { apiRequest, ApiError } from '../../lib/api/apiClient'
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
import { cn } from '../../lib/utils'
import brandWordmark from '../../assets/brand-wordmark.png'

const MIN_PASSWORD_LENGTH = 8
const OTP_LENGTH = 6

// Campo del login: contorno fino sobre blanco y algo más alto que el del resto
// del panel, que va dentro de tablas y diálogos más densos.
const OUTLINED_FIELD = 'h-11'

function reasonMessage(reason: RedirectReason): string {
  if (reason.kind === 'expired') return 'Tu sesión expiró. Vuelve a iniciar sesión.'
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
  | { kind: 'password'; email: string }

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

    try {
      const appUser = await apiRequest<AppUser>('/api/v1/me')
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
    <div className="flex min-h-dvh items-center justify-center bg-primary/20 p-4 sm:p-8 lg:p-14">
      <div className="grid w-full max-w-5xl gap-8 rounded-[2rem] bg-background p-5 shadow-2xl shadow-primary/15 sm:p-6 lg:min-h-[36rem] lg:grid-cols-2 lg:gap-10 lg:p-7">
        <main className="flex items-center justify-center px-1 py-6 sm:px-6 lg:py-4">
          <div className="flex w-full max-w-sm flex-col gap-7">
            <div className="flex flex-col gap-3">
              <img src={brandWordmark} alt="Farmacia Pragma" className="h-7 w-auto self-start" />
              <div className="flex flex-col gap-1">
                <h1 className="font-heading text-3xl font-bold text-foreground">{headline(step)}</h1>
                <p className="text-sm text-muted-foreground">{subheadline(step)}</p>
              </div>
            </div>

            {reason && (
              <Alert variant="destructive">
                <AlertDescription>{reasonMessage(reason)}</AlertDescription>
              </Alert>
            )}

            {step.kind === 'email' && (
              <form onSubmit={handleRequestOtp} noValidate>
                <FieldGroup>
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Field>
                    <FieldLabel htmlFor="login-email-input">Correo</FieldLabel>
                    <InputGroup className={OUTLINED_FIELD}>
                      <InputGroupInput
                        id="login-email-input"
                        type="email"
                        autoComplete="email"
                        placeholder="Ingresá tu correo"
                        required
                        autoFocus
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </InputGroup>
                  </Field>

                  <Button type="submit" size="lg" className="mt-2 h-11 w-full" disabled={submitting}>
                    {submitting && <Spinner data-icon="inline-start" />}
                    {submitting ? 'Enviando…' : 'Enviar código'}
                  </Button>
                </FieldGroup>
              </form>
            )}

            {step.kind === 'code' && (
              <form onSubmit={(e) => handleVerifyCode(e, step)} noValidate>
                <FieldGroup>
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
                          <InputOTPSlot key={i} index={i} className="size-11 text-base" />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                    <FieldDescription>El código vence a los 10 minutos.</FieldDescription>
                  </Field>

                  <Button
                    type="submit"
                    size="lg"
                    className="mt-2 h-11 w-full"
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
                <FieldGroup>
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Field>
                    <FieldLabel htmlFor="login-new-password">Nueva contraseña</FieldLabel>
                    <InputGroup className={OUTLINED_FIELD}>
                      <InputGroupInput
                        id="login-new-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Elegí una contraseña"
                        required
                        autoFocus
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <InputGroupAddon align="inline-end" className="pr-2.5">
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
                    <FieldLabel htmlFor="login-confirm-password">Confirmar contraseña</FieldLabel>
                    <InputGroup className={OUTLINED_FIELD}>
                      <InputGroupInput
                        id="login-confirm-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Repetila"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </InputGroup>
                  </Field>

                  <Button type="submit" size="lg" className="mt-2 h-11 w-full" disabled={submitting}>
                    {submitting && <Spinner data-icon="inline-start" />}
                    {submitting ? 'Guardando…' : 'Guardar y entrar'}
                  </Button>
                </FieldGroup>
              </form>
            )}

            <p className="text-xs text-muted-foreground">
              Acceso exclusivo para administradores. Los vendedores usan la app móvil.
            </p>
          </div>
        </main>

        <ShowcasePanel />
      </div>
    </div>
  )
}

function headline(step: Step): string {
  if (step.kind === 'code') return 'Revisá tu correo'
  if (step.kind === 'password') return 'Fijá tu contraseña'
  return 'Iniciar sesión'
}

function subheadline(step: Step): string {
  if (step.kind === 'code') return `Enviamos un código a ${step.email}. ${step.info}`
  if (step.kind === 'password') return 'Es tu primer ingreso. Elegí una contraseña para tu cuenta.'
  return 'Ingresá el correo de tu cuenta y te mandamos un código de acceso.'
}

// Lo que rota en el panel verde. Son los módulos que este dashboard ya tiene,
// contados desde lo que le sirve a quien lo usa — sin nombres internos de
// endpoints ni del ERP — y no testimonios inventados.
const SHOWCASE = [
  {
    module: 'Vendedores',
    title: 'Sumá un vendedor en un minuto',
    body: 'Cargás su nombre y su correo, y le llega un código para entrar desde el celular. Si deja el equipo, lo deshabilitás y pierde el acceso al momento.',
  },
  {
    module: 'Clientes',
    title: 'Mirá de un vistazo qué clientes valen más',
    body: 'Cada uno se ordena solo en A, B o C según cuánto compra, qué tan seguido y qué tan puntual paga. Sin listas que mantener a mano.',
  },
  {
    module: 'Ubicaciones',
    title: 'Poné a cada cliente en el mapa',
    body: 'Marcás el punto exacto del negocio y tus vendedores lo encuentran sin dar vueltas ni pedir indicaciones.',
  },
  {
    module: 'Importación',
    title: 'Subí tus ventas y listo',
    body: 'Arrastrás el archivo y te decimos qué se cargó y qué quedó afuera, con el motivo de cada caso para que puedas corregirlo.',
  },
]

// Cada cuánto pasa solo. Seis segundos alcanzan para leer el párrafo más largo
// sin que se sienta lento.
const SHOWCASE_INTERVAL_MS = 6000

/** Panel verde de la derecha: floración de marca, nombre del producto arriba y
 *  una tarjeta de vidrio que rota entre los módulos, sola o con las flechas. */
function ShowcasePanel() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const slide = SHOWCASE[index]

  // `index` en las dependencias a propósito: al tocar una flecha el efecto se
  // vuelve a montar y el temporizador arranca de cero, en vez de saltar al
  // siguiente a los pocos milisegundos porque el ciclo ya venía corriendo.
  useEffect(() => {
    if (paused) return
    const id = window.setInterval(
      () => setIndex((prev) => (prev + 1) % SHOWCASE.length),
      SHOWCASE_INTERVAL_MS
    )
    return () => window.clearInterval(id)
  }, [paused, index])

  function move(delta: number) {
    setIndex((prev) => (prev + delta + SHOWCASE.length) % SHOWCASE.length)
  }

  return (
    // Se frena al pasar el puntero o al entrar con el teclado: un carrusel que
    // cambia mientras lo estás leyendo es molesto y rompe la navegación.
    <div
      className="relative hidden lg:block"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="absolute inset-0 overflow-hidden rounded-2xl bg-linear-to-b from-brand-deep to-primary/90">
        <Bloom />

        <span className="font-display absolute top-6 left-6 text-xl tracking-wide text-white uppercase">
          Pragma CRM
        </span>

        {/* La tarjeta de vidrio. `backdrop-blur` degrada a solo translúcido en
            navegadores que no lo soportan, que es un resultado aceptable. */}
        <div
          className="absolute inset-x-5 bottom-5 flex flex-col gap-3 rounded-xl bg-white/10 p-5 ring-1 ring-white/15 backdrop-blur-md"
          aria-live="polite"
        >
          {/* key: remonta el bloque en cada cambio, que es lo que dispara la
              entrada. Sin él React reutilizaría los nodos y no se animaría. */}
          <div key={index} className="flex animate-in flex-col gap-2 duration-500 fade-in slide-in-from-bottom-2">
            {/* pale y no accent: sobre el verde oscuro, #00ac00 se acerca
                demasiado al fondo. */}
            <span className="text-xs font-medium tracking-wide text-brand-pale uppercase">
              {slide.module}
            </span>
            <p className="text-lg leading-snug font-medium text-white">{slide.title}</p>
            <p className="text-sm text-white/70">{slide.body}</p>
          </div>

          <div className="flex gap-1.5 pt-1">
            {SHOWCASE.map((item, i) => (
              <button
                key={item.module}
                type="button"
                aria-label={`Ver ${item.module}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className={cn(
                  'h-1 rounded-full transition-all',
                  i === index ? 'w-6 bg-brand-pale' : 'w-3 bg-white/30 hover:bg-white/50'
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Fuera del contenedor con overflow-hidden, para que muerda la esquina. */}
      <div className="absolute right-0 bottom-0 flex gap-2 rounded-tl-2xl bg-background pt-3 pl-3">
        <Button type="button" variant="outline" size="icon" aria-label="Anterior" onClick={() => move(-1)}>
          <ChevronLeft />
        </Button>
        <Button type="button" variant="outline" size="icon" aria-label="Siguiente" onClick={() => move(1)}>
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}

// Los pétalos. El retardo negativo arranca cada uno a mitad de su ciclo, así
// que desde el primer cuadro ya están desfasados entre sí.
const PETALS = [
  { cx: 300, cy: 150, rx: 170, ry: 100, rotate: -28, opacity: 1, duration: 16, delay: 0 },
  { cx: 250, cy: 215, rx: 150, ry: 88, rotate: -8, opacity: 0.75, duration: 19, delay: -4.5 },
  { cx: 315, cy: 275, rx: 135, ry: 80, rotate: 16, opacity: 0.6, duration: 23, delay: -9 },
  { cx: 195, cy: 300, rx: 110, ry: 66, rotate: 38, opacity: 0.45, duration: 20, delay: -13.5 },
]

/** Floración de pétalos verdes. `slice` recorta en vez de deformar, así que las
 *  elipses no se aplastan al cambiar la proporción de la ventana. */
function Bloom() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 size-full"
      viewBox="0 0 400 520"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        {/* Todo el recorrido dentro del mismo tono: del verde claro al verde de
            marca. El contraste sale de la luminosidad, no de cambiar de color. */}
        <linearGradient id="bloom-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" className="[stop-color:var(--color-brand-pale)]" stopOpacity="0.95" />
          <stop offset="55%" className="[stop-color:var(--color-brand-accent)]" stopOpacity="0.7" />
          <stop offset="100%" className="[stop-color:var(--color-primary)]" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {PETALS.map((petal) => (
        // La rotación vive en el <g> y el movimiento en el <ellipse>: el
        // transform de CSS pisaría el atributo del SVG si fueran el mismo nodo.
        <g key={petal.rotate} transform={`rotate(${petal.rotate} ${petal.cx} ${petal.cy})`}>
          <ellipse
            className="login-bloom-petal"
            cx={petal.cx}
            cy={petal.cy}
            rx={petal.rx}
            ry={petal.ry}
            fill="url(#bloom-gradient)"
            opacity={petal.opacity}
            style={{ animationDuration: `${petal.duration}s`, animationDelay: `${petal.delay}s` }}
          />
        </g>
      ))}
    </svg>
  )
}
