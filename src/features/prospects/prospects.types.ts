// GET /api/v1/prospects (RF, PCRM-64) — contrato cerrado por PO (Boxer, PCRM-62).
// data: Paginated<Prospect> (mismo shape que customers.types.ts Paginated).

export interface Paginated<T> {
  items: T[]
  page: number
  page_size: number
  total: number
  total_pages: number
}

export interface Prospect {
  id: string
  name: string
  phone: string
  user_id: string
  location: { lat: number; lng: number } | null
  created_at: string
  status: string
  seller_name?: string
}
