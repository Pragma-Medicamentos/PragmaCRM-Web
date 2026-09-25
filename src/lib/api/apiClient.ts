import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import { clearLegacyAuthStorage } from '../auth/legacyAuthStorage'
import { notifySessionEnded } from '../auth/sessionEvents'

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
     * No intenta refrescar la cookie ni cierra la sesión ante un 401.
     * Lo usan el OTP (público), el propio refresh y el logout.
     */
    skipAuth?: boolean
    /** Marca interna: este request ya se reintentó tras un refresh. */
    _retriedAfterRefresh?: boolean
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
 * `x-api-key`, la cookie de sesión (credentials) y el refresh viven en un
 * solo lugar. El access token no se lee ni se manda: lo pone la API en una
 * cookie HttpOnly.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'x-api-key': import.meta.env.VITE_API_KEY },
  withCredentials: true,
})

const REFRESH_PATH = '/api/v1/auth/refresh'

// Hubo una respuesta autenticada en esta pestaña. Sirve para distinguir un
// 401 de "nunca hubo sesión" (abrir / sin cookie) de una sesión que la API
// dejó de aceptar.
let hadSession = false

api.interceptors.response.use((response) => {
  if (!response.config.skipAuth) hadSession = true
  return response
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

/** Logout voluntario: limpia residuo local y avisa, sin marcarlo como expiración. */
export function abandonSession(): void {
  hadSession = false
  sessionExpired = false
  clearLegacyAuthStorage()
  notifySessionEnded()
}

// Varias peticiones en vuelo (el planificador lanza una por ruta) pueden
// recibir 401 a la vez; comparten un solo cierre de sesión.
let signingOut: Promise<unknown> | null = null

function expireSession(): Promise<unknown> {
  if (hadSession) sessionExpired = true
  hadSession = false
  clearLegacyAuthStorage()
  // La cookie puede seguir viva si el access venció y el refresh falló.
  // El logout es best-effort y no vuelve a entrar a este interceptor.
  signingOut ??= api
    .request({ url: '/api/v1/auth/logout', method: 'POST', skipAuth: true })
    .catch(() => undefined)
    .finally(() => {
      signingOut = null
      notifySessionEnded()
    })
  return signingOut
}

let refreshing: Promise<void> | null = null

function refreshSession(): Promise<void> {
  refreshing ??= api
    .request({ url: REFRESH_PATH, method: 'POST', skipAuth: true })
    .then(() => {
      hadSession = true
    })
    .finally(() => {
      refreshing = null
    })
  return refreshing
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

  const config = error.config as InternalAxiosRequestConfig | undefined
  const sessionRejected =
    status === 401 && !config?.skipAuth && message !== API_KEY_REJECTED_MESSAGE

  if (sessionRejected && config && !config._retriedAfterRefresh) {
    config._retriedAfterRefresh = true
    try {
      await refreshSession()
    } catch {
      await expireSession()
      throw new ApiError(
        status,
        message ?? (status ? `Error ${status} al contactar la API` : 'No se pudo contactar la API')
      )
    }
    return api.request(config)
  } else if (sessionRejected && hadSession) {
    await expireSession()
  }

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
