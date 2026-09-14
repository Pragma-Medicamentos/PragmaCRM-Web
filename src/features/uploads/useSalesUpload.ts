import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase/client'
import { toUploadFailure } from './uploadErrors'
import { uploadSalesFile } from './uploadsApi'
import { validateSalesFile } from './validateSalesFile'
import type { SalesUploadSummary, UploadFailure } from './uploads.types'

/** Datos del archivo ya validado, que viajan con el resto de los estados. */
interface ValidatedFile {
  file: File
  /** -1 si el archivo era demasiado grande para parsearlo en el navegador. */
  salesCount: number
  quotationsCount: number
  deep: boolean
}

export type SalesUploadState =
  | { status: 'idle' }
  | { status: 'validating'; file: File }
  | { status: 'invalid'; file: File; reason: string; detail?: string }
  | ({ status: 'ready' } & ValidatedFile)
  | ({ status: 'confirming' } & ValidatedFile)
  | ({ status: 'uploading' } & ValidatedFile)
  | { status: 'success'; file: File; summary: SalesUploadSummary }
  | ({ status: 'error'; failure: UploadFailure } & ValidatedFile)

/**
 * A los cuántos milisegundos de espera se ofrece "Dejar de esperar". La
 * transacción del backend puede tardar (TRANSACTION_TIMEOUT_MS = 120 s), así
 * que el botón no aparece de inmediato para no invitar a cortarla en vano.
 */
const STOP_WAITING_AFTER_MS = 30_000

/**
 * Flujo de importación del JSON del ERP: seleccionar → validar en el
 * navegador → confirmar → enviar → resultado.
 *
 * Estilo hecho a mano con useState/useCallback, igual que `useVendors.ts`
 * (este repo no usa react-query).
 */
export function useSalesUpload() {
  const [state, setState] = useState<SalesUploadState>({ status: 'idle' })
  const [canStopWaiting, setCanStopWaiting] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  // Espejo del estado para que los callbacks no dependan de él y no queden
  // closures obsoletas.
  const stateRef = useRef(state)
  stateRef.current = state

  // Aborta lo que quede vivo si el usuario navega fuera de la pantalla.
  useEffect(() => () => abortRef.current?.abort(), [])

  useEffect(() => {
    if (state.status !== 'uploading') {
      setCanStopWaiting(false)
      return
    }
    const timer = window.setTimeout(() => setCanStopWaiting(true), STOP_WAITING_AFTER_MS)
    return () => window.clearTimeout(timer)
  }, [state.status])

  const send = useCallback(async (validated: ValidatedFile) => {
    const controller = new AbortController()
    abortRef.current = controller
    setState({ status: 'uploading', ...validated })

    try {
      const { data } = await supabase.auth.getSession()
      const summary = await uploadSalesFile(
        data.session?.access_token ?? null,
        validated.file,
        controller.signal
      )
      setState({ status: 'success', file: validated.file, summary })
    } catch (err: unknown) {
      // Las dos ramas comprueban que se siga en 'uploading' antes de escribir:
      // `reset()` aborta y deja 'idle', y sin esta guarda la promesa
      // rechazada llegaría después y pisaría ese 'idle'.

      // El abort de fetch llega como DOMException, no como ApiError.
      if (err instanceof DOMException && err.name === 'AbortError') {
        setState((prev) => (prev.status === 'uploading' ? { status: 'ready', ...validated } : prev))
        return
      }
      setState((prev) =>
        prev.status === 'uploading'
          ? { status: 'error', failure: toUploadFailure(err), ...validated }
          : prev
      )
    } finally {
      abortRef.current = null
    }
  }, [])

  const selectFile = useCallback(async (file: File) => {
    setState({ status: 'validating', file })
    const result = await validateSalesFile(file)
    setState(
      result.ok
        ? {
            status: 'ready',
            file,
            salesCount: result.salesCount,
            quotationsCount: result.quotationsCount,
            deep: result.deep,
          }
        : { status: 'invalid', file, reason: result.reason, detail: result.detail }
    )
  }, [])

  const requestConfirm = useCallback(() => {
    setState((prev) => (prev.status === 'ready' ? { ...prev, status: 'confirming' } : prev))
  }, [])

  const cancelConfirm = useCallback(() => {
    setState((prev) => (prev.status === 'confirming' ? { ...prev, status: 'ready' } : prev))
  }, [])

  const confirmUpload = useCallback(() => {
    const current = stateRef.current
    if (current.status !== 'confirming') return
    const { file, salesCount, quotationsCount, deep } = current
    void send({ file, salesCount, quotationsCount, deep })
  }, [send])

  const retry = useCallback(() => {
    const current = stateRef.current
    if (current.status !== 'error') return
    const { file, salesCount, quotationsCount, deep } = current
    void send({ file, salesCount, quotationsCount, deep })
  }, [send])

  /**
   * Deja de esperar la respuesta. NO cancela la importación: una vez enviado
   * el cuerpo, la transacción del backend se confirma igual. Volver a cargar
   * el mismo archivo es seguro porque el endpoint es idempotente.
   */
  const stopWaiting = useCallback(() => abortRef.current?.abort(), [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setState({ status: 'idle' })
  }, [])

  return {
    state,
    canStopWaiting,
    selectFile,
    requestConfirm,
    cancelConfirm,
    confirmUpload,
    retry,
    stopWaiting,
    reset,
  }
}
