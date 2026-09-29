// Ancla: RF-02 perfil base de cliente (web). Contrato real de
// domain/types/customer.types.ts en PragmaCRM-Api.

export type CustomerCategory = 'A' | 'B' | 'C' | 'uncategorized'

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

export interface GeoPoint {
  lat: number
  lng: number
}

// GET /api/v1/customers/:id (core) y respuesta de PATCH .../location.
export interface CustomerCore {
  id: string
  erp_customer_id: number | null
  name: string
  trade_name: string | null
  establishment_type: string | null
  address: string | null
  place_id: string | null
  municipality: string | null
  zone: string | null
  phone: string | null
  mobile: string | null
  attends: string | null
  personality: string | null
  potential: string | null
  credit: boolean
  credit_limit: string | null
  origin: string | null
  active: boolean
  location: GeoPoint | null
}

export interface CustomerRouteRef {
  id: string
  name: string
}

export interface CustomerVisitNote {
  date: string
  notes: string
}

export interface CustomerSummary {
  net_purchases: string
  orders_count: number
  visits_count: number
  conversion_rate: number
  avg_payment_days: number | null
  pending_balance: string
  purchase_frequency_days: number | null
  last_purchase_at: string | null
  last_visit_at: string | null
}

// GET /api/v1/customers/:id — data: CustomerProfile.
export interface CustomerProfile extends CustomerCore {
  category: CustomerCategory
  routes: CustomerRouteRef[]
  summary: CustomerSummary
  pending_balance: string
  recent_notes: CustomerVisitNote[]
}

// Body de PATCH /api/v1/customers/:id/location.
// address / place_id opcionales: omitir = no tocar; null = limpiar.
export interface UpdateCustomerLocationInput {
  latitude: number
  longitude: number
  address?: string | null
  place_id?: string | null
}
