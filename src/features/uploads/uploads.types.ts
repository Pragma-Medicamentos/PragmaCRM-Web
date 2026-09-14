/**
 * Contrato de POST /api/v1/uploads/sales (RF-03, HU-02).
 *
 * Fuente de verdad: PragmaCRM-Api `src/presentation/uploads/uploads.controller.ts`.
 * El envelope no transforma las llaves, así que se preservan en snake_case
 * igual que en `vendors.types.ts`.
 */

export interface SaleRejection {
  /** Posición (base 0) dentro del arreglo del archivo. */
  index: number
  erp_sale_id: number | null
  /**
   * Texto técnico en inglés que produce el esquema de zod del backend
   * (`campo: mensaje`). No se traduce: el equipo del ERP necesita verlo igual
   * que aparece en los logs de la API.
   */
  reason: string
}

export interface UploadRange {
  /** `YYYY-MM-DD`, o null si ninguna venta traía fecha parseable. */
  from: string | null
  to: string | null
}

export interface UploadWarnings {
  sales_without_customer: number
  sales_without_user: number
  quotations_skipped: number
}

export interface SalesUploadSummary {
  upload_id: string
  /** Entradas que traía el archivo, incluidas las cotizaciones. */
  sales_received: number
  accepted: number
  rejected: number
  inserted: number
  updated: number
  sync_failed: number
  range: UploadRange
  /** El backend trunca esta lista a 100 elementos. */
  rejections: SaleRejection[]
  rejections_truncated: number
  warnings: UploadWarnings
}

/** Resultado de la validación que corre en el navegador antes de enviar nada. */
export type FileValidation =
  | {
      ok: true
      /** -1 cuando el archivo era demasiado grande para parsearlo aquí. */
      salesCount: number
      quotationsCount: number
      /** false = solo se validó extensión, tamaño y primer carácter. */
      deep: boolean
    }
  | { ok: false; reason: string; detail?: string }

export interface UploadFailure {
  /** Mensaje en español, listo para mostrar. */
  message: string
  /** Texto crudo del backend, para soporte. */
  detail?: string
  retryable: boolean
}
