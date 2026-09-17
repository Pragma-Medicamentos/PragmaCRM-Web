import { useRef, useState } from 'react'
import { CloudUpload, FileJson, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from '@/components/ui/attachment'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { MAX_UPLOAD_MB, formatBytes } from './validateSalesFile'
import type { SalesUploadState } from './useSalesUpload'

/** Traduce el estado del flujo al `state` visual de <Attachment>. */
function attachmentState(status: SalesUploadState['status']) {
  switch (status) {
    case 'validating':
      return 'processing' as const
    case 'uploading':
      return 'uploading' as const
    case 'invalid':
    case 'error':
      return 'error' as const
    case 'success':
      return 'done' as const
    default:
      return 'idle' as const
  }
}

/** Línea secundaria de la tarjeta: peso y, si se pudo parsear, cuántas ventas trae. */
function describeFile(state: SalesUploadState, file: File): string {
  const size = formatBytes(file.size)

  if (state.status === 'validating') return `${size} · Validando…`
  if (state.status === 'invalid' || state.status === 'error') return size

  if (state.status === 'ready' || state.status === 'confirming' || state.status === 'uploading') {
    if (!state.deep) return `${size} · Contenido sin validar por el tamaño`
    const sales = `${state.salesCount} ${state.salesCount === 1 ? 'venta' : 'ventas'}`
    return state.quotationsCount > 0
      ? `${size} · ${sales} (${state.quotationsCount} son cotizaciones)`
      : `${size} · ${sales}`
  }

  return size
}

interface SalesFileDropzoneProps {
  state: SalesUploadState
  onSelectFile: (file: File) => void
  onClear: () => void
}

export function SalesFileDropzone({ state, onSelectFile, onClear }: SalesFileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const busy = state.status === 'validating' || state.status === 'uploading'
  const file = state.status === 'idle' ? null : state.file

  function handleFiles(files: FileList | null) {
    // Se toma solo el primero: el endpoint rechaza más de un archivo y el
    // mensaje del backend sería menos claro que no ofrecerlo siquiera.
    const next = files?.[0]
    if (next) onSelectFile(next)
  }

  function openPicker() {
    inputRef.current?.click()
  }

  if (file) {
    return (
      <Attachment state={attachmentState(state.status)} className="w-full">
        <AttachmentMedia>
          {busy ? <Spinner /> : <FileJson />}
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>{file.name}</AttachmentTitle>
          <AttachmentDescription>{describeFile(state, file)}</AttachmentDescription>
        </AttachmentContent>

        {/* Mientras se valida o se sube no hay nada que quitar. Antes el botón
            seguía ahí, solo que deshabilitado: invitaba a una acción imposible,
            que es peor que no ofrecerla. */}
        {!busy && (
          <AttachmentActions>
            <AttachmentAction aria-label={`Quitar ${file.name}`} onClick={onClear}>
              <X />
            </AttachmentAction>
          </AttachmentActions>
        )}
      </Attachment>
    )
  }

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        // Solo apagar el resaltado al salir del contenedor, no al pasar por
        // encima de los hijos.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        handleFiles(e.dataTransfer.files)
      }}
      className={cn(
        'rounded-xl border border-dashed text-center transition-colors',
        dragging ? 'border-primary bg-primary/5' : 'border-border bg-card'
      )}
    >
      <Empty className="py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CloudUpload />
          </EmptyMedia>
          <EmptyTitle className="text-lg">Arrastra aquí el archivo de ventas</EmptyTitle>
          <EmptyDescription>
            Formato .json exportado de Efactsoft · máximo {MAX_UPLOAD_MB} MB
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button type="button" size="lg" onClick={openPicker}>
            Seleccionar archivo
          </Button>
        </EmptyContent>
      </Empty>

      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        onChange={(e) => {
          handleFiles(e.target.files)
          // Permite volver a elegir el mismo archivo después de corregirlo.
          e.target.value = ''
        }}
      />
    </div>
  )
}
