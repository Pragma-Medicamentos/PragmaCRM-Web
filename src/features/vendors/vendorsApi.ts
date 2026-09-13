import { apiFetch } from '../../lib/api/apiClient'
import type { CreateVendorInput, Vendor } from './vendors.types'

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
