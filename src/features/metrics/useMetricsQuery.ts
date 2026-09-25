import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, isRequestCanceled, isRouteNotImplemented } from '../../lib/api/apiClient'

export type MetricsQueryState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'pending-backend' }
  /** `refreshing`: hay otra consulta en vuelo y `data` es la anterior. */
  | { status: 'ready'; data: T; refreshing: boolean }

interface MetricsQueryOptions {
  /**
   * Mantener los datos anteriores mientras llega la nueva consulta (cambio de
   * periodo), en vez de volver al skeleton. Apagarlo cuando la llave cambia
   * de entidad (otro vendedor), donde mostrar datos ajenos confunde.
   */
  keepPrevious?: boolean
}

/**
 * Mismo patrón que useVendors (useState + useEffect + reload), compartido
 * por todas las vistas de métricas. `key` resume los parámetros de la
 * consulta: cuando cambia se vuelve a pedir; `null` deja el hook en reposo
 * (ej. el Sheet de un vendedor cerrado). El request anterior se aborta.
 */
export function useMetricsQuery<T>(
  key: string | null,
  fetcher: (signal: AbortSignal) => Promise<T>,
  { keepPrevious = true }: MetricsQueryOptions = {}
): { state: MetricsQueryState<T>; reload: () => void } {
  const [state, setState] = useState<MetricsQueryState<T>>(key === null ? { status: 'idle' } : { status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  useEffect(() => {
    if (key === null) {
      setState({ status: 'idle' })
      return
    }

    const controller = new AbortController()
    setState((prev) =>
      keepPrevious && prev.status === 'ready' ? { ...prev, refreshing: true } : { status: 'loading' }
    )

    fetcherRef
      .current(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ status: 'ready', data, refreshing: false })
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || isRequestCanceled(err)) return
        if (isRouteNotImplemented(err)) {
          setState({ status: 'pending-backend' })
          return
        }
        setState({
          status: 'error',
          message: err instanceof ApiError ? err.message : 'No se pudieron cargar las métricas',
        })
      })

    return () => controller.abort()
  }, [key, reloadKey, keepPrevious])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])
  return { state, reload }
}
