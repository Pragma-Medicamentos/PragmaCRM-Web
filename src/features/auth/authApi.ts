import { request, requestMessage } from '../../lib/api/apiClient'
import type { AppUser } from './auth.types'

/**
 * POST /api/v1/auth/otp — público, sin token. Le pide a la API que dispare
 * un código de 6 dígitos al correo vía Supabase Auth (service_role key del
 * lado del servidor). El paso de verificarlo (`supabase.auth.verifyOtp`)
 * ocurre directo contra Supabase, no contra esta API.
 */
export function requestLoginOtp(email: string): Promise<string> {
  return requestMessage({ method: 'POST', url: '/api/v1/auth/otp', data: { email } })
}

/** GET /api/v1/me — perfil (role, name, email) del usuario de la sesión vigente. */
export function fetchMe(): Promise<AppUser> {
  return request<AppUser>({ url: '/api/v1/me' })
}
