import { useCallback, useEffect, useState } from 'react'
import { ApiError, isRouteNotImplemented } from '../../lib/api/apiClient'
import { listProspects } from './prospectsApi'
import type { Prospect } from './prospects.types'

export type ProspectsState =
  | { status: 'loading' }
  | { status: 'pending-backend' }
  | { status: 'error'; message: string }
  | { status: 'ready'; prospects: Prospect[] }

// Carga el listado de prospectos (GET /api/v1/prospects). Si el endpoint aún
// no existe en PragmaCRM-Api, cae en el 404 genérico y el estado queda en
// 'pending-backend' (ver isRouteNotImplemented).
export function useProspects(): { state: ProspectsState; reload: () => void } {
  const [state, setState] = useState<ProspectsState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })

    listProspects({ page: 1, limit: 100 })
      .then((page) => {
        if (!cancelled) setState({ status: 'ready', prospects: page.items })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (isRouteNotImplemented(err)) {
          setState({ status: 'pending-backend' })
          return
        }
        setState({
          status: 'error',
          message: err instanceof ApiError ? err.message : 'Error al cargar los prospectos',
        })
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  return { state, reload }
}
