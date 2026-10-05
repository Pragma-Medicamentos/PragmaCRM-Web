import type { MetricsRange } from './metrics.types'

/*
 * Enlaces de las métricas de producto (PCRM-177). El periodo viaja en la URL
 * con los mismos nombres del panel (?desde=&hasta=), para que una métrica
 * abierta desde el ranking llegue con el periodo que se estaba mirando.
 */

export const NO_MOVEMENT_PATH = '/metricas/productos/sin-movimiento'

/**
 * `:id` es `erp_product_id`: un entero positivo. Lo que no lo sea no se le
 * pregunta al API — es un enlace mal armado, no un producto que falte.
 */
export function parseProductId(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

export function periodSearch(range: MetricsRange): string {
  return `?desde=${range.from}&hasta=${range.to}`
}

/** Sin `range` el destino resuelve su propio periodo por defecto (el mes en curso). */
export function productMetricsPath(productId: number, range?: MetricsRange): string {
  return `/productos/${productId}/metricas${range ? periodSearch(range) : ''}`
}

export function noMovementPath(range?: MetricsRange): string {
  return `${NO_MOVEMENT_PATH}${range ? periodSearch(range) : ''}`
}
