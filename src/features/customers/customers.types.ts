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
  // PCRM-185: captura manual, el importador no los toca.
  sanitary_registration: string | null
  nrc: string | null
  nit: string | null
  email: string | null
}

// RF-12: mismos literales que los CHECK de la base.
export const CUSTOMER_PERSONALITIES = ['rojo', 'azul', 'amarillo', 'verde'] as const
export type CustomerPersonality = (typeof CUSTOMER_PERSONALITIES)[number]
export const CUSTOMER_POTENTIALS = ['alto', 'medio', 'bajo'] as const
export type CustomerPotential = (typeof CUSTOMER_POTENTIALS)[number]

export const PERSONALITY_LABELS: Record<CustomerPersonality, string> = {
  rojo: 'Rojo',
  azul: 'Azul',
  amarillo: 'Amarillo',
  verde: 'Verde',
}

export const POTENTIAL_LABELS: Record<CustomerPotential, string> = {
  alto: 'Alto',
  medio: 'Medio',
  bajo: 'Bajo',
}

// PATCH /api/v1/customers/:id/contact — null limpia el campo.
export interface UpdateCustomerContactInput {
  phone?: string | null
  trade_name?: string | null
}

// PATCH /api/v1/customers/:id/commercial-profile — null = "sin clasificar".
export interface UpdateCustomerCommercialProfileInput {
  personality?: CustomerPersonality | null
  potential?: CustomerPotential | null
}

// PATCH /api/v1/customers/:id/fiscal-data — "" limpia el campo.
export interface UpdateCustomerFiscalDataInput {
  sanitary_registration?: string
  nrc?: string
  nit?: string
  email?: string
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

// Totales de GET /api/v1/customers/:id/credits (facturas con saldo, plazo de 60 días).
export interface CustomerCreditTotals {
  pending_balance: string
  overdue_amount: string
  overdue_count: number
  credit_limit: string | null
  credit_available: string | null
}

export interface CustomerCreditsPage {
  total: number
  totals: CustomerCreditTotals
}

// Body de PATCH /api/v1/customers/:id/location.
// address / place_id opcionales: omitir = no tocar; null = limpiar.
export interface UpdateCustomerLocationInput {
  latitude: number
  longitude: number
  address?: string | null
  place_id?: string | null
}
