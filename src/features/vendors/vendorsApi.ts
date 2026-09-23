import { request } from '../../lib/api/apiClient'
import type { CreateVendorInput, UpdateVendorInput, Vendor } from './vendors.types'

export function listVendors(): Promise<Vendor[]> {
  return request<Vendor[]>({ url: '/api/v1/sellers' })
}

export function createVendor(input: CreateVendorInput): Promise<Vendor> {
  return request<Vendor>({ method: 'POST', url: '/api/v1/sellers', data: input })
}

export function updateVendor(id: string, input: UpdateVendorInput): Promise<Vendor> {
  return request<Vendor>({ method: 'PATCH', url: `/api/v1/sellers/${id}`, data: input })
}

export function setVendorActive(id: string, active: boolean): Promise<Vendor> {
  return request<Vendor>({ method: 'PATCH', url: `/api/v1/sellers/${id}/active`, data: { active } })
}

export function resendVendorOtp(id: string): Promise<Vendor> {
  return request<Vendor>({ method: 'POST', url: `/api/v1/sellers/${id}/resend-otp` })
}
