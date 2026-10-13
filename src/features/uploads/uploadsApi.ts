import { apiRequest } from '../../lib/api/apiClient'
import type { LastUpload, SalesImportInProgress, SalesUploadSummary } from './uploads.types'

/**
 * POST /api/v1/uploads/sales — requireAuth + requireRole(ADMIN).
 *
 * El campo del multipart debe llamarse exactamente 'file' (UPLOAD_FIELD_NAME
 * en `presentation/middleware/uploadJsonFile.ts` de la API).
 *
 * No se fija Content-Type a propósito: con un FormData, Axios deja que el
 * navegador lo arme con el boundary.
 */
export function uploadSalesFile(file: File, signal?: AbortSignal): Promise<SalesUploadSummary> {
  const form = new FormData()
  form.append('file', file, file.name)

  return apiRequest<SalesUploadSummary>('/api/v1/uploads/sales', {
    method: 'POST',
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
  return apiRequest<LastUpload>('/api/v1/uploads/sales/last')
}

/**
 * GET /api/v1/uploads/sales/in-progress — requireAuth + requireRole(ADMIN).
 * Dice si el servidor todavía tiene un import activo (advisory lock o
 * upload staged/processing), aunque esta pestaña se haya cerrado.
 */
export function fetchSalesImportInProgress(): Promise<SalesImportInProgress> {
  return apiRequest<SalesImportInProgress>('/api/v1/uploads/sales/in-progress')
}
