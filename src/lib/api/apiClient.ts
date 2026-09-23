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

declare module 'axios' {
  interface AxiosRequestConfig {
    /**
     * Endpoint público (hoy solo POST /api/v1/auth/otp): no se le adjunta el
     * Bearer y un 401 no cierra la sesión.
     */
    skipAuth?: boolean
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

/** True si la petición se canceló con un AbortSignal (no es un fallo de la API). */
export function isRequestCanceled(err: unknown): boolean {
  return axios.isCancel(err)
}

// Gate de transporte, no de identidad: PragmaCRM-Api exige este header en
// toda ruta bajo /api/v1 salvo /api/health (presentation/middleware/apiKey.ts),
// por delante incluso de requireAuth. Sin él, cualquier llamada -incluido
// pedir el OTP de login- responde 401 "Invalid or missing API key".
const API_KEY = import.meta.env.VITE_API_KEY

// Ese mismo 401 NO significa sesión inválida: es una clave mal configurada, y
// cerrar la sesión por eso dejaría al admin en un bucle de login sin salida.
const INVALID_API_KEY_MESSAGE = 'Invalid or missing API key'

/**
 * Única instancia HTTP del dashboard: toda petición a PragmaCRM-Api pasa por
 * aquí (directo o vía `request`/`requestMessage`). Los interceptores de abajo
 * ponen el Bearer y tratan la sesión vencida; los módulos `*Api.ts` no
 * manejan tokens.
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'x-api-key': API_KEY },
})

apiClient.interceptors.request.use(async (config) => {
  if (config.skipAuth) return config

  // getSession() devuelve la sesión ya refrescada si el access token está por
  // vencer, así que un 401 posterior sí significa sesión inválida de verdad.
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (session) config.headers.set('Authorization', `Bearer ${session.access_token}`)
  return config
})

// La marca la lee useCurrentAppUser al recibir el SIGNED_OUT que provoca el
// cierre de sesión de abajo, para que /login explique por qué volvió.
let sessionExpired = false

/** Devuelve (y limpia) si el último cierre de sesión fue por sesión vencida. */
export function consumeSessionExpired(): boolean {
  const value = sessionExpired
  sessionExpired = false
  return value
}

// Varias peticiones en vuelo pueden recibir 401 a la vez: una sola limpieza.
let signingOut: Promise<unknown> | null = null

function expireSession(): Promise<unknown> {
  sessionExpired = true
  // scope 'local': la sesión ya es inválida en el servidor, no hace falta (ni
  // sirve) avisarle. Al limpiar el storage, onAuthStateChange emite
  // SIGNED_OUT y AdminRoute redirige a /login sin recargar la página.
  signingOut ??= supabase.auth.signOut({ scope: 'local' }).finally(() => {
    signingOut = null
  })
  return signingOut
}

apiClient.interceptors.response.use(undefined, async (error: unknown) => {
  if (!axios.isAxiosError(error) || axios.isCancel(error)) throw error

  // Sin `response` = la petición ni llegó (red caída, CORS, API apagada):
  // status 0, que uploadErrors ya traduce.
  const status = error.response?.status ?? 0
  const body = error.response?.data as ApiEnvelope<unknown> | null | undefined
  const message =
    body?.message ??
    (status === 0 ? 'No se pudo contactar la API' : `Error ${status} al contactar la API`)

  // Solo 401: un 403 (usuario válido sin permiso) volvería a /login y entraría
  // en bucle, y un 503 (JWKS caído) es transitorio, no una sesión mala.
  const sentBearer = Boolean(error.config?.headers?.Authorization)
  if (status === 401 && sentBearer && !error.config?.skipAuth && message !== INVALID_API_KEY_MESSAGE) {
    await expireSession()
  }

  throw new ApiError(status, message)
})

/**
 * Llama a la API y devuelve el `data` del envelope. Lanza ApiError con el
 * `status` HTTP y el `message` del envelope ({ success, message, data?,
 * errors? }) para que el llamador distinga 401 (sin sesión válida) de 403
 * (sesión válida, usuario sin permiso para operar).
 */
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.request<ApiEnvelope<T>>(config)
  const body = response.data

  if (!body?.data) {
    throw new ApiError(response.status, body?.message ?? 'Respuesta vacía de la API')
  }
  return body.data
}

/**
 * Como `request`, pero para endpoints públicos que no devuelven `data` — hoy
 * solo POST /api/v1/auth/otp, que únicamente confirma el envío del código.
 * Devuelve el `message` del envelope.
 */
export async function requestMessage(config: AxiosRequestConfig): Promise<string> {
  const response = await apiClient.request<ApiEnvelope<unknown>>({ ...config, skipAuth: true })
  return response.data?.message ?? ''
}
