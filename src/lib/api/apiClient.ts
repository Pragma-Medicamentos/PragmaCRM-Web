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

const API_URL = import.meta.env.VITE_API_URL

/**
 * Llama a la API adjuntando el access token de Supabase como Bearer. Lanza ApiError
 * con el `status` HTTP y el `message` del envelope ({ success, message,
 * data?, errors? }) para que el llamador distinga 401 (sin sesión válida)
 * de 403 (sesión válida, usuario sin permiso para operar).
 */
export async function apiFetch<T>(path: string, token: string | null, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null

  if (!response.ok) {
    throw new ApiError(response.status, body?.message ?? `Error ${response.status} al contactar la API`)
  }
  if (!body?.data) {
    throw new ApiError(response.status, body?.message ?? 'Respuesta vacía de la API')
  }
  return body.data
}

/**
 * Como apiFetch, pero para endpoints públicos que no devuelven `data` — hoy
 * solo POST /api/v1/auth/otp, que únicamente confirma el envío del código.
 * Devuelve el `message` del envelope.
 */
export async function apiCall(path: string, init?: RequestInit): Promise<string> {
  const response = await fetch(`${API_URL}${path}`, init)
  const body = (await response.json().catch(() => null)) as ApiEnvelope<unknown> | null

  if (!response.ok) {
    throw new ApiError(response.status, body?.message ?? `Error ${response.status} al contactar la API`)
  }
  return body?.message ?? ''
}
