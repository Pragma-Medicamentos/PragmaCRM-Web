import { apiRequest } from '../../lib/api/apiClient'
import type { CreateVendorInput, UpdatedVendor, UpdateVendorInput, Vendor } from './vendors.types'

export function listVendors(): Promise<Vendor[]> {
  return apiRequest<Vendor[]>('/api/v1/sellers')
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
