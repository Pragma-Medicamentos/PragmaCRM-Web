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

const API_URL = import.meta.env.VITE_API_URL

/**
 * Llama a la API adjuntando el token de Clerk como Bearer. Lanza ApiError
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
