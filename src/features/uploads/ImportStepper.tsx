import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SalesUploadState } from './useSalesUpload'

/**
 * Indicador de progreso de la importación (wireframe `1m`: tres cajas
 * contiguas, sin separación entre ellas).
 *
 * No es navegación: los pasos no se pueden pulsar. El avance lo decide
 * `useSalesUpload`, este componente solo lo traduce a algo visible — sin el
 * stepper, el admin no distingue "ya se subió" de "falta confirmar".
 */

const STEPS = ['Seleccionar archivo', 'Validar estructura', 'Confirmar carga'] as const

/** En qué paso (1..3) deja la máquina de estados cada situación. */
function currentStep(status: SalesUploadState['status']): 1 | 2 | 3 {
  switch (status) {
    case 'idle':
    case 'validating':
    case 'invalid':
      return 1
    case 'ready':
    case 'confirming':
    case 'error':
      return 2
    case 'uploading':
    case 'success':
      return 3
  }
}

export function ImportStepper({ status }: { status: SalesUploadState['status'] }) {
  const current = currentStep(status)
  // 'invalid' y 'error' son fallos del paso en curso, no del flujo entero.
  const failed = status === 'invalid' || status === 'error'
  const allDone = status === 'success'

  return (
    <ol className="flex w-full items-stretch">
      {STEPS.map((label, i) => {
        const step = i + 1
        const done = allDone || step < current
        const active = !allDone && step === current

        return (
          <li
            key={label}
            aria-current={active ? 'step' : undefined}
            className={cn(
              'flex flex-1 items-center gap-2 border px-3 py-2.5 text-sm transition-colors',
              // Bordes colapsados para que las tres cajas se lean como una
              // sola pieza, igual que en el wireframe.
              i > 0 && '-ml-px',
              i === 0 && 'rounded-l-md',
              i === STEPS.length - 1 && 'rounded-r-md',
              done && 'border-border text-foreground',
              active && !failed && 'z-10 border-primary bg-primary/5 font-semibold text-primary',
              active && failed && 'z-10 border-destructive bg-destructive/5 font-semibold text-destructive',
              !done && !active && 'border-border text-muted-foreground'
            )}
          >
            <span
              className={cn(
                'flex size-5 shrink-0 items-center justify-center rounded-full border text-xs tabular-nums',
                done && 'border-primary bg-primary text-primary-foreground',
                active && !failed && 'border-primary text-primary',
                active && failed && 'border-destructive text-destructive'
              )}
            >
              {done ? <Check className="size-3" aria-hidden /> : step}
            </span>
            <span className="truncate">{label}</span>
          </li>
        )
      })}
    </ol>
  )
}
