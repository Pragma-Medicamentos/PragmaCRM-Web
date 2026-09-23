import { apiFetch } from '../../lib/api/apiClient'
import type {
  Customer,
  CustomerCore,
  CustomerProfile,
  Paginated,
  UpdateCustomerLocationInput,
} from './customers.types'

// GET /api/v1/customers — data: Paginated<Customer>.
export function listCustomers(token: string | null): Promise<Paginated<Customer>> {
  return apiFetch<Paginated<Customer>>('/api/v1/customers', token)
}

// GET /api/v1/customers/:id — data: CustomerProfile.
export function getCustomerProfile(token: string | null, id: string): Promise<CustomerProfile> {
  return apiFetch<CustomerProfile>(`/api/v1/customers/${id}`, token)
}

// PATCH /api/v1/customers/:id/location — body { latitude, longitude, address?, place_id? }.
// Respuesta: data es CustomerCore.
export function updateCustomerLocation(
  token: string | null,
  id: string,
  input: UpdateCustomerLocationInput
): Promise<CustomerCore> {
  const body: UpdateCustomerLocationInput = {
    latitude: input.latitude,
    longitude: input.longitude,
  }
  if (input.address !== undefined) body.address = input.address
  if (input.place_id !== undefined) body.place_id = input.place_id

  return apiFetch<CustomerCore>(`/api/v1/customers/${id}/location`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
