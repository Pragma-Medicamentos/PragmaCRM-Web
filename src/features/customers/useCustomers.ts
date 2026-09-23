import { useCallback, useEffect, useState } from 'react'
import { ApiError, isRouteNotImplemented } from '../../lib/api/apiClient'
import { listCustomers } from './customersApi'
import type { Customer } from './customers.types'

export type CustomersState =
  | { status: 'loading' }
  | { status: 'pending-backend' }
  | { status: 'error'; message: string }
  | { status: 'ready'; customers: Customer[] }

/**
 * Carga el listado de clientes (GET /api/v1/customers). Mientras el endpoint
 * no exista en PragmaCRM-Api, la llamada cae en el 404 genérico del backend
 * y el estado queda en 'pending-backend' (ver isRouteNotImplemented).
 */
export function useCustomers(): { state: CustomersState; reload: () => void } {
  const [state, setState] = useState<CustomersState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })

    listCustomers()
      .then((page) => {
        if (!cancelled) setState({ status: 'ready', customers: page.items })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (isRouteNotImplemented(err)) {
          setState({ status: 'pending-backend' })
          return
        }
        setState({
          status: 'error',
          message: err instanceof ApiError ? err.message : 'Error al cargar los clientes',
        })
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  return { state, reload }
}
