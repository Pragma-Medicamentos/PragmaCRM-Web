import { useCallback, useEffect, useRef, useState } from 'react'
import { isRequestCanceled } from '../../lib/api/apiClient'
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
 * Flujo de importación del JSON del ERP: seleccionar → validar en el
 * navegador → confirmar → enviar → resultado.
 *
 * Estilo hecho a mano con useState/useCallback, igual que `useVendors.ts`
 * (este repo no usa react-query).
 */
export function useSalesUpload() {
  const [state, setState] = useState<SalesUploadState>({ status: 'idle' })

  const abortRef = useRef<AbortController | null>(null)
  // Espejo del estado para que los callbacks no dependan de él y no queden
  // closures obsoletas.
  const stateRef = useRef(state)
  stateRef.current = state

  // Aborta lo que quede vivo si el usuario navega fuera de la pantalla.
  useEffect(() => () => abortRef.current?.abort(), [])

  const send = useCallback(async (validated: ValidatedFile) => {
    const controller = new AbortController()
    abortRef.current = controller
    setState({ status: 'uploading', ...validated })

    try {
      const summary = await uploadSalesFile(validated.file, controller.signal)
      setState({ status: 'success', file: validated.file, summary })
    } catch (err: unknown) {
      // El abort llega como cancelación de Axios, no como ApiError. Solo lo
      // dispara `reset()` —que ya deja 'idle'— o el desmontaje de la pantalla,
      // así que aquí no hay nada que escribir: hacerlo pisaría ese 'idle'.
      if (isRequestCanceled(err)) return

      // La guarda comprueba que se siga en 'uploading' por el mismo motivo.
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

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setState({ status: 'idle' })
  }, [])

  return {
    state,
    selectFile,
    requestConfirm,
    cancelConfirm,
    confirmUpload,
    retry,
    reset,
  }
}
