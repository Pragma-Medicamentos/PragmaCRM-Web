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
 * POST /api/v1/auth/login — la API verifica el código y fija la sesión en
 * cookies HttpOnly. El body es `{ email, otp }` (el código de 6 dígitos).
 * Contrato PCRM-109: depende de PragmaCRM-Api #40.
 */
export function verifyLoginOtp(email: string, code: string): Promise<string> {
  clearLegacyAuthStorage()
  return apiCall('/api/v1/auth/login', {
    method: 'POST',
    data: { email, otp: code },
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
