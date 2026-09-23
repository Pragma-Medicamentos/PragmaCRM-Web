import { request } from '../../lib/api/apiClient'
import type { Customer, CustomerLocationUpdateResult, CustomerProfile, Paginated } from './customers.types'

// GET /api/v1/customers — data: Paginated<Customer> (ver customers.types.ts).
export function listCustomers(): Promise<Paginated<Customer>> {
  return request<Paginated<Customer>>({ url: '/api/v1/customers' })
}

// GET /api/v1/customers/:id/profile — aún no implementado en PragmaCRM-Api
// (ver RF-02, customers.types.ts).
export function getCustomerProfile(id: string): Promise<CustomerProfile> {
  return request<CustomerProfile>({ url: `/api/v1/customers/${id}/profile` })
}

// PATCH /api/v1/customers/:id/location — aún no implementado en PragmaCRM-Api.
// Caso de uso "Asignar ubicación GPS" (RF-02); guarda customer.location
// (geography(Point,4326), ver CLAUDE.md 7.3). El radio de validación (RF-06)
// no viaja aquí: es una constante global, no un campo por cliente (CLAUDE.md 5.3).
export function updateCustomerLocation(
  id: string,
  input: { lat: number; lng: number }
): Promise<CustomerLocationUpdateResult> {
  return request<CustomerLocationUpdateResult>({
    method: 'PATCH',
    url: `/api/v1/customers/${id}/location`,
    data: input,
  })
}
