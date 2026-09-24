// PCRM-149: catálogo de productos (solo lectura). Contrato real en
// PragmaCRM-Api PCRM-148 (PR #34).

import type { Paginated } from '../customers/customers.types'

// GET /api/v1/products y GET /api/v1/products/:id — data: Product | Paginated<Product>.
export interface Product {
  erp_product_id: number
  code: string | null
  name: string
  product_group: string | null
  last_seen_at: string | null
  created_at: string
  updated_at: string
}

export type { Paginated }

export interface ListProductsParams {
  page?: number
  limit?: number
  search?: string
}
