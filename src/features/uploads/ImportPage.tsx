import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Download, FileUp, Info, RotateCcw, TriangleAlert, X } from 'lucide-react'
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
import { useHasContentBelow } from './useHasContentBelow'
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
    selectFile,
    requestConfirm,
    cancelConfirm,
    confirmUpload,
    retry,
    reset,
  } = useSalesUpload()

  const contentRef = useRef<HTMLDivElement>(null)
  const hasContentBelow = useHasContentBelow(contentRef)

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
        : `Se enviará el archivo ${state.file.name} al servidor para su validación e importación. Las ventas que ya existan se actualizarán, no se duplican.`,
    )
  }, [state])

  function scrollDown() {
    window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' })
  }

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

  // Descartar el archivo no debería depender de encontrar la X de la tarjeta:
  // se ofrece un botón explícito junto a la acción principal. Con un archivo
  // rechazado en la validación local, la salida es elegir otro.
  const canCancel =
    state.status === 'invalid' ||
    state.status === 'ready' ||
    state.status === 'confirming' ||
    state.status === 'error'

  // Cuando el archivo ya no sirve, la única salida es cambiarlo; en el resto de
  // los casos todavía se puede importar, así que el botón sólo cancela.
  const mustPickAnother =
    state.status === 'invalid' || (state.status === 'error' && !state.failure.retryable)

  // Sin esto la fila quedaría vacía en los estados sin acciones —'idle',
  // 'validating', 'uploading'— dejando un hueco suelto bajo el contenido.
  const hasActions = canCancel || hasRejections

  return (
    <AppShell>
      <div ref={contentRef} className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="m-0 text-2xl font-bold">Carga manual de historial</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Archivo JSON exportado desde Efactsoft
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Ausente mientras el endpoint no exista: la nota es opcional. */}
            {lastUpload && (
              <p className="font-mono text-xs text-muted-foreground">
                Última carga: {lastUploadFormatter.format(new Date(lastUpload.created_at))}
              </p>
            )}

            {/* Empezar de nuevo es una acción de la pantalla, no del informe:
                dentro de la tarjeta quedaba subordinada al resultado y al pie
                quedaba enterrada. En el encabezado está donde se busca un
                "nuevo…" en cualquier panel, y es justo donde está la vista
                cuando termina la importación. */}
            {summary && (
              <Button type="button" onClick={reset}>
                <FileUp data-icon="inline-start" />
                Nueva importación
              </Button>
            )}
          </div>
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
                    <span className="font-mono text-xs break-words">{state.detail}</span>
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
                    <span className="font-mono text-xs break-words">{state.failure.detail}</span>
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
                  <Progress value={null} className="mt-1 h-2" />
                  <span>Puede tardar varios minutos. No cierres esta pestaña.</span>
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {/* Fila de acciones única al pie, como en el wireframe, anclada al
            borde inferior de la ventana.

            El resultado de una importación no suele caber en el alto de la
            pantalla y los botones quedaban debajo del pliegue, sin nada que
            avisara de que el contenido seguía. Anclada, el borde superior y el
            degradado delatan el corte y las acciones quedan siempre a mano.

            El degradado mide exactamente el hueco que deja el 'gap-4' del
            contenedor: cuando no hay scroll pendiente cae sobre el fondo de la
            página y no se ve; cuando la tarjeta pasa por debajo, la difumina. */}
        {(hasActions || hasContentBelow) && (
          <div
            className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-2 border-t bg-surface py-3
              before:pointer-events-none before:absolute before:inset-x-0 before:bottom-full before:h-4
              before:bg-linear-to-t before:from-surface before:to-transparent"
          >
            {/* El degradado por sí solo no alcanza para que se entienda que hay
                más abajo, así que se dice. Desaparece al llegar al final, de
                modo que su sola presencia ya es la señal. */}
            {hasContentBelow && (
              <Button
                type="button"
                variant="ghost"
                size="lg"
                className="mr-auto"
                onClick={scrollDown}
              >
                <ChevronDown data-icon="inline-start" />
                Hay más abajo
              </Button>
            )}

            {canCancel &&
              (mustPickAnother ? (
                // Vuelve al paso 1, no abre el selector: con un archivo
                // adjunto la zona de arrastre no está montada, así que forzar
                // el diálogo dejaba el picker como única vía de entrada.
                <Button type="button" size="lg" variant="destructive" onClick={reset}>
                  <FileUp data-icon="inline-start" />
                  Elegir otro archivo
                </Button>
              ) : (
                // Salir del camino feliz no es un error: sin color.
                <Button type="button" size="lg" variant="outline" onClick={reset}>
                  <X data-icon="inline-start" />
                  Cancelar
                </Button>
              ))}

            {(state.status === 'ready' || state.status === 'confirming') && (
              <Button type="button" size="lg" onClick={requestConfirm}>
                {state.deep
                  ? `Importar ${numberFormatter.format(state.salesCount)} ${state.salesCount === 1 ? 'venta' : 'ventas'} al CRM`
                  : 'Importar al CRM'}
              </Button>
            )}

            {state.status === 'error' && state.failure.retryable && (
              <Button type="button" size="lg" variant="destructive" onClick={retry}>
                <RotateCcw data-icon="inline-start" />
                Reintentar
              </Button>
            )}

            {summary && hasRejections && (
              <Button
                type="button"
                size="lg"
                variant="secondary"
                onClick={() => downloadRejectionsCsv(summary)}
              >
                <Download data-icon="inline-start" />
                Descargar reporte
              </Button>
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
