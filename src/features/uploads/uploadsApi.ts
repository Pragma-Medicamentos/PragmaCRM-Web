import { request } from '../../lib/api/apiClient'
import type { LastUpload, SalesUploadSummary } from './uploads.types'

/**
 * POST /api/v1/uploads/sales — requireAuth + requireRole(ADMIN).
 *
 * El campo del multipart debe llamarse exactamente 'file' (UPLOAD_FIELD_NAME
 * en `presentation/middleware/uploadJsonFile.ts` de la API).
 *
 * No se fija Content-Type a propósito: con un FormData el navegador lo arma
 * con el boundary. `x-api-key` y `Authorization` los ponen la instancia y sus
 * interceptores; el `signal` se pasa tal cual.
 */
export function uploadSalesFile(file: File, signal?: AbortSignal): Promise<SalesUploadSummary> {
  const form = new FormData()
  form.append('file', file, file.name)

  return request<SalesUploadSummary>({
    method: 'POST',
    url: '/api/v1/uploads/sales',
    data: form,
    signal,
  })
}

/**
 * GET /api/v1/uploads/sales/last — última importación registrada.
 *
 * PENDIENTE DE BACKEND: la ruta aún no existe. Quien la consuma debe tratar el
 * 404 con `isRouteNotImplemented` y seguir sin la nota, no mostrar un error.
 */
export function fetchLastUpload(): Promise<LastUpload> {
  return request<LastUpload>({ url: '/api/v1/uploads/sales/last' })
}
