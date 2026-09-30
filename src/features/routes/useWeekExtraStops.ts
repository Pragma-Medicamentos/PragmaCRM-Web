import { useCallback, useEffect, useState } from 'react'
import { getSellerDailyRoute } from '../daily-route/dailyRouteApi'
import { dailyRouteErrorMessage } from '../daily-route/dailyRouteErrors'
import type { DailyRouteStop } from '../daily-route/dailyRoute.types'

export type WeekExtraStopsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; byDate: Map<string, DailyRouteStop[]> }

type Loaded = { key: string; state: WeekExtraStopsState }

/**
 * Paradas extra (PCRM-158) de un vendedor en las fechas indicadas. No hay
 * endpoint por rango: se pide la ruta del día de cada fecha en paralelo, a lo
 * sumo 7, y solo las de días con ruta asignada (sin ruta no puede haber extra).
 */
export function useWeekExtraStops(
  sellerId: string | null,
  dates: string[]
): { state: WeekExtraStopsState; reload: () => void } {
  const [loaded, setLoaded] = useState<Loaded>({ key: '', state: { status: 'loading' } })
  const [reloadKey, setReloadKey] = useState(0)
  const key = `${sellerId ?? ''}|${dates.join(',')}`

  useEffect(() => {
    if (!sellerId) return
    let cancelled = false
    const [, datesPart] = key.split('|')

    Promise.all(
      datesPart
        .split(',')
        .filter(Boolean)
        .map((date) =>
          getSellerDailyRoute(sellerId, date).then((route) => [date, route.stops.filter((s) => s.is_extra)] as const)
        )
    )
      .then((entries) => {
        if (!cancelled) setLoaded({ key, state: { status: 'ready', byDate: new Map(entries) } })
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoaded({ key, state: { status: 'error', message: dailyRouteErrorMessage(err) } })
      })

    return () => {
      cancelled = true
    }
  }, [sellerId, key, reloadKey])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  // Un reload conserva lo ya pintado; otra semana u otro vendedor arranca en loading.
  return { state: loaded.key === key ? loaded.state : { status: 'loading' }, reload }
}
