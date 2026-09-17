// Ancla: RF-02 "Perfil base de cliente (web)" (PragmaCRM-Api CLAUDE.md, sección
// 4.1): historial de ventas, créditos y cobros vigentes, montos y responsable
// de compra. Contrato real de `src/presentation/customers/` en PragmaCRM-Api
// (`CustomerListItem` / `Paginated`, `domain/types/customer.types.ts` y
// `domain/types/pagination.types.ts`).

export type CustomerCategory = 'A' | 'B' | 'C' | 'uncategorized'

// Página de resultados, tal como la envuelve `data` en cualquier listado
// paginado de la API (primer caso: GET /api/v1/customers).
export interface Paginated<T> {
  items: T[]
  page: number
  page_size: number
  total: number
  total_pages: number
}

// GET /api/v1/customers — data: Paginated<Customer>.
export interface Customer {
  id: string
  erp_customer_id: number | null
  name: string
  trade_name: string | null
  establishment_type: string | null
  zone: string | null
  municipality: string | null
  attends: string | null
  phone: string | null
  active: boolean
  has_gps: boolean
  category: CustomerCategory
  net_purchases: string
  orders_count: number
  visits_count: number
  conversion_rate: number
  avg_payment_days: number | null
  pending_balance: string
}

// Responsable de compra: el DER no tiene `customer.assigned_user_id` (ver
// CLAUDE.md sección 7.3), así que el backend deberá resolverlo desde
// route_customer/route_user o desde la última venta/visita. Se modela como
// posiblemente nulo porque un cliente puede no tener responsable resuelto.
export interface CustomerResponsible {
  id: string
  name: string
}

// Una fila de `sale`. `erp_status`: 1 = cotización, 2 = venta realizada (ver
// CLAUDE.md sección 5.5) — el backend debería excluir el estado 1 salvo que
// la vista lo pida explícitamente.
export interface CustomerSaleHistoryEntry {
  erp_sale_id: number
  document: string | null
  erp_created_at: string | null
  total: string
  pending_balance: string
  last_payment_at: string | null
  erp_status: number
}

// Créditos y cobros vigentes (RF-02). `pending_balance_total` y
// `overdue_balance_total` se agregan sobre `sale`/`balance_snapshot` en el
// backend; el plazo de crédito es fijo (60 días, CLAUDE.md sección 5.6) y no
// vive en esta respuesta.
export interface CustomerCreditSummary {
  credit: boolean
  credit_limit: string | null
  pending_balance_total: string
  overdue_balance_total: string
}

// GET /api/v1/customers/:id/profile
export interface CustomerProfile extends Customer {
  address: string | null
  phone: string | null
  mobile: string | null
  location: { lat: number; lng: number } | null
  personality: string | null
  potential: string | null
  responsible: CustomerResponsible | null
  credit_summary: CustomerCreditSummary
  sales_history: CustomerSaleHistoryEntry[]
}

// PATCH /api/v1/customers/:id/location — respuesta esperada tras asignar la
// ubicación (wireframe 1p, "Ubicación GPS del cliente · RF-02").
export interface CustomerLocationUpdateResult {
  location: { lat: number; lng: number }
  has_gps: boolean
}
