import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../../lib/api/apiClient'
import { listVendors } from './vendorsApi'
import type { ListVendorsParams, VendorsPage } from './vendors.types'

export type VendorsPageState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; page: VendorsPage }

/**
 * Una página del listado de vendedores (GET /api/v1/sellers), con búsqueda y
 * filtro de estado resueltos en el servidor. Mismo patrón que useProducts.
 */
export function useVendorsPage({ page, limit, active, search }: ListVendorsParams): {
  state: VendorsPageState
  reload: () => void
} {
  const [state, setState] = useState<VendorsPageState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })

    listVendors({ page, limit, active, search: search || undefined })
      .then((result) => {
        if (!cancelled) setState({ status: 'ready', page: result })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setState({
          status: 'error',
          message: err instanceof ApiError ? err.message : 'Error al cargar los vendedores',
        })
      })

    return () => {
      cancelled = true
    }
  }, [page, limit, active, search, reloadKey])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  return { state, reload }
}
