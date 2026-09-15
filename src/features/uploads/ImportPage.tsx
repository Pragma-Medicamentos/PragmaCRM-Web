import { useEffect, useState } from 'react'
import { Download, Info, RotateCcw, TriangleAlert } from 'lucide-react'
import { AppShell } from '../../components/AppShell'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { ImportStepper } from './ImportStepper'
import { SalesFileDropzone } from './SalesFileDropzone'
import { UploadSummaryCard } from './UploadSummaryCard'
import { downloadRejectionsCsv } from './rejectionsCsv'
import { useLastUpload } from './useLastUpload'
import { useSalesUpload } from './useSalesUpload'

/**
 * RF-03 / HU-02 — importación manual del JSON de ventas exportado de
 * Efactsoft. Es el único punto de entrada de datos comerciales al CRM: no hay
 * integración en tiempo real con el ERP.
 *
 * El flujo exige confirmación explícita: se valida el archivo en el navegador
 * y recién después de que el admin confirma se envía al backend.
 *
 * Estructura tomada del wireframe `1m` ("Importación JSON de Efactsoft"):
 * encabezado con la última carga, stepper de tres pasos, cuerpo según el paso
 * y una sola fila de acciones al pie, alineada a la derecha.
 */

const numberFormatter = new Intl.NumberFormat('es-SV')

const lastUploadFormatter = new Intl.DateTimeFormat('es-SV', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

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

  // Se vuelve a pedir la última carga cuando una importación termina bien.
  const [lastUploadKey, setLastUploadKey] = useState(0)
  const lastUpload = useLastUpload(lastUploadKey)

  useEffect(() => {
    if (state.status === 'success') setLastUploadKey((k) => k + 1)
  }, [state.status])

  // El diálogo sigue montado durante su animación de salida, cuando el estado
  // ya dejó de ser 'confirming'. Si el texto se derivara del estado, se vaciaría
  // a la vista; conservarlo evita ese parpadeo.
  const [confirmMessage, setConfirmMessage] = useState('')

  useEffect(() => {
    if (state.status !== 'confirming') return
    setConfirmMessage(
      state.deep
        ? `Se importarán ${numberFormatter.format(state.salesCount)} ${state.salesCount === 1 ? 'venta' : 'ventas'} del archivo ${state.file.name}. Las ventas que ya existan se actualizarán, no se duplican.`
        : `Se enviará el archivo ${state.file.name} al servidor para su validación e importación. Las ventas que ya existan se actualizarán, no se duplican.`
    )
  }, [state])

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

  const summary = state.status === 'success' ? state.summary : null
  const hasRejections =
    summary !== null && (summary.rejected > 0 || summary.rejections_truncated > 0)

  // Sin esto la fila quedaría vacía en 'idle' y 'validating', dejando un hueco
  // suelto bajo la zona de arrastre.
  const hasActions =
    state.status === 'ready' ||
    state.status === 'confirming' ||
    state.status === 'success' ||
    (state.status === 'uploading' && canStopWaiting) ||
    (state.status === 'error' && state.failure.retryable)

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="m-0 text-2xl font-bold">Carga manual de historial</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Archivo JSON exportado desde Efactsoft
            </p>
          </div>

          {/* Ausente mientras el endpoint no exista: la nota es opcional. */}
          {lastUpload && (
            <p className="font-mono text-xs text-muted-foreground">
              Última carga: {lastUploadFormatter.format(new Date(lastUpload.created_at))}
            </p>
          )}
        </header>

        <ImportStepper status={state.status} />

        {summary ? (
          <UploadSummaryCard summary={summary} />
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
                {state.failure.detail && (
                  <AlertDescription>
                    <span className="font-mono text-xs">{state.failure.detail}</span>
                  </AlertDescription>
                )}
              </Alert>
            )}

            {state.status === 'uploading' && (
              <Alert>
                <Spinner />
                <AlertTitle>Subiendo y procesando el archivo…</AlertTitle>
                <AlertDescription className="flex flex-col gap-2">
                  {/* Indeterminado a propósito: el backend no informa avance,
                      así que una barra con porcentaje sería inventada. */}
                  <Progress value={null} className="mt-1" />
                  <span>Puede tardar varios minutos. No cierres esta pestaña.</span>
                  {canStopWaiting && (
                    <span className="text-xs text-muted-foreground">
                      La importación puede haberse aplicado de todos modos. Volver a cargar el mismo
                      archivo es seguro: el sistema actualiza en lugar de duplicar.
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {/* Fila de acciones única al pie, como en el wireframe. */}
        {hasActions && (
          <div className="flex flex-wrap justify-end gap-2">
            {(state.status === 'ready' || state.status === 'confirming') && (
              <Button type="button" onClick={requestConfirm}>
                {state.deep
                  ? `Importar ${numberFormatter.format(state.salesCount)} ${state.salesCount === 1 ? 'venta' : 'ventas'} al CRM`
                  : 'Importar al CRM'}
              </Button>
            )}

            {state.status === 'uploading' && canStopWaiting && (
              <Button type="button" variant="outline" onClick={stopWaiting}>
                Dejar de esperar
              </Button>
            )}

            {state.status === 'error' && state.failure.retryable && (
              <Button type="button" onClick={retry}>
                <RotateCcw data-icon="inline-start" />
                Reintentar
              </Button>
            )}

            {summary && (
              <>
                {hasRejections && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => downloadRejectionsCsv(summary)}
                  >
                    <Download data-icon="inline-start" />
                    Descargar reporte
                  </Button>
                )}
                <Button type="button" onClick={reset}>
                  Importar otro archivo
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <AlertDialog
        open={state.status === 'confirming'}
        onOpenChange={(open) => {
          if (!open) cancelConfirm()
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Importar ventas al CRM</AlertDialogTitle>
            <AlertDialogDescription>{confirmMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUpload}>Importar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  )
}
