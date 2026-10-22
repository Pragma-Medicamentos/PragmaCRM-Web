import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiError } from '../../lib/api/apiClient'
import { listRoutes } from '../routes/routesApi'
import type { Route } from '../routes/routes.types'
import type { ReportFilterKey, ReportFilterValues } from './reportsApi'

/** Parámetro de la URL de cada filtro (?zona=&vendedor=&ruta=). */
const PARAMS: Record<ReportFilterKey, string> = { zone: 'zona', user_id: 'vendedor', route_id: 'ruta' }

export const FILTER_LABELS: Record<ReportFilterKey, string> = {
  zone: 'Zona',
  user_id: 'Vendedor',
  route_id: 'Ruta',
}

/**
 * Filtros de /reportes en la URL, para que la vista se pueda compartir y
 * sobreviva a una recarga. El rango vive en useMetricsSearch (?desde=&hasta=).
 */
export function useReportFilters() {
  const [params, setParams] = useSearchParams()

  const values = useMemo<ReportFilterValues>(() => {
    const result: ReportFilterValues = {}
    for (const key of Object.keys(PARAMS) as ReportFilterKey[]) {
      const value = params.get(PARAMS[key])
      if (value) result[key] = value
    }
    return result
  }, [params])

  const setFilter = useCallback(
    (key: ReportFilterKey, value: string | null) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (value) next.set(PARAMS[key], value)
          else next.delete(PARAMS[key])
          return next
        },
        { replace: true }
      )
    },
    [setParams]
  )

  const clear = useCallback(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        Object.values(PARAMS).forEach((param) => next.delete(param))
        return next
      },
      { replace: true }
    )
  }, [setParams])

  return { values, setFilter, clear }
}

export type RoutesState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; routes: Route[]; zones: string[] }

/**
 * Rutas para el filtro de ruta, y las zonas distintas de esas rutas para el
 * de zona: la API filtra por `route.zone` (el importador no llena la zona del
 * cliente), así que las zonas válidas son exactamente las de las rutas.
 * Incluye rutas inactivas, porque su venta histórica sigue en los reportes.
 */
export function useReportRoutes(): RoutesState {
  const [state, setState] = useState<RoutesState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    listRoutes()
      .then((routes) => {
        if (cancelled) return
        const zones = new Map<string, string>()
        for (const route of routes) {
          const zone = route.zone?.trim()
          // La API compara sin distinguir mayúsculas: "Norte" y "norte " son una.
          if (zone && !zones.has(zone.toLowerCase())) zones.set(zone.toLowerCase(), zone)
        }
        setState({
          status: 'ready',
          routes: [...routes].sort((a, b) => a.name.localeCompare(b.name, 'es')),
          zones: [...zones.values()].sort((a, b) => a.localeCompare(b, 'es')),
        })
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: err instanceof ApiError ? err.message : 'Error al cargar las rutas',
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
