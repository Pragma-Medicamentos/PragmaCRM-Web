import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase/client'
import { ApiError, isRouteNotImplemented } from '../../lib/api/apiClient'
import { listRoutes, listRouteStops } from './routesApi'
import type { Route, RouteStop } from './routes.types'

export type RouteStopsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'not-found' }
  | { status: 'ready'; route: Route; stops: RouteStop[]; backendPending: boolean }

/**
 * Carga la ruta (para nombre/zona) y sus paradas guardadas. Si
 * GET /api/v1/routes/:id/stops todavía no existe en la Api (PCRM-140), el
 * estado queda `ready` con `stops: []` y `backendPending: true` para que el
 * editor siga usable con estado local sin persistir.
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
        if (!route) return { route: null, stops: [], backendPending: false }

        try {
          const stops = await listRouteStops(token, routeId)
          return { route, stops, backendPending: false }
        } catch (err) {
          if (isRouteNotImplemented(err)) return { route, stops: [], backendPending: true }
          throw err
        }
      })
      .then((result) => {
        if (cancelled) return
        if (!result.route) {
          setState({ status: 'not-found' })
          return
        }
        setState({ status: 'ready', route: result.route, stops: result.stops, backendPending: result.backendPending })
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
