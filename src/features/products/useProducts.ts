import { useCallback, useEffect, useState } from 'react'
import { ApiError, isRouteNotImplemented } from '../../lib/api/apiClient'
import { listProducts } from './productsApi'
import type { Product } from './products.types'

export type ProductsState =
  | { status: 'loading' }
  | { status: 'pending-backend' }
  | { status: 'error'; message: string }
  | { status: 'ready'; products: Product[]; page: number; pageSize: number; total: number; totalPages: number }

interface UseProductsOptions {
  page: number
  limit: number
  search?: string
}

/** Carga el listado de productos (GET /api/v1/products), paginado y buscado en el servidor. */
export function useProducts({ page, limit, search }: UseProductsOptions): {
  state: ProductsState
  reload: () => void
} {
  const [state, setState] = useState<ProductsState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })

    listProducts({ page, limit, search: search || undefined })
      .then((result) => {
        if (cancelled) return
        setState({
          status: 'ready',
          products: result.items,
          page: result.page,
          pageSize: result.page_size,
          total: result.total,
          totalPages: result.total_pages,
        })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (isRouteNotImplemented(err)) {
          setState({ status: 'pending-backend' })
          return
        }
        setState({
          status: 'error',
          message: err instanceof ApiError ? err.message : 'Error al cargar los productos',
        })
      })

    return () => {
      cancelled = true
    }
  }, [page, limit, search, reloadKey])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  return { state, reload }
}
