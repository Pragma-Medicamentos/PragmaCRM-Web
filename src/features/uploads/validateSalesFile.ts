import type { FileValidation } from './uploads.types'

/**
 * Validación previa del archivo del ERP, en el navegador.
 *
 * REGLA DE ORO: aquí solo se bloquea lo que el servidor también bloquea, con
 * la traducción al español del mismo mensaje. Una regla más estricta que la
 * del backend rechazaría un archivo que Efactsoft considera válido y no
 * habría forma de saltarla desde la UI.
 *
 * El espejo del lado de la API vive en `src/services/salesStaging.service.ts`
 * (parseo del archivo) y en `presentation/middleware/uploadJsonFile.ts`
 * (extensión y tamaño). Si allá cambia una regla, hay que cambiarla aquí.
 */

/**
 * Tope de peso, en MB. Espejo de UPLOAD_MAX_FILE_SIZE_MB en el .env de
 * PragmaCRM-Api, que es quien manda: este chequeo solo evita subir 100 MB
 * para que la API responda 413. Va por env y no hardcodeado justamente para
 * que ambos lados se puedan mover juntos en cada despliegue.
 */
export const MAX_UPLOAD_MB = (() => {
  const raw = Number(import.meta.env.VITE_UPLOAD_MAX_FILE_SIZE_MB)
  return Number.isFinite(raw) && raw > 0 ? raw : 100
})()

export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024

/**
 * Por encima de este tamaño no se hace JSON.parse en el navegador: 100 MB de
 * texto se vuelven ~1 GB de objetos JS y pueden tumbar la pestaña. Se hace
 * solo el chequeo estructural barato y el servidor queda de autoridad sobre
 * el contenido. El export real de Efactsoft ronda los 5.5 MB (346 ventas),
 * así que este techo casi nunca aplica.
 */
export const DEEP_PARSE_MAX_BYTES = 25 * 1024 * 1024

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB']

export function formatBytes(bytes: number): string {
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(value < 10 && unit > 0 ? 1 : 0)} ${BYTE_UNITS[unit]}`
}

/**
 * Cede dos frames para que el estado "Validando…" alcance a pintarse antes de
 * que JSON.parse bloquee el hilo principal.
 */
function yieldToPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function validateSalesFile(file: File): Promise<FileValidation> {
  if (!file.name.toLowerCase().endsWith('.json')) {
    return { ok: false, reason: 'El archivo debe tener extensión .json.' }
  }

  if (file.size === 0) {
    return { ok: false, reason: 'El archivo está vacío.' }
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      reason: `El archivo supera el límite de ${MAX_UPLOAD_MB} MB.`,
      detail: `Pesa ${formatBytes(file.size)}. Pide al ERP exportar un rango de fechas más corto.`,
    }
  }

  let text: string
  try {
    text = await file.text()
  } catch {
    return { ok: false, reason: 'No se pudo leer el archivo. Vuelve a seleccionarlo.' }
  }

  // Chequeo barato de la raíz, antes de gastar memoria en el parseo: el
  // backend exige un arreglo, no `{ "ventas": [ ... ] }` ni un objeto suelto.
  const firstChar = text.trimStart()[0]
  if (firstChar !== '[') {
    return {
      ok: false,
      reason: 'El archivo debe contener un arreglo de ventas en la raíz.',
      detail:
        firstChar === '{'
          ? 'Se recibió un objeto. Si el ERP exportó { "ventas": [ … ] }, hay que enviar únicamente el contenido de "ventas".'
          : undefined,
    }
  }

  if (file.size > DEEP_PARSE_MAX_BYTES) {
    return { ok: true, salesCount: -1, quotationsCount: 0, deep: false }
  }

  await yieldToPaint()

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (err) {
    return {
      ok: false,
      reason: 'El archivo no es un JSON válido.',
      // A diferencia del backend, aquí el detalle sí aporta: dice en qué
      // posición del archivo se rompió el parseo.
      detail: err instanceof Error ? err.message : undefined,
    }
  }

  if (!Array.isArray(parsed)) {
    return { ok: false, reason: 'El archivo debe contener un arreglo de ventas en la raíz.' }
  }

  if (parsed.length === 0) {
    return { ok: false, reason: 'El archivo no contiene ninguna venta.' }
  }

  // Solo se cuenta la forma mínima. El esquema completo de cada venta lo
  // valida el backend, que rechaza venta por venta y aun así responde 201.
  let withVenta = 0
  let quotations = 0
  for (const item of parsed) {
    if (!isPlainObject(item)) continue
    const venta = item.venta
    if (!isPlainObject(venta)) continue
    withVenta += 1
    if (venta.estado === 1) quotations += 1
  }

  if (withVenta === 0) {
    return {
      ok: false,
      reason: 'Ninguna venta del archivo tiene el formato esperado.',
      detail: 'Cada elemento debe ser { "venta": { … }, "detalle": [ … ] }.',
    }
  }

  if (quotations === parsed.length) {
    return {
      ok: false,
      reason:
        'El archivo solo contiene cotizaciones (estado 1); no hay ventas confirmadas para importar.',
    }
  }

  return { ok: true, salesCount: parsed.length, quotationsCount: quotations, deep: true }
}
