import { useEffect } from 'react'
import { Info, RotateCcw, TriangleAlert } from 'lucide-react'
import { AppShell } from '../../components/AppShell'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { SalesFileDropzone } from './SalesFileDropzone'
import { UploadSummaryCard } from './UploadSummaryCard'
import { useSalesUpload } from './useSalesUpload'

/**
 * RF-03 / HU-02 — importación manual del JSON de ventas exportado de
 * Efactsoft. Es el único punto de entrada de datos comerciales al CRM: no hay
 * integración en tiempo real con el ERP.
 *
 * El flujo exige confirmación explícita: se valida el archivo en el navegador
 * y recién después de que el admin confirma se envía al backend.
 */
export function ImportPage() {
  const {
    state,
    canStopWaiting,
    selectFile,
    requestConfirm,
    cancelConfirm,
    confirmUpload,
    retry,
    stopWaiting,
    reset,
  } = useSalesUpload()

  // Sin esto, soltar el JSON un poco fuera de la zona hace que el navegador
  // abra el archivo y el admin pierda la pantalla.
  useEffect(() => {
    const prevent = (e: DragEvent) => e.preventDefault()
    window.addEventListener('dragover', prevent)
    window.addEventListener('drop', prevent)
    return () => {
      window.removeEventListener('dragover', prevent)
      window.removeEventListener('drop', prevent)
    }
  }, [])

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <header>
          <h1 className="m-0 text-xl font-bold">Importar datos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Carga el archivo JSON de ventas exportado de Efactsoft para sincronizar clientes e
            historial comercial.
          </p>
        </header>

        {state.status === 'success' ? (
          <>
            <UploadSummaryCard summary={state.summary} />
            <div>
              <Button type="button" variant="outline" onClick={reset}>
                Importar otro archivo
              </Button>
            </div>
          </>
        ) : (
          <>
            <SalesFileDropzone state={state} onSelectFile={selectFile} onClear={reset} />

            {state.status === 'invalid' && (
              <Alert variant="destructive">
                <TriangleAlert />
                <AlertTitle>{state.reason}</AlertTitle>
                {state.detail && (
                  <AlertDescription>
                    <span className="font-mono text-xs">{state.detail}</span>
                  </AlertDescription>
                )}
              </Alert>
            )}

            {state.status === 'ready' && !state.deep && (
              <Alert>
                <Info />
                <AlertTitle>No se validó el contenido en el navegador</AlertTitle>
                <AlertDescription>
                  El archivo es demasiado grande para revisarlo aquí sin arriesgar la pestaña. El
                  servidor lo verificará al recibirlo.
                </AlertDescription>
              </Alert>
            )}

            {state.status === 'error' && (
              <Alert variant="destructive">
                <TriangleAlert />
                <AlertTitle>{state.failure.message}</AlertTitle>
                <AlertDescription>
                  {state.failure.detail && (
                    <span className="font-mono text-xs">{state.failure.detail}</span>
                  )}
                  {state.failure.retryable && (
                    <span className="mt-2 block">
                      <Button type="button" variant="outline" size="sm" onClick={retry}>
                        <RotateCcw />
                        Reintentar
                      </Button>
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {state.status === 'uploading' && (
              <Alert>
                <Spinner />
                <AlertTitle>Subiendo y procesando el archivo…</AlertTitle>
                <AlertDescription>
                  Puede tardar varios minutos. No cierres esta pestaña.
                  {canStopWaiting && (
                    <span className="mt-2 block">
                      <Button type="button" variant="outline" size="sm" onClick={stopWaiting}>
                        Dejar de esperar
                      </Button>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        La importación puede haberse aplicado de todos modos. Volver a cargar el
                        mismo archivo es seguro: el sistema actualiza en lugar de duplicar.
                      </span>
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {(state.status === 'ready' || state.status === 'confirming') && (
              <div>
                <Button type="button" onClick={requestConfirm}>
                  Importar al CRM
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {state.status === 'confirming' && (
        <ConfirmDialog
          title="Importar ventas al CRM"
          message={
            state.deep
              ? `Se importarán ${state.salesCount} ${state.salesCount === 1 ? 'venta' : 'ventas'} del archivo ${state.file.name}. Las ventas que ya existan se actualizarán, no se duplican.`
              : `Se enviará el archivo ${state.file.name} al servidor para su validación e importación. Las ventas que ya existan se actualizarán, no se duplican.`
          }
          confirmLabel="Importar"
          onConfirm={confirmUpload}
          onCancel={cancelConfirm}
        />
      )}
    </AppShell>
  )
}
