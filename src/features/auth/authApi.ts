import { abandonSession, apiCall } from '../../lib/api/apiClient'
import { clearLegacyAuthStorage } from '../../lib/auth/legacyAuthStorage'

/**
 * POST /api/v1/auth/otp — público, sin sesión. Le pide a la API que dispare
 * un código de 6 dígitos al correo vía Supabase Auth (service_role del
 * servidor).
 */
export function requestLoginOtp(email: string): Promise<string> {
  return apiCall('/api/v1/auth/otp', { method: 'POST', data: { email }, skipAuth: true })
}

/**
 * POST /api/v1/auth/otp/verify — la API verifica el código y fija la sesión
 * en cookies HttpOnly. El body usa `token` (el mismo nombre que
 * `verifyOtp` de Supabase, que es lo que el servidor llama).
 * Contrato PCRM-109: depende del PR de PragmaCRM-Api.
 */
export function verifyLoginOtp(email: string, code: string): Promise<string> {
  clearLegacyAuthStorage()
  return apiCall('/api/v1/auth/otp/verify', {
    method: 'POST',
    data: { email, token: code },
    skipAuth: true,
  })
}

/**
 * POST /api/v1/auth/password — fija la contraseña de una cuenta que aún no
 * tiene (`passwordSetAt` null). La sesión va en la cookie, no en el body.
 */
export function setLoginPassword(password: string): Promise<string> {
  return apiCall('/api/v1/auth/password', { method: 'POST', data: { password } })
}

/** POST /api/v1/auth/logout — la API borra las cookies de sesión. */
export async function logout(): Promise<void> {
  try {
    await apiCall('/api/v1/auth/logout', { method: 'POST', skipAuth: true })
  } catch {
    /* igual se limpia el navegador: la cookie puede haber vencido */
  } finally {
    abandonSession()
  }
}
