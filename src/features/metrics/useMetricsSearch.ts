import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { MetricsRange, TrendGranularity } from './metrics.types'
import { MAX_RANGE_DAYS, defaultMetricsRange, isValidDay, rangeLength } from './metricsDates'

export const METRICS_TABS = ['general', 'equipo', 'cobertura'] as const
export type MetricsTab = (typeof METRICS_TABS)[number]

/** Por encima de ~3 meses, las barras por semana se vuelven ilegibles. */
const AUTO_MONTH_THRESHOLD_DAYS = 93

/**
 * Estado del panel en la URL (?desde=&hasta=&vista=&agrupar=), para que la
 * vista se pueda compartir y sobreviva a una recarga. Valores inválidos caen
 * a los defaults en vez de mandar un 400 al API.
 */
export function useMetricsSearch() {
  const [params, setParams] = useSearchParams()
  const fromParam = params.get('desde')
  const toParam = params.get('hasta')
  const tabParam = params.get('vista')
  const groupParam = params.get('agrupar')

  const range = useMemo<MetricsRange>(() => {
    if (isValidDay(fromParam) && isValidDay(toParam) && fromParam <= toParam) {
      const candidate = { from: fromParam, to: toParam }
      if (rangeLength(candidate) <= MAX_RANGE_DAYS) return candidate
    }
    return defaultMetricsRange()
  }, [fromParam, toParam])

  const tab: MetricsTab = (METRICS_TABS as readonly string[]).includes(tabParam ?? '')
    ? (tabParam as MetricsTab)
    : 'general'

  const granularity: TrendGranularity =
    groupParam === 'mes' ? 'month' : groupParam === 'semana' ? 'week' : rangeLength(range) > AUTO_MONTH_THRESHOLD_DAYS ? 'month' : 'week'

  const update = useCallback(
    (changes: Record<string, string | null>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          Object.entries(changes).forEach(([key, value]) => (value === null ? next.delete(key) : next.set(key, value)))
          return next
        },
        { replace: true }
      )
    },
    [setParams]
  )

  // Un periodo nuevo vuelve a la agrupación automática.
  const setRange = useCallback((next: MetricsRange) => update({ desde: next.from, hasta: next.to, agrupar: null }), [update])
  const setTab = useCallback((next: MetricsTab) => update({ vista: next === 'general' ? null : next }), [update])
  const setGranularity = useCallback(
    (next: TrendGranularity) => update({ agrupar: next === 'month' ? 'mes' : 'semana' }),
    [update]
  )

  return { range, tab, granularity, setRange, setTab, setGranularity }
}
