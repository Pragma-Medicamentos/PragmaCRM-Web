import { useEffect, useState } from 'react'
import { isRouteNotImplemented } from '../../lib/api/apiClient'
import { fetchLastUpload } from './uploadsApi'
import type { LastUpload } from './uploads.types'

/**
 * Nota "Última carga: …" del encabezado (wireframe `1m`). Le dice al admin si
 * alguien más ya subió el archivo del día antes de que lo vuelva a subir.
 *
 * Es decorativa: si `GET /api/v1/uploads/sales/last` no existe todavía, o
 * falla por cualquier motivo, devuelve null y la nota no se dibuja. Nunca
 * bloquea ni interrumpe la importación, que es lo que la pantalla sí tiene que
 * dejar hacer.
 *
 * `refreshKey` la vuelve a pedir después de una importación exitosa.
 */
export function useLastUpload(refreshKey: number): LastUpload | null {
  const [lastUpload, setLastUpload] = useState<LastUpload | null>(null)

  useEffect(() => {
    let cancelled = false

    fetchLastUpload()
      .then((value) => {
        if (!cancelled) setLastUpload(value)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setLastUpload(null)
        // El 404 de ruta no implementada es el caso esperado hoy; el resto se
        // registra para no perder un fallo real detrás de una nota opcional.
        if (!isRouteNotImplemented(err)) {
          console.warn('No se pudo leer la última carga:', err)
        }
      })

    return () => {
      cancelled = true
    }
  }, [refreshKey])

  return lastUpload
}
