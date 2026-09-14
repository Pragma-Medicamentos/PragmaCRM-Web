import { apiFetch } from '../../lib/api/apiClient'
import type { CreateVendorInput, UpdateVendorInput, Vendor } from './vendors.types'

export function listVendors(token: string | null): Promise<Vendor[]> {
  return apiFetch<Vendor[]>('/api/v1/sellers', token)
}

export function createVendor(token: string | null, input: CreateVendorInput): Promise<Vendor> {
  return apiFetch<Vendor>('/api/v1/sellers', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function updateVendor(token: string | null, id: string, input: UpdateVendorInput): Promise<Vendor> {
  return apiFetch<Vendor>(`/api/v1/sellers/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function setVendorActive(token: string | null, id: string, active: boolean): Promise<Vendor> {
  return apiFetch<Vendor>(`/api/v1/sellers/${id}/active`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active }),
  })
}

export function resendVendorOtp(token: string | null, id: string): Promise<Vendor> {
  return apiFetch<Vendor>(`/api/v1/sellers/${id}/resend-otp`, token, { method: 'POST' })
}
