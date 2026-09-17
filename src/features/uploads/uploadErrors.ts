import { ApiError } from '../../lib/api/apiClient'
import { MAX_UPLOAD_MB } from './validateSalesFile'
import type { UploadFailure } from './uploads.types'

/**
 * Traducción de los errores de POST /api/v1/uploads/sales.
 *
 * El endpoint responde en inglés por convención del backend; los middlewares
 * de auth (requireAuth / requireRole) responden en español. Las llaves de
 * BY_MESSAGE son el texto LITERAL del backend: si allá cambia una cadena,
 * aquí deja de haber coincidencia y se cae al mensaje por status, que también
 * es específico. Ver `docs/Endpoint_Subida_JSON_ERP.md` en PragmaCRM-Api.
 */
const BY_MESSAGE: Record<string, string> = {
  // --- 401: gate de transporte ---
  'Invalid or missing API key':
    'La aplicación no pudo autenticarse con la API. Avisa al equipo técnico: la clave de acceso (x-api-key) es inválida o no se está enviando.',

  // Verificado contra la API local: un token malformado o vencido responde
  // con este texto en inglés, que no figura en `Endpoint_Subida_JSON_ERP.md`
  // (ahí solo aparece el 'Sesión no válida o ausente' de cuando falta el header).
  'Invalid or expired session': 'Tu sesión no es válida o expiró. Vuelve a iniciar sesión.',

  // El 413 no se mapea por mensaje a propósito: el texto del backend lleva el
  // número adentro ("The file exceeds the 100 MB limit.") y dejaría de
  // coincidir en cuanto alguien mueva UPLOAD_MAX_FILE_SIZE_MB. Lo resuelve
  // BY_STATUS[413], que arma el mensaje con el tope configurado aquí.

  // --- 400: multer ---
  'Only one file can be uploaded at a time.': 'Solo se puede subir un archivo a la vez.',
  'Unexpected file field. The file must be sent in the "file" field.':
    'La API no reconoció el campo del archivo. Avisa al equipo técnico.',
  'The file must have a .json extension.': 'El archivo debe tener extensión .json.',
  'The file could not be read. Send it as multipart/form-data in the "file" field.':
    'La API no pudo leer el archivo. Vuelve a intentarlo; si persiste, avisa al equipo técnico.',
  'No file received. Send the JSON in the "file" field as multipart/form-data.':
    'La API no recibió ningún archivo. Vuelve a seleccionarlo e inténtalo de nuevo.',

  // --- 400 / 422: contenido ---
  'The file is not valid JSON.': 'El archivo no es un JSON válido.',
  'The file must contain an array of sales at the root.':
    'El archivo debe contener un arreglo de ventas en la raíz. Si el ERP exportó { "ventas": [ … ] }, hay que enviar únicamente el contenido de "ventas".',
  'The file does not contain any sales.': 'El archivo no contiene ninguna venta.',
  'The file only contains quotations (estado 1); there are no confirmed sales to import.':
    'El archivo solo contiene cotizaciones (estado 1); no hay ventas confirmadas para importar.',
  'No sale in the file has the expected format.':
    'Ninguna venta del archivo tiene el formato esperado. Verifica que sea el export de ventas de Efactsoft.',

  // --- 409: un reintento entró mientras la transacción original seguía viva ---
  'Duplicate record.':
    'Ya hay una carga de este archivo en proceso. Espera unos segundos y vuelve a intentarlo.',

  // --- 500 ---
  'Internal server error':
    'Error interno del servidor al procesar el archivo. Si el archivo cubre muchos meses, prueba a dividirlo por rangos de fecha; si no, avisa al equipo técnico.',

  // --- Mensajes que la API ya envía en español (requireAuth / requireRole).
  // Se listan como entradas identidad en vez de detectarlos por heurística:
  // 'Acceso denegado para este rol' no lleva ningún acento y una heurística
  // de acentos lo dejaría pasar de largo.
  'Sesión no válida o ausente': 'Tu sesión no es válida o expiró. Vuelve a iniciar sesión.',
  'El usuario no está registrado en el CRM': 'El usuario no está registrado en el CRM.',
  'El usuario está deshabilitado': 'El usuario está deshabilitado.',
  'El usuario no tiene un rol válido': 'El usuario no tiene un rol válido.',
  'Acceso denegado para este rol': 'Tu rol no tiene permiso para importar datos.',
  'Servicio de autenticación no disponible':
    'El servicio de autenticación no está disponible en este momento. Intenta de nuevo en unos minutos.',
}

/**
 * Respaldo por status. Hace falta de verdad: nginx responde 413 y 504 con
 * HTML, no con el envelope `{ success, message }`, y `apiFetch` hace
 * `response.json().catch(() => null)`, así que sin esta tabla el usuario
 * vería "Error 413 al contactar la API".
 */
const BY_STATUS: Record<number, string> = {
  0: 'No se pudo contactar la API. Revisa tu conexión y que el servicio esté disponible.',
  401: 'Tu sesión no es válida o expiró. Vuelve a iniciar sesión.',
  403: 'No tienes permiso para importar datos.',
  404: 'El endpoint de carga no está disponible en esta versión de la API.',
  409: 'Ya hay una carga de este archivo en proceso. Espera unos segundos y vuelve a intentarlo.',
  413: `El archivo supera el límite de ${MAX_UPLOAD_MB} MB.`,
  422: 'El contenido del archivo no se pudo procesar.',
  500: 'Error interno del servidor al procesar el archivo.',
  502: 'El servidor no respondió. Intenta de nuevo en unos minutos.',
  503: 'El servicio no está disponible en este momento. Intenta de nuevo en unos minutos.',
  // Ojo: no invita a reintentar a ciegas. La transacción pudo haberse
  // confirmado aunque el proxy cortara la espera.
  504: 'El servidor tardó demasiado en responder. La importación pudo haberse aplicado de todos modos: revísala antes de reintentar.',
}

const RETRYABLE_STATUS = new Set([0, 409, 500, 502, 503, 504])

/** Convierte el error de la API en algo mostrable en español. */
export function toUploadFailure(err: unknown): UploadFailure {
  if (!(err instanceof ApiError)) {
    return {
      message: 'Ocurrió un error inesperado al importar el archivo.',
      detail: err instanceof Error ? err.message : undefined,
      retryable: true,
    }
  }

  const mapped = BY_MESSAGE[err.message]
  if (mapped) {
    return {
      message: mapped,
      detail: mapped === err.message ? undefined : err.message,
      retryable: RETRYABLE_STATUS.has(err.status),
    }
  }

  return {
    message: BY_STATUS[err.status] ?? `Error ${err.status} al contactar la API.`,
    detail: err.message,
    retryable: RETRYABLE_STATUS.has(err.status),
  }
}
