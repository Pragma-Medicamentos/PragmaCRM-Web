import type { ReactNode } from 'react'
import { Info, Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from 'cn'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Progress } from '../../components/ui/progress'
import { Skeleton } from '../../components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip'
import { KPI_META } from './kpiCatalog'
import type { KpiName, KpiResult, KpiValuesResponse } from './metrics.types'
import { computeDelta, formatMetric, type MetricDelta } from './metricsFormat'

const DELTA_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus } as const
const DELTA_VARIANT = { good: 'default', bad: 'destructive', neutral: 'secondary' } as const

/** Variación con ícono y signo: el color refuerza, nunca es el único canal. */
export function DeltaBadge({ delta }: { delta: MetricDelta }) {
  const Icon = DELTA_ICON[delta.direction]
  return (
    <Badge variant={DELTA_VARIANT[delta.tone]}>
      <Icon data-icon="inline-start" />
      {delta.text}
    </Badge>
  )
}

export function MetricHint({ label, hint }: { label: string; hint: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-xs" className="text-muted-foreground" aria-label={`Cómo se calcula ${label}`}>
          <Info />
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 text-pretty">{hint}</TooltipContent>
    </Tooltip>
  )
}

interface MetricStatProps {
  label: string
  value: string
  hint?: string
  delta?: MetricDelta | null
  /** "vs semana anterior". Solo se muestra junto a un delta. */
  comparison?: string
  /** Línea secundaria cuando no hay delta: "Al día de hoy", "Sin metas cargadas". */
  note?: ReactNode
  /** 0–100: pinta un medidor debajo de la cifra. */
  meter?: number | null
  size?: 'default' | 'hero'
  className?: string
}

/** Una cifra con su etiqueta, delta y medidor opcional. Sin contenedor: vive dentro de una Card. */
export function MetricStat({
  label,
  value,
  hint,
  delta,
  comparison,
  note,
  meter,
  size = 'default',
  className,
}: MetricStatProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <div className="flex min-h-6 items-center gap-0.5">
        <span className="truncate text-sm font-medium text-muted-foreground">{label}</span>
        {hint && <MetricHint label={label} hint={hint} />}
      </div>
      <span
        className={cn(
          'font-semibold tracking-tight text-foreground',
          size === 'hero' ? 'text-5xl leading-none' : 'text-2xl leading-tight'
        )}
      >
        {value}
      </span>
      {meter !== undefined && meter !== null && (
        <Progress value={Math.min(Math.max(meter, 0), 100)} className="my-1 h-1.5" aria-label={`${label}: ${value}`} />
      )}
      {delta ? (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <DeltaBadge delta={delta} />
          {comparison && <span>{comparison}</span>}
        </div>
      ) : (
        note && <span className="text-xs text-muted-foreground">{note}</span>
      )}
    </div>
  )
}

export function MetricStatSkeleton({ size = 'default' }: { size?: 'default' | 'hero' }) {
  return (
    <div className="flex flex-col gap-2.5 py-0.5">
      <Skeleton className="h-4 w-24" />
      <Skeleton className={size === 'hero' ? 'h-12 w-44' : 'h-7 w-20'} />
      <Skeleton className="h-4 w-28" />
    </div>
  )
}

const NULL_NOTE: Partial<Record<KpiName, string>> = {
  goal_compliance: 'Sin metas cargadas',
  average_ticket: 'Sin pedidos en el periodo',
  route_effectiveness: 'Sin rutas ejecutadas',
  effective_visits_rate: 'Sin paradas en el periodo',
  average_visit_minutes: 'Sin paradas en el periodo',
  purchase_frequency_days: 'Sin compras repetidas',
}

const PERCENT_METER: KpiName[] = ['effective_visits_rate', 'goal_compliance']

interface KpiStatProps {
  name: Exclude<KpiName, 'stops_by_type'>
  data: KpiValuesResponse
  comparison: string
  /** Reemplaza la etiqueta del catálogo (cuando la Card ya nombra la KPI). */
  label?: string
  /** Reemplaza la nota por defecto cuando no hay delta. */
  note?: string
  size?: 'default' | 'hero'
  className?: string
}

/** MetricStat alimentado por una KPI del lote /kpis/values. */
export function KpiStat({ name, data, comparison, label, note, size, className }: KpiStatProps) {
  const meta = KPI_META[name]
  const statLabel = label ?? meta.label
  const result = data.kpis[name] as KpiResult<typeof name> | undefined
  const hint = meta.hint(data.thresholds)

  if (!result || 'error' in result) {
    return (
      <MetricStat label={statLabel} hint={hint} value="—" note="No se pudo calcular" size={size} className={className} />
    )
  }

  const { value, previous_value } = result
  const isNull = value === null
  const meter = PERCENT_METER.includes(name) && typeof value === 'number' ? value : undefined

  return (
    <MetricStat
      label={statLabel}
      hint={hint}
      value={formatMetric(meta.unit, value)}
      delta={meta.snapshot ? null : computeDelta(meta.unit, value, previous_value, meta.polarity)}
      comparison={comparison}
      note={
        isNull
          ? (NULL_NOTE[name] ?? 'Sin datos en el periodo')
          : (note ?? (meta.snapshot ? 'Al día de hoy' : 'Sin base para comparar'))
      }
      meter={meter}
      size={size}
      className={className}
    />
  )
}
