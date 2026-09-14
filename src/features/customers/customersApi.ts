import { apiFetch } from '../../lib/api/apiClient'
import type { Customer, CustomerProfile } from './customers.types'

// GET /api/v1/customers — aún no implementado en PragmaCRM-Api (ver RF-02,
// customers.types.ts).
export function listCustomers(token: string | null): Promise<Customer[]> {
  return apiFetch<Customer[]>('/api/v1/customers', token)
}

// GET /api/v1/customers/:id/profile — aún no implementado en PragmaCRM-Api
// (ver RF-02, customers.types.ts).
export function getCustomerProfile(token: string | null, id: string): Promise<CustomerProfile> {
  return apiFetch<CustomerProfile>(`/api/v1/customers/${id}/profile`, token)
}
