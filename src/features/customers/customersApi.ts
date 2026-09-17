import { apiFetch } from '../../lib/api/apiClient'
import type { Customer, CustomerLocationUpdateResult, CustomerProfile, Paginated } from './customers.types'

// GET /api/v1/customers — data: Paginated<Customer> (ver customers.types.ts).
export function listCustomers(token: string | null): Promise<Paginated<Customer>> {
  return apiFetch<Paginated<Customer>>('/api/v1/customers', token)
}

// GET /api/v1/customers/:id/profile — aún no implementado en PragmaCRM-Api
// (ver RF-02, customers.types.ts).
export function getCustomerProfile(token: string | null, id: string): Promise<CustomerProfile> {
  return apiFetch<CustomerProfile>(`/api/v1/customers/${id}/profile`, token)
}

// PATCH /api/v1/customers/:id/location — aún no implementado en PragmaCRM-Api.
// Caso de uso "Asignar ubicación GPS" (RF-02); guarda customer.location
// (geography(Point,4326), ver CLAUDE.md 7.3). El radio de validación (RF-06)
// no viaja aquí: es una constante global, no un campo por cliente (CLAUDE.md 5.3).
export function updateCustomerLocation(
  token: string | null,
  id: string,
  input: { lat: number; lng: number }
): Promise<CustomerLocationUpdateResult> {
  return apiFetch<CustomerLocationUpdateResult>(`/api/v1/customers/${id}/location`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}
