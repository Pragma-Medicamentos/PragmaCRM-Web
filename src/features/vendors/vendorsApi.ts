import { apiCall, apiRequest } from '../../lib/api/apiClient'
import type {
  CreateVendorInput,
  ListVendorsParams,
  PageParams,
  SetVendorGoalInput,
  UpdatedVendor,
  UpdateVendorInput,
  Vendor,
  VendorGoal,
  VendorGoals,
  VendorsPage,
} from './vendors.types'

// Tope de `limit` en la API (MAX_PAGE_SIZE de pagination.schema.ts).
const MAX_PAGE_SIZE = 100

export function listVendors(params: ListVendorsParams = {}): Promise<VendorsPage> {
  return apiRequest<VendorsPage>('/api/v1/sellers', { params })
}

/**
 * Todos los vendedores en una sola página, para selectores. Son decenas
 * (CLAUDE.md 7.9), muy por debajo del tope de la API.
 */
export function listAllVendors(): Promise<Vendor[]> {
  return listVendors({ limit: MAX_PAGE_SIZE }).then((page) => page.items)
}

export function getVendor(id: string): Promise<Vendor> {
  return apiRequest<Vendor>(`/api/v1/sellers/${id}`)
}

export function createVendor(input: CreateVendorInput): Promise<Vendor> {
  return apiRequest<Vendor>('/api/v1/sellers', { method: 'POST', data: input })
}

export function updateVendor(id: string, input: UpdateVendorInput): Promise<UpdatedVendor> {
  return apiRequest<UpdatedVendor>(`/api/v1/sellers/${id}`, { method: 'PATCH', data: input })
}

export function setVendorActive(id: string, active: boolean): Promise<Vendor> {
  return apiRequest<Vendor>(`/api/v1/sellers/${id}/active`, { method: 'PATCH', data: { active } })
}

export function resendVendorOtp(id: string): Promise<Vendor> {
  return apiRequest<Vendor>(`/api/v1/sellers/${id}/resend-otp`, { method: 'POST' })
}

export function getVendorGoals(id: string, params: PageParams = {}): Promise<VendorGoals> {
  return apiRequest<VendorGoals>(`/api/v1/sellers/${id}/goals`, { params })
}

export function setVendorGoal(id: string, input: SetVendorGoalInput): Promise<VendorGoal> {
  return apiRequest<VendorGoal>(`/api/v1/sellers/${id}/goals`, { method: 'PUT', data: input })
}

export function deleteVendorGoal(id: string, goalId: string): Promise<void> {
  return apiCall(`/api/v1/sellers/${id}/goals/${goalId}`, { method: 'DELETE' }).then(() => undefined)
}
