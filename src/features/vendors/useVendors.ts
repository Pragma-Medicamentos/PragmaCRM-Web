import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase/client'
import { ApiError } from '../../lib/api/apiClient'
import { listVendors } from './vendorsApi'
import type { Vendor } from './vendors.types'

export type VendorsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; vendors: Vendor[] }

/**
 * Carga el listado de vendedores (GET /api/v1/sellers) con el access token
 * de la sesión de Supabase vigente. `reload` vuelve a pedirlo, para
 * refrescar la lista después de un alta exitosa.
 */
export function useVendors(): { state: VendorsState; reload: () => void } {
  const [state, setState] = useState<VendorsState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })

    supabase.auth
      .getSession()
      .then(({ data }) => listVendors(data.session?.access_token ?? null))
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
