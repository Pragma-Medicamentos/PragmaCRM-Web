import { cn } from '../lib/utils'

/**
 * Gráficos mínimos con HTML y CSS, sin dependencia de una librería de charts:
 * por ahora solo los usa la vista previa de Resumen. Colores desde los tokens
 * `--chart-*`, así que siguen a la paleta de marca.
 */

interface BarChartDatum {
  label: string
  value: number
}

interface BarChartProps {
  data: BarChartDatum[]
  label: string
  /** Índice de la barra a resaltar (la semana en curso); el resto va en el tono claro. */
  highlight?: number
  className?: string
}

/** Barras verticales con rejilla horizontal; la altura de cada barra es un % del máximo del eje. */
export function BarChart({ data, label, highlight, className }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1)
  const step = Math.ceil(max / 4 / 5) * 5 || 1
  const top = step * 4
  const ticks = [4, 3, 2, 1, 0].map((n) => n * step)

  return (
    <div role="img" aria-label={label} className={cn('flex h-56 gap-3', className)}>
      <div className="flex flex-col justify-between pb-6 text-right text-xs text-muted-foreground tabular-nums">
        {ticks.map((t) => (
          <span key={t} className="-translate-y-1/2 leading-none first:translate-y-0 last:translate-y-0">
            {t}
          </span>
        ))}
      </div>
      <div className="relative flex flex-1 flex-col">
        <div className="pointer-events-none absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between">
          {ticks.map((t) => (
            <div key={t} className={cn('border-t', t === 0 ? 'border-border' : 'border-dashed border-border/70')} />
          ))}
        </div>
        <div className="relative flex flex-1 items-end gap-2 sm:gap-4">
          {data.map((d, i) => (
            <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end">
              <div
                className={cn(
                  'relative w-full max-w-12 rounded-t-md',
                  i === highlight ? 'bg-[var(--chart-1)]' : 'bg-[var(--chart-4)]'
                )}
                style={{ height: `${(d.value / top) * 100}%` }}
              >
                {/* Posición absoluta: así la altura de la barra coincide con la rejilla. */}
                <span className="absolute -top-5 inset-x-0 text-center text-xs font-medium text-foreground tabular-nums">
                  {d.value}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex h-6 items-end gap-2 sm:gap-4">
          {data.map((d) => (
            <span key={d.label} className="flex-1 text-center text-xs text-muted-foreground">
              {d.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
