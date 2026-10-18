import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../../lib/api/apiClient'
import { getVendorGoals } from './vendorsApi'
import type { VendorGoals } from './vendors.types'

export type VendorGoalsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; goals: VendorGoals }

/**
 * Meta vigente y una página del historial de cambios de un vendedor
 * (GET /api/v1/sellers/:id/goals, PCRM-173). `reload` la vuelve a pedir
 * después de cambiar o quitar una meta.
 */
export function useVendorGoals(
  id: string,
  page: number,
  limit: number
): { state: VendorGoalsState; reload: () => void } {
  const [state, setState] = useState<VendorGoalsState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })

    getVendorGoals(id, { page, limit })
      .then((goals) => {
        if (!cancelled) setState({ status: 'ready', goals })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setState({
          status: 'error',
          message: err instanceof ApiError ? err.message : 'Error al cargar la meta del vendedor',
        })
      })

    return () => {
      cancelled = true
    }
  }, [id, page, limit, reloadKey])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  return { state, reload }
}
