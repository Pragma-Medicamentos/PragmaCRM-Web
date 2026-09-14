import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase/client'
import { ApiError, isRouteNotImplemented } from '../../lib/api/apiClient'
import { getCustomerProfile } from './customersApi'
import type { CustomerProfile } from './customers.types'

export type CustomerProfileState =
  | { status: 'loading' }
  | { status: 'pending-backend' }
  | { status: 'error'; message: string }
  | { status: 'ready'; profile: CustomerProfile }

/**
 * Carga el perfil de un cliente (GET /api/v1/customers/:id/profile). Mientras
 * el endpoint no exista en PragmaCRM-Api, la llamada cae en el 404 genérico
 * del backend y el estado queda en 'pending-backend' (ver isRouteNotImplemented).
 */
export function useCustomerProfile(customerId: string): { state: CustomerProfileState; reload: () => void } {
  const [state, setState] = useState<CustomerProfileState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })

    supabase.auth
      .getSession()
      .then(({ data }) => getCustomerProfile(data.session?.access_token ?? null, customerId))
      .then((profile) => {
        if (!cancelled) setState({ status: 'ready', profile })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (isRouteNotImplemented(err)) {
          setState({ status: 'pending-backend' })
          return
        }
        setState({
          status: 'error',
          message: err instanceof ApiError ? err.message : 'Error al cargar el perfil del cliente',
        })
      })

    return () => {
      cancelled = true
    }
  }, [customerId, reloadKey])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  return { state, reload }
}
