import type { SalesUploadSummary } from './uploads.types'

/**
 * Reporte descargable de las ventas rechazadas (botón "Descargar reporte" del
 * wireframe `1m`).
 *
 * Se arma en el navegador con lo que ya devolvió la importación: no hay
 * endpoint de reporte y tampoco hace falta, porque el resumen viaja completo
 * en la respuesta.
 */

/** Separador `;`: Excel en configuración regional es-SV no parte por comas. */
const SEPARATOR = ';'

/**
 * Prefijo que fuerza a Excel a abrir el archivo como UTF-8. Sin él, "código"
 * y "número" llegan con la codificación rota.
 */
const BOM = '﻿'

function escapeCell(value: string): string {
  // Comillas dobles duplicadas y celda entrecomillada si trae separador,
  // comillas o saltos de línea (RFC 4180).
  const needsQuotes = /[";\r\n]/.test(value)
  const escaped = value.replace(/"/g, '""')
  return needsQuotes ? `"${escaped}"` : escaped
}

function toRow(cells: string[]): string {
  return cells.map(escapeCell).join(SEPARATOR)
}

/** Contenido del CSV, sin el BOM. Exportado aparte para poder probarlo. */
export function buildRejectionsCsv(summary: SalesUploadSummary): string {
  const rows = [
    // "Línea" es la etiqueta del wireframe; el valor es `index`, la posición
    // (base 0) del registro dentro del arreglo del archivo.
    toRow(['Línea', 'Venta ERP', 'Motivo']),
    ...summary.rejections.map((rejection) =>
      toRow([
        String(rejection.index),
        rejection.erp_sale_id === null ? '' : String(rejection.erp_sale_id),
        rejection.reason,
      ])
    ),
  ]

  // El backend trunca la lista a 100. Sin este aviso el archivo parecería
  // completo y alguien daría por corregidas ventas que nunca vio.
  if (summary.rejections_truncated > 0) {
    rows.push('')
    rows.push(
      toRow([
        `Se listan ${summary.rejections.length} de ${summary.rejected} ventas rechazadas. Las ${summary.rejections_truncated} restantes quedaron registradas en el servidor; pídeselas al equipo técnico con el identificador de carga ${summary.upload_id}.`,
      ])
    )
  }

  return rows.join('\r\n')
}

export function rejectionsFileName(summary: SalesUploadSummary): string {
  return `rechazos-${summary.upload_id}.csv`
}

/** Dispara la descarga del reporte en el navegador. */
export function downloadRejectionsCsv(summary: SalesUploadSummary): void {
  const blob = new Blob([BOM + buildRejectionsCsv(summary)], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = rejectionsFileName(summary)
  document.body.appendChild(link)
  link.click()
  link.remove()

  // Sin esto el blob queda retenido hasta que se recargue la pestaña.
  URL.revokeObjectURL(url)
}
