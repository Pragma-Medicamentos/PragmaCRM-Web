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
  phone: string | null
  user_id: string
  seller_name: string | null
  location: { lat: number; lng: number } | null
  created_at: string
  status: string | null
}

// POST /api/v1/prospects/admin (PCRM-64) — el admin registra un prospecto a
// nombre de un vendedor (dropdown). Sin GPS: el admin no está parado en el
// lugar como sí lo está el vendedor desde el móvil; se agrega después con
// updateProspectLocation.
export interface CreateProspectInput {
  user_id: string
  name: string
  phone: string
}

// PATCH /api/v1/prospects/:id/location — fija o corrige el pin GPS de un
// prospecto ya creado.
export interface UpdateProspectLocationInput {
  latitude: number
  longitude: number
}
