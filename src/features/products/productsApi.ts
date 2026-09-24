import { apiRequest } from '../../lib/api/apiClient'
import type { ListProductsParams, Paginated, Product } from './products.types'

// GET /api/v1/products — data: Paginated<Product>.
export function listProducts(params: ListProductsParams = {}): Promise<Paginated<Product>> {
  return apiRequest<Paginated<Product>>('/api/v1/products', { params })
}

// GET /api/v1/products/:id — data: Product.
export function getProduct(id: number): Promise<Product> {
  return apiRequest<Product>(`/api/v1/products/${id}`)
}
