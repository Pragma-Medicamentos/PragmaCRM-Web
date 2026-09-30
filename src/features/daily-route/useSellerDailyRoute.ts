import { useCallback, useEffect, useState } from 'react'
import { dailyRouteErrorMessage } from './dailyRouteErrors'
import { getSellerDailyRoute } from './dailyRouteApi'
import type { DailyRoute } from './dailyRoute.types'

export type SellerDailyRouteState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; route: DailyRoute }

/** Carga la ruta del día de un vendedor (PCRM-158, contrato provisional en dailyRouteApi.ts). */
export function useSellerDailyRoute(
  sellerId: string,
  date: string
): { state: SellerDailyRouteState; reload: () => void } {
  const [state, setState] = useState<SellerDailyRouteState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })

    getSellerDailyRoute(sellerId, date)
      .then((route) => {
        if (!cancelled) setState({ status: 'ready', route })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setState({
          status: 'error',
          message: dailyRouteErrorMessage(err),
        })
      })

    return () => {
      cancelled = true
    }
  }, [sellerId, date, reloadKey])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  return { state, reload }
}
