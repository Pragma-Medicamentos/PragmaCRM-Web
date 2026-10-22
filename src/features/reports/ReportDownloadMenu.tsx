import { useEffect, useRef, useState } from 'react'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'
import { Spinner } from '../../components/ui/spinner'
import { isRequestCanceled } from '../../lib/api/apiClient'
import { REPORT_FORMAT_LABELS, type ReportFormat } from './reportsApi'

interface ReportDownloadMenuProps {
  /** Arma la descarga con lo que el llamador tiene en pantalla. */
  download: (format: ReportFormat, options: { signal: AbortSignal }) => Promise<void>
  label?: string
  /** Encabezado del menú, ej. "Ventas por vendedor". */
  title?: string
  /** Formatos que ofrece, en orden. Por defecto Excel y PDF. */
  formats?: readonly ReportFormat[]
  size?: 'sm' | 'default'
  variant?: 'outline' | 'default' | 'ghost' | 'secondary'
}

const FORMAT_ICONS = { xlsx: FileSpreadsheet, pdf: FileText } as const
const ALL_FORMATS: readonly ReportFormat[] = ['xlsx', 'pdf']

/**
 * Botón de descarga de un reporte. Con un solo formato descarga directo; con
 * varios abre un menú. Bloquea un segundo clic mientras baja el archivo y
 * cancela la descarga si el componente se desmonta. Un error se muestra con
 * el `message` de la API (un 401 ya cerró la sesión en el interceptor).
 */
export function ReportDownloadMenu({
  download,
  label = 'Descargar',
  title,
  formats = ALL_FORMATS,
  size = 'sm',
  variant = 'outline',
}: ReportDownloadMenuProps) {
  const [pending, setPending] = useState<ReportFormat | null>(null)
  const controller = useRef<AbortController | null>(null)

  useEffect(() => () => controller.current?.abort(), [])

  const start = async (format: ReportFormat) => {
    controller.current?.abort()
    const current = new AbortController()
    controller.current = current
    setPending(format)
    try {
      await download(format, { signal: current.signal })
    } catch (error) {
      if (isRequestCanceled(error)) return
      toast.error(error instanceof Error ? error.message : 'No se pudo descargar el reporte')
    } finally {
      if (controller.current === current) {
        controller.current = null
        setPending(null)
      }
    }
  }

  const icon = pending ? <Spinner data-icon="inline-start" /> : <Download data-icon="inline-start" />
  const text = pending ? 'Generando…' : label

  if (formats.length === 1) {
    return (
      <Button variant={variant} size={size} disabled={pending !== null} onClick={() => void start(formats[0])}>
        {icon}
        {text}
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={pending !== null}>
          {icon}
          {text}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {title && <DropdownMenuLabel>{title}</DropdownMenuLabel>}
        <DropdownMenuGroup>
          {formats.map((format) => {
            const Icon = FORMAT_ICONS[format]
            return (
              <DropdownMenuItem key={format} onSelect={() => void start(format)}>
                <Icon />
                {REPORT_FORMAT_LABELS[format]}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
