import { apiRequest } from '../../lib/api/apiClient'
import type {
  Customer,
  CustomerCore,
  CustomerCreditsPage,
  CustomerProfile,
  Paginated,
  UpdateCustomerCommercialProfileInput,
  UpdateCustomerContactInput,
  UpdateCustomerFiscalDataInput,
  UpdateCustomerLocationInput,
} from './customers.types'

// GET /api/v1/customers — data: Paginated<Customer>. search: min 1, max 120 chars. limit: max 100.
export function listCustomers(params?: { search?: string; page?: number; limit?: number }): Promise<Paginated<Customer>> {
  return apiRequest<Paginated<Customer>>('/api/v1/customers', { params })
}

// GET /api/v1/customers/:id — data: CustomerProfile.
export function getCustomerProfile(id: string): Promise<CustomerProfile> {
  return apiRequest<CustomerProfile>(`/api/v1/customers/${id}`)
}

// GET /api/v1/customers/:id/credits — solo se usan los totales, así que se pide una fila.
export function getCustomerCreditTotals(id: string, { signal }: { signal?: AbortSignal } = {}): Promise<CustomerCreditsPage> {
  return apiRequest<CustomerCreditsPage>(`/api/v1/customers/${id}/credits`, { params: { limit: 1 }, signal })
}

// PATCH /api/v1/customers/:id/location — body { latitude, longitude, address?, place_id? }.
// Respuesta: data es CustomerCore.
export function updateCustomerLocation(
  id: string,
  input: UpdateCustomerLocationInput
): Promise<CustomerCore> {
  const body: UpdateCustomerLocationInput = {
    latitude: input.latitude,
    longitude: input.longitude,
  }
  if (input.address !== undefined) body.address = input.address
  if (input.place_id !== undefined) body.place_id = input.place_id

  return apiRequest<CustomerCore>(`/api/v1/customers/${id}/location`, { method: 'PATCH', data: body })
}

// PATCH /api/v1/customers/:id/contact — teléfono y nombre comercial (el JSON de Efactsoft no los trae).
export function updateCustomerContact(id: string, input: UpdateCustomerContactInput): Promise<CustomerCore> {
  return apiRequest<CustomerCore>(`/api/v1/customers/${id}/contact`, { method: 'PATCH', data: input })
}

// PATCH /api/v1/customers/:id/commercial-profile — RF-12: personalidad y potencial.
export function updateCustomerCommercialProfile(
  id: string,
  input: UpdateCustomerCommercialProfileInput
): Promise<CustomerCore> {
  return apiRequest<CustomerCore>(`/api/v1/customers/${id}/commercial-profile`, { method: 'PATCH', data: input })
}

// PATCH /api/v1/customers/:id/fiscal-data — PCRM-185: registro sanitario, NRC, NIT y correo.
export function updateCustomerFiscalData(id: string, input: UpdateCustomerFiscalDataInput): Promise<CustomerCore> {
  return apiRequest<CustomerCore>(`/api/v1/customers/${id}/fiscal-data`, { method: 'PATCH', data: input })
}
