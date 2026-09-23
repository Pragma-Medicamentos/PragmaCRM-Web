import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase/client'
import { ApiError } from '../../lib/api/apiClient'
import { listRoutes, listRouteStops } from './routesApi'
import type { Route, RouteStop } from './routes.types'

export type RouteStopsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'not-found' }
  | { status: 'ready'; route: Route; stops: RouteStop[] }

/**
 * Carga la ruta (para nombre/zona) y sus paradas guardadas usando el contrato
 * bloqueado por PragmaCRM-Api PCRM-140. Cualquier error real del GET se muestra
 * como error de carga; no se habilita un modo local sin persistencia.
 */
export function useRouteStops(routeId: string): { state: RouteStopsState; reload: () => void } {
  const [state, setState] = useState<RouteStopsState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        const token = data.session?.access_token ?? null
        const routes = await listRoutes(token, {})
        const route = routes.find((r) => r.id === routeId)
        if (!route) return null

        const stops = await listRouteStops(token, routeId)
        return { route, stops }
      })
      .then((result) => {
        if (cancelled) return
        if (!result) {
          setState({ status: 'not-found' })
          return
        }
        setState({ status: 'ready', route: result.route, stops: result.stops })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setState({
          status: 'error',
          message: err instanceof ApiError ? err.message : 'Error al cargar las paradas de la ruta',
        })
      })

    return () => {
      cancelled = true
    }
  }, [routeId, reloadKey])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  return { state, reload }
}
