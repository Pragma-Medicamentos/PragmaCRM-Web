import { Bar, BarChart, XAxis, YAxis } from 'recharts'
import { cn } from 'cn'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '../../../components/ui/chart'
import { formatCount } from '../metricsFormat'
import { ChartTooltipRow } from './ChartTooltipRow'

export interface PartSegment {
  key: string
  label: string
  value: number
  /** Token fijo por entidad (var(--chart-n)), nunca por posición. */
  color: string
}

interface PartToWholeBarProps {
  segments: PartSegment[]
  /** Qué representa el total, para lectores de pantalla: "paradas". */
  noun: string
  /**
   * Otro periodo en una segunda barra, debajo y atenuada, con los mismos
   * colores por entidad. `currentLabel` nombra la barra del periodo actual.
   */
  comparison?: { segments: PartSegment[]; label: string; currentLabel: string }
}

const percentFormatter = new Intl.NumberFormat('es-SV', { style: 'percent', maximumFractionDigits: 0 })

type Radius = number | [number, number, number, number]

function segmentRadius(index: number, count: number): Radius {
  if (count === 1) return 4
  if (index === 0) return [4, 0, 0, 4]
  if (index === count - 1) return [0, 4, 4, 0]
  return 0
}

function sum(segments: PartSegment[]): number {
  return segments.reduce((total, s) => total + s.value, 0)
}

/** Una barra apilada; `faded` es la del periodo de comparación. */
function StackedBar({ segments, noun, faded = false }: { segments: PartSegment[]; noun: string; faded?: boolean }) {
  const total = sum(segments)
  const visible = segments.filter((s) => s.value > 0)
  const config = Object.fromEntries(segments.map((s) => [s.key, { label: s.label, color: s.color }])) satisfies ChartConfig
  const data = [{ name: noun, ...Object.fromEntries(segments.map((s) => [s.key, s.value])) }]
  const summary = segments.map((s) => `${s.label}: ${formatCount(s.value)}`).join(', ')

  if (total === 0) return <div className={cn('rounded-md bg-muted', faded ? 'h-4' : 'h-7')} aria-hidden />

  return (
    <ChartContainer
      config={config}
      className={cn('aspect-auto w-full', faded ? 'h-4' : 'h-7')}
      role="img"
      aria-label={`${formatCount(total)} ${noun}. ${summary}`}
    >
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 0 }} barSize={faded ? 16 : 24}>
        <XAxis type="number" hide domain={[0, total]} />
        <YAxis type="category" dataKey="name" hide />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value, name) => {
                const segment = segments.find((s) => s.key === name)
                const amount = Number(value)
                return (
                  <ChartTooltipRow
                    color={segment?.color}
                    label={segment?.label ?? String(name)}
                    value={`${formatCount(amount)} · ${percentFormatter.format(amount / total)}`}
                  />
                )
              }}
            />
          }
        />
        {visible.map((segment, index) => (
          <Bar
            key={segment.key}
            dataKey={segment.key}
            stackId="total"
            fill={`var(--color-${segment.key})`}
            fillOpacity={faded ? 0.45 : 1}
            stroke="var(--card)"
            strokeWidth={2}
            radius={segmentRadius(index, visible.length)}
            isAnimationActive={!faded}
          />
        ))}
      </BarChart>
    </ChartContainer>
  )
}

/**
 * Parte del todo en una sola barra apilada horizontal (paradas por tipo,
 * cobertura de cartera). Los segmentos se separan con 2px del color de la
 * superficie, no con un borde; la leyenda debajo lleva conteo y porcentaje,
 * así que la identidad nunca depende solo del color.
 */
export function PartToWholeBar({ segments, noun, comparison }: PartToWholeBarProps) {
  const total = sum(segments)
  const previousByKey = new Map(comparison?.segments.map((s) => [s.key, s.value]))

  return (
    <div className="flex flex-col gap-3">
      {comparison ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{comparison.currentLabel}</span>
            <StackedBar segments={segments} noun={noun} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{comparison.label}</span>
            <StackedBar segments={comparison.segments} noun={noun} faded />
          </div>
        </div>
      ) : (
        <StackedBar segments={segments} noun={noun} />
      )}

      <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: segment.color }} aria-hidden />
            <span className="text-muted-foreground">{segment.label}</span>
            <span className="font-medium tabular-nums text-foreground">{formatCount(segment.value)}</span>
            {total > 0 && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {percentFormatter.format(segment.value / total)}
              </span>
            )}
            {comparison && (
              <span className="text-xs text-muted-foreground tabular-nums">
                vs {formatCount(previousByKey.get(segment.key) ?? 0)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
