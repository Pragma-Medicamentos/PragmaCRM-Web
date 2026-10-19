import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../../lib/api/apiClient'
import { listAllVendors } from './vendorsApi'
import type { Vendor } from './vendors.types'

export type VendorsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; vendors: Vendor[] }

/**
 * Todos los vendedores (GET /api/v1/sellers en una sola página), para los
 * selectores de vendedor. El listado de /vendedores pagina con
 * useVendorsPage. `reload` vuelve a pedirlo.
 */
export function useVendors(): { state: VendorsState; reload: () => void } {
  const [state, setState] = useState<VendorsState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })

    listAllVendors()
      .then((vendors) => {
        if (!cancelled) setState({ status: 'ready', vendors })
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
  }, [reloadKey])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  return { state, reload }
}
