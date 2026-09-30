import { useCallback, useEffect, useState } from 'react'
import { isRouteNotImplemented } from '../../lib/api/apiClient'
import { fetchSalesImportInProgress } from './uploadsApi'

/**
 * PCRM-169. Consulta si el servidor tiene un import activo.
 *
 * Se pide al montar la pantalla (otra pestaña pudo dejarlo corriendo) y de
 * nuevo cuando un POST responde que ya hay uno. Si el GET falla no se
 * bloquea el picker: un corte de red no debe impedir importar. Mientras
 * sigue en curso se vuelve a preguntar cada 15s, solo con GET, para soltar
 * el picker cuando termina — sin reintentar el POST.
 */
export function useSalesImportInProgress(): {
  inProgress: boolean
  /** Márcalo al recibir el 409 de import en curso, sin esperar al GET. */
  noteImportInProgress: () => void
  refresh: () => void
} {
  const [tick, setTick] = useState(0)
  const [inProgress, setInProgress] = useState(false)

  const refresh = useCallback(() => {
    setTick((n) => n + 1)
  }, [])

  const noteImportInProgress = useCallback(() => {
    setInProgress(true)
    setTick((n) => n + 1)
  }, [])

  useEffect(() => {
    let cancelled = false

    fetchSalesImportInProgress()
      .then((value) => {
        if (!cancelled) setInProgress(value.in_progress === true)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        // No se baja un lock ya conocido: la respuesta que sí llegó manda.
        if (!isRouteNotImplemented(err)) {
          console.warn('No se pudo consultar si hay una importación en curso:', err)
        }
      })

    return () => {
      cancelled = true
    }
  }, [tick])

  useEffect(() => {
    if (!inProgress) return
    const id = window.setInterval(refresh, 15_000)
    return () => window.clearInterval(id)
  }, [inProgress, refresh])

  return { inProgress, noteImportInProgress, refresh }
}
