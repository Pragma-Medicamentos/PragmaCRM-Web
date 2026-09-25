import type { ReactNode } from 'react'
import { cn } from 'cn'
import { Skeleton } from '../../components/ui/skeleton'
import { KPI_META } from './kpiCatalog'
import type { KpiName, KpiValuesResponse } from './metrics.types'
import { KpiStat, MetricStat, MetricStatSkeleton } from './MetricStat'
import type { MetricsQueryState } from './useMetricsQuery'

interface KpiSlotProps {
  kpis: MetricsQueryState<KpiValuesResponse>
  name: Exclude<KpiName, 'stops_by_type'>
  comparison: string
  label?: string
  note?: string
  size?: 'default' | 'hero'
  className?: string
}

/**
 * Lugar de una KPI dentro de una Card: skeleton mientras carga, la cifra al
 * llegar, y "—" si el lote falló (el Alert con Reintentar va arriba de la vista).
 */
export function KpiSlot({ kpis, name, label, size, className, ...rest }: KpiSlotProps) {
  if (kpis.status === 'ready') {
    return <KpiStat data={kpis.data} name={name} label={label} size={size} className={className} {...rest} />
  }
  if (kpis.status === 'loading' || kpis.status === 'idle') {
    return <MetricStatSkeleton size={size} />
  }
  return <MetricStat label={label ?? KPI_META[name].label} value="—" note="No disponible" size={size} className={className} />
}

interface ChartSlotProps<T> {
  state: MetricsQueryState<T>
  children: (data: T) => ReactNode
  /** Mismo alto que el gráfico, para que la Card no salte al cargar. */
  className?: string
}

/** Lugar de un gráfico: skeleton del mismo alto, el gráfico o un aviso sobrio. */
export function ChartSlot<T>({ state, children, className }: ChartSlotProps<T>) {
  if (state.status === 'ready') return <>{children(state.data)}</>
  if (state.status === 'loading' || state.status === 'idle') return <Skeleton className={cn('h-60 w-full', className)} />
  return (
    <div className={cn('flex h-60 w-full items-center justify-center rounded-lg bg-muted/40 text-sm text-muted-foreground', className)}>
      Gráfico no disponible
    </div>
  )
}

/** Atenúa el contenido mientras llega el periodo nuevo, sin volver al skeleton. */
export function Refreshing({ active, children, className }: { active: boolean; children: ReactNode; className?: string }) {
  return (
    <div aria-busy={active} className={cn('transition-opacity duration-200', active && 'opacity-60', className)}>
      {children}
    </div>
  )
}

export function isRefreshing(...states: MetricsQueryState<unknown>[]): boolean {
  return states.some((s) => s.status === 'ready' && s.refreshing)
}

/** Subtítulo dentro de una Card, entre bloques separados por Separator. */
export function BlockHeading({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      {aside && <span className="text-xs text-muted-foreground">{aside}</span>}
    </div>
  )
}
