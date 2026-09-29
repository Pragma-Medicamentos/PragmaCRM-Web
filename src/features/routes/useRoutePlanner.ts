import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../../lib/api/apiClient'
import { listRouteAssignments, listRoutes } from './routesApi'
import type { Route, RouteAssignment } from './routes.types'

export type RoutePlannerState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; routes: Route[]; assignments: RouteAssignment[] }

/**
 * El backend no tiene un endpoint "asignaciones por vendedor" (RF-04 solo
 * expone GET /routes/:id/assignments, por ruta). Para armar la vista semanal
 * por vendedor del planificador, se piden todas las rutas activas y luego
 * las asignaciones de cada una en paralelo — aceptable porque `route` está
 * en el rango de "decenas" de filas (CLAUDE.md 7.9 en PragmaCRM-Api).
 */
export function useRoutePlanner(): { state: RoutePlannerState; reload: () => void } {
  const [state, setState] = useState<RoutePlannerState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })

    listRoutes({ active: true })
      .then(async (routes) => {
        const assignmentsByRoute = await Promise.all(routes.map((route) => listRouteAssignments(route.id)))
        return { routes, assignments: assignmentsByRoute.flat() }
      })
      .then(({ routes, assignments }) => {
        if (!cancelled) setState({ status: 'ready', routes, assignments })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setState({
          status: 'error',
          message: err instanceof ApiError ? err.message : 'Error al cargar el planificador de rutas',
        })
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  return { state, reload }
}
