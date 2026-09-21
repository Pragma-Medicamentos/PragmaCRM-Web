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

// Gate de transporte, no de identidad: PragmaCRM-Api exige este header en
// toda ruta bajo /api/v1 salvo /api/health (presentation/middleware/apiKey.ts),
// por delante incluso de requireAuth. Sin él, cualquier llamada -incluido
// pedir el OTP de login- responde 401 "Invalid or missing API key".
const API_KEY = import.meta.env.VITE_API_KEY

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
      'x-api-key': API_KEY,
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
 * Como apiFetch, pero para endpoints que no devuelven `data` en el envelope
 * — el POST público de OTP, que solo confirma el envío del código, y
 * endpoints autenticados de solo confirmación (ej. DELETE de una
 * asignación de ruta). `token` es opcional: se omite el header
 * `Authorization` cuando no aplica. Devuelve el `message` del envelope.
 */
export async function apiCall(path: string, token: string | null, init?: RequestInit): Promise<string> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      'x-api-key': API_KEY,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  const body = (await response.json().catch(() => null)) as ApiEnvelope<unknown> | null

  if (!response.ok) {
    throw new ApiError(response.status, body?.message ?? `Error ${response.status} al contactar la API`)
  }
  return body?.message ?? ''
}
