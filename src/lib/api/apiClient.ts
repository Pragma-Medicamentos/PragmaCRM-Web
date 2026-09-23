import axios, { type AxiosRequestConfig } from 'axios'
import { supabase } from '../supabase/client'

export interface ApiEnvelope<T> {
  success: boolean
  message: string
  data?: T
  errors?: unknown
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/**
 * El handler 404 genérico de PragmaCRM-Api (`server.ts`) responde siempre
 * `{ success: false, message: 'Not found' }` cuando la ruta no existe. Un 404
 * de negocio (ej. "Cliente no encontrado") trae su propio mensaje, así que
 * este chequeo solo es cierto cuando el endpoint todavía no está
 * implementado. Úsalo para mostrar una vista "pendiente de backend" en lugar
 * de un error genérico.
 */
export function isRouteNotImplemented(err: unknown): boolean {
  return err instanceof ApiError && err.status === 404 && err.message === 'Not found'
}

/**
 * El request fue abortado con su `AbortSignal` (no es un error de la API).
 * Axios 1.x rechaza con `CanceledError` (`code === 'ERR_CANCELED'`).
 * `axios.isCancel` cubre ese caso cuando el error trae `__CANCEL__`, y
 * también el `CancelToken` legacy; el chequeo de código atrapa un abort
 * que solo expone `ERR_CANCELED`.
 */
export function isRequestCanceled(err: unknown): boolean {
  return axios.isCancel(err) || (axios.isAxiosError(err) && err.code === 'ERR_CANCELED')
}

declare module 'axios' {
  interface AxiosRequestConfig {
    /**
     * Endpoint público (ej. pedir el OTP de login): no se adjunta el token
     * de sesión ni un 401 se interpreta como sesión vencida.
     */
    skipAuth?: boolean
  }
}

// Gate de transporte, no de identidad: PragmaCRM-Api exige este header en
// toda ruta bajo /api/v1 salvo /api/health (presentation/middleware/apiKey.ts),
// por delante incluso de requireAuth. Sin él, cualquier llamada -incluido
// pedir el OTP de login- responde 401 "Invalid or missing API key".
const API_KEY_REJECTED_MESSAGE = 'Invalid or missing API key'

/**
 * Única instancia de Axios hacia PragmaCRM-Api. Todo request del dashboard
 * pasa por aquí (vía `apiRequest` / `apiCall`), de modo que la URL base, el
 * `x-api-key`, el Bearer de Supabase y el manejo de sesión vencida viven en
 * un solo lugar.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'x-api-key': import.meta.env.VITE_API_KEY },
})

// Adjunta el access token de la sesión vigente. `getSession()` lo toma del
// storage del SDK y lo refresca si está por vencer, así que no se cachea
// aquí ni hace falta que cada llamador lo pida y lo pase.
api.interceptors.request.use(async (config) => {
  if (config.skipAuth) return config

  const { data } = await supabase.auth.getSession()
  if (data.session) {
    config.headers.set('Authorization', `Bearer ${data.session.access_token}`)
  }
  return config
})

// Cuando la API rechaza un token que sí se envió (revocado, usuario baneado,
// vencido sin poder refrescar), la sesión local ya no sirve: se cierra y
// `useCurrentAppUser` la ve pasar a "sin sesión", que es lo que lleva a
// AdminRoute a /login. Se marca el motivo para que el login explique qué pasó.
let sessionExpired = false

/** ¿La sesión se cerró porque la API dejó de aceptarla? Ver `useCurrentAppUser`. */
export function wasSessionExpired(): boolean {
  return sessionExpired
}

/** Se llama al ver una sesión válida, para no arrastrar el aviso a un login nuevo. */
export function clearSessionExpired(): void {
  sessionExpired = false
}

// Varias peticiones en vuelo (el planificador lanza una por ruta) pueden
// recibir 401 a la vez; comparten un solo cierre de sesión.
let signingOut: Promise<unknown> | null = null

function expireSession(): Promise<unknown> {
  sessionExpired = true
  // scope 'local': solo limpia este navegador, sin llamar al servidor con un
  // token que ya sabemos inválido ni cerrar las sesiones del usuario en otros
  // dispositivos.
  signingOut ??= supabase.auth.signOut({ scope: 'local' }).finally(() => {
    signingOut = null
  })
  return signingOut
}

// Normaliza todo fallo a `ApiError` con el `status` HTTP y el `message` del
// envelope ({ success, message, data?, errors? }), para que el llamador
// distinga 401 (sin sesión válida) de 403 (sesión válida, usuario sin
// permiso) y 503 (JWKS caído, transitorio). Status 0 = sin respuesta (red
// caída, CORS). Un abort no se convierte: ver `isRequestCanceled`.
api.interceptors.response.use(undefined, async (error: unknown) => {
  // CanceledError es un AxiosError: sin este corte el abort se vuelve ApiError
  // y el upload cancelado se pinta como fallo de API.
  if (isRequestCanceled(error)) throw error
  if (!axios.isAxiosError(error)) throw error

  const status = error.response?.status ?? 0
  const data = error.response?.data
  // nginx responde 413/502/504 con HTML, no con el envelope.
  const message =
    data && typeof data === 'object' && typeof (data as ApiEnvelope<unknown>).message === 'string'
      ? (data as ApiEnvelope<unknown>).message
      : undefined

  // Un 401 por API key no es culpa de la sesión: cerrarla no lo arregla.
  const sessionRejected =
    status === 401 &&
    !error.config?.skipAuth &&
    error.config?.headers.has('Authorization') &&
    message !== API_KEY_REJECTED_MESSAGE

  if (sessionRejected) await expireSession()

  throw new ApiError(
    status,
    message ?? (status ? `Error ${status} al contactar la API` : 'No se pudo contactar la API')
  )
})

/**
 * Llama a la API y devuelve el `data` del envelope. Lanza `ApiError` si la
 * respuesta no es 2xx o no trae `data`.
 */
export async function apiRequest<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.request<ApiEnvelope<T>>({ url: path, ...config })
  const body = response.data

  if (!body?.data) {
    throw new ApiError(response.status, body?.message ?? 'Respuesta vacía de la API')
  }
  return body.data
}

/**
 * Como apiRequest, pero para endpoints que no devuelven `data` en el envelope
 * — el POST público de OTP, que solo confirma el envío del código, y
 * endpoints autenticados de solo confirmación (ej. DELETE de una
 * asignación de ruta). Devuelve el `message` del envelope.
 */
export async function apiCall(path: string, config?: AxiosRequestConfig): Promise<string> {
  const response = await api.request<ApiEnvelope<unknown>>({ url: path, ...config })
  return response.data?.message ?? ''
}
