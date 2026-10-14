import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiError } from '../../lib/api/apiClient'
import { RANGE_PRESETS, isValidDay, rangeLength } from '../metrics/metricsDates'
import type { MetricsRange } from '../metrics/metrics.types'
import { getExecutedRoutes } from './executedRoutesApi'
import { EXECUTED_ROUTES_MAX_RANGE_DAYS } from './executedRoutes.types'
import type { ExecutedRoutesFilters, ExecutedRoutesHistory } from './executedRoutes.types'

export type ExecutedRoutesState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; history: ExecutedRoutesHistory }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Por defecto, la semana en curso: lo que un supervisor revisa más seguido. */
function defaultRange(): MetricsRange {
  return RANGE_PRESETS[0].resolve()
}

/**
 * Filtros del histórico en la URL (?desde=&hasta=&vendedor=), para que la
 * vista se pueda compartir y sobreviva a una recarga. Valores inválidos caen
 * a los defaults en vez de mandar un 400 al API.
 */
export function useExecutedRoutesFilters() {
  const [params, setParams] = useSearchParams()
  const fromParam = params.get('desde')
  const toParam = params.get('hasta')
  const sellerParam = params.get('vendedor')

  const filters = useMemo<ExecutedRoutesFilters>(() => {
    let range = defaultRange()
    if (isValidDay(fromParam) && isValidDay(toParam) && fromParam <= toParam) {
      const candidate = { from: fromParam, to: toParam }
      if (rangeLength(candidate) <= EXECUTED_ROUTES_MAX_RANGE_DAYS) range = candidate
    }
    return { ...range, sellerId: sellerParam && UUID_RE.test(sellerParam) ? sellerParam : null }
  }, [fromParam, toParam, sellerParam])

  const update = useCallback(
    (patch: Partial<ExecutedRoutesFilters>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (patch.from !== undefined) next.set('desde', patch.from)
          if (patch.to !== undefined) next.set('hasta', patch.to)
          if (patch.sellerId !== undefined) {
            if (patch.sellerId) next.set('vendedor', patch.sellerId)
            else next.delete('vendedor')
          }
          return next
        },
        { replace: true }
      )
    },
    [setParams]
  )

  return { filters, update }
}

/** Carga GET /api/v1/executed-routes cada vez que cambian los filtros (HU-08 CA2). */
export function useExecutedRoutes(filters: ExecutedRoutesFilters): { state: ExecutedRoutesState; reload: () => void } {
  const [state, setState] = useState<ExecutedRoutesState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)
  const { from, to, sellerId } = filters

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })

    getExecutedRoutes({ from, to, sellerId })
      .then((history) => {
        if (!cancelled) setState({ status: 'ready', history })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setState({
          status: 'error',
          message: err instanceof ApiError ? err.message : 'Error al cargar las rutas ejecutadas',
        })
      })

    return () => {
      cancelled = true
    }
  }, [from, to, sellerId, reloadKey])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  return { state, reload }
}
