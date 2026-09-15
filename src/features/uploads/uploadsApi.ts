import { apiFetch } from '../../lib/api/apiClient'
import type { LastUpload, SalesUploadSummary } from './uploads.types'

/**
 * POST /api/v1/uploads/sales — requireAuth + requireRole(ADMIN).
 *
 * El campo del multipart debe llamarse exactamente 'file' (UPLOAD_FIELD_NAME
 * en `presentation/middleware/uploadJsonFile.ts` de la API).
 *
 * No se fija Content-Type a propósito: el navegador lo arma con el boundary
 * del FormData. `apiFetch` hace el spread de `init.headers` antes de forzar
 * `x-api-key` y `Authorization`, así que ambos llegan igual, y el `signal`
 * sobrevive al spread de `init`.
 */
export function uploadSalesFile(
  token: string | null,
  file: File,
  signal?: AbortSignal
): Promise<SalesUploadSummary> {
  const form = new FormData()
  form.append('file', file, file.name)

  return apiFetch<SalesUploadSummary>('/api/v1/uploads/sales', token, {
    method: 'POST',
    body: form,
    signal,
  })
}

/**
 * GET /api/v1/uploads/sales/last — última importación registrada.
 *
 * PENDIENTE DE BACKEND: la ruta aún no existe. Quien la consuma debe tratar el
 * 404 con `isRouteNotImplemented` y seguir sin la nota, no mostrar un error.
 */
export function fetchLastUpload(token: string | null): Promise<LastUpload> {
  return apiFetch<LastUpload>('/api/v1/uploads/sales/last', token)
}
