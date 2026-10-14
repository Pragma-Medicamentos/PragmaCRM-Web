import { useCallback, useEffect, useState } from 'react'
import { ApiError, isRouteNotImplemented } from '../../lib/api/apiClient'
import { listCustomers } from './customersApi'
import type { Customer } from './customers.types'

export type CustomersState =
  | { status: 'loading' }
  | { status: 'pending-backend' }
  | { status: 'error'; message: string }
  | { status: 'ready'; customers: Customer[] }

/** El máximo que acepta `limit` en GET /api/v1/customers. */
const PAGE_SIZE = 100

/**
 * Toda la cartera, página por página: el API pagina siempre (20 por defecto)
 * y estas vistas filtran y buscan en el cliente. Son cientos de clientes
 * (CLAUDE.md 7.9), así que son pocas peticiones.
 */
async function listAllCustomers(): Promise<Customer[]> {
  const first = await listCustomers({ page: 1, limit: PAGE_SIZE })
  const rest = await Promise.all(
    Array.from({ length: Math.max(first.total_pages - 1, 0) }, (_, i) =>
      listCustomers({ page: i + 2, limit: PAGE_SIZE })
    )
  )
  return [first, ...rest].flatMap((page) => page.items)
}

/**
 * Carga el listado completo de clientes (GET /api/v1/customers). Mientras el
 * endpoint no exista en PragmaCRM-Api, la llamada cae en el 404 genérico del
 * backend y el estado queda en 'pending-backend' (ver isRouteNotImplemented).
 */
export function useCustomers(): { state: CustomersState; reload: () => void } {
  const [state, setState] = useState<CustomersState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })

    listAllCustomers()
      .then((customers) => {
        if (!cancelled) setState({ status: 'ready', customers })
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
