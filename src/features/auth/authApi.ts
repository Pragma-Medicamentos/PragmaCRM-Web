import { apiCall } from '../../lib/api/apiClient'

/**
 * POST /api/v1/auth/otp — público, sin token. Le pide a la API que dispare
 * un código de 6 dígitos al correo vía Supabase Auth (service_role key del
 * lado del servidor). El paso de verificarlo (`supabase.auth.verifyOtp`)
 * ocurre directo contra Supabase, no contra esta API.
 */
export function requestLoginOtp(email: string): Promise<string> {
  return apiCall('/api/v1/auth/otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
}
