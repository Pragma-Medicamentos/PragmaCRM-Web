import { CircleCheck, Info, TriangleAlert } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { UploadRejectionsPanel } from './UploadRejectionsPanel'
import type { SalesUploadSummary, UploadRange } from './uploads.types'

const dateFormatter = new Intl.DateTimeFormat('es-SV', { dateStyle: 'long' })

/**
 * `YYYY-MM-DD` se parsea como medianoche UTC con `new Date(iso)`, que en
 * El Salvador (UTC-6) se muestra como el día anterior. Hay que armar la fecha
 * en hora local.
 */
function formatIsoDay(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return dateFormatter.format(new Date(year, month - 1, day))
}

function formatRange(range: UploadRange): string {
  // Ambos null es un caso legítimo: ninguna venta traía fecha parseable.
  if (!range.from || !range.to) return 'Sin fechas de emisión válidas en el archivo'
  if (range.from === range.to) return `Ventas del ${formatIsoDay(range.from)}`
  return `Ventas del ${formatIsoDay(range.from)} al ${formatIsoDay(range.to)}`
}

function plural(count: number, singular: string, pluralWord: string): string {
  return `${count} ${count === 1 ? singular : pluralWord}`
}

function headline(summary: SalesUploadSummary): string {
  const parts = [plural(summary.accepted, 'venta importada', 'ventas importadas')]
  if (summary.rejected > 0) parts.push(plural(summary.rejected, 'rechazada', 'rechazadas'))
  if (summary.warnings.quotations_skipped > 0) {
    parts.push(plural(summary.warnings.quotations_skipped, 'cotización omitida', 'cotizaciones omitidas'))
  }
  return parts.join(', ')
}

/** Nota que evita el ticket de soporte "subí el archivo y no pasó nada". */
function syncNote(summary: SalesUploadSummary): string | null {
  if (summary.inserted === 0 && summary.updated > 0) {
    return `Este archivo ya se había cargado antes: no se crearon ventas nuevas y se actualizaron ${summary.updated}.`
  }
  if (summary.inserted === 0 && summary.updated === 0 && summary.accepted > 0) {
    return 'Las ventas se aceptaron pero no se reflejaron cambios en el CRM. Avisa al equipo técnico con el identificador de carga.'
  }
  return null
}

/**
 * Invariante del backend: cada entrada del archivo termina aceptada,
 * rechazada u omitida por ser cotización. Si no cuadra, es un bug del lado
 * de la API y vale la pena que se vea.
 */
function isConsistent(summary: SalesUploadSummary): boolean {
  return (
    summary.accepted + summary.rejected + summary.warnings.quotations_skipped ===
    summary.sales_received
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'destructive' }) {
  return (
    <div className="rounded-lg border px-3 py-2">
      <div
        className={[
          'text-2xl font-bold tabular-nums',
          tone === 'destructive' ? 'text-destructive' : '',
        ].join(' ')}
      >
        {value}
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

export function UploadSummaryCard({ summary }: { summary: SalesUploadSummary }) {
  const note = syncNote(summary)

  const warnings: string[] = []
  if (summary.warnings.quotations_skipped > 0) {
    warnings.push(
      `${plural(summary.warnings.quotations_skipped, 'cotización', 'cotizaciones')} (estado 1) no se importaron. Es el comportamiento esperado.`
    )
  }
  if (summary.warnings.sales_without_customer > 0) {
    warnings.push(
      `${plural(summary.warnings.sales_without_customer, 'venta llegó', 'ventas llegaron')} sin cliente asociado (ventas de mostrador).`
    )
  }
  if (summary.warnings.sales_without_user > 0) {
    warnings.push(
      `${plural(summary.warnings.sales_without_user, 'venta llegó', 'ventas llegaron')} sin vendedor asociado; no entran en el reporte de venta por ruta.`
    )
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <Alert>
        <CircleCheck className="text-primary" />
        <AlertTitle>{headline(summary)}</AlertTitle>
        <AlertDescription>{formatRange(summary.range)}</AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Stat label="Ventas en el archivo" value={summary.sales_received} />
        <Stat label="Aceptadas" value={summary.accepted} />
        <Stat
          label="Rechazadas"
          value={summary.rejected}
          tone={summary.rejected > 0 ? 'destructive' : undefined}
        />
        <Stat label="Nuevas en el CRM" value={summary.inserted} />
        <Stat label="Actualizadas" value={summary.updated} />
      </div>

      {note && (
        <Alert>
          <Info />
          <AlertDescription>{note}</AlertDescription>
        </Alert>
      )}

      {summary.sync_failed > 0 && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>
            {plural(summary.sync_failed, 'venta no se pudo sincronizar', 'ventas no se pudieron sincronizar')}
          </AlertTitle>
          <AlertDescription>
            Avisa al equipo técnico con el identificador de carga de abajo.
          </AlertDescription>
        </Alert>
      )}

      {!isConsistent(summary) && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>Las cifras del resumen no cuadran</AlertTitle>
          <AlertDescription>
            {summary.sales_received} recibidas ≠ {summary.accepted} + {summary.rejected} +{' '}
            {summary.warnings.quotations_skipped}. Reporta el identificador de carga al equipo
            técnico.
          </AlertDescription>
        </Alert>
      )}

      {warnings.length > 0 && (
        <Alert>
          <Info />
          <AlertTitle>Avisos</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {(summary.rejected > 0 || summary.rejections_truncated > 0) && (
        <UploadRejectionsPanel
          rejections={summary.rejections}
          rejected={summary.rejected}
          rejectionsTruncated={summary.rejections_truncated}
        />
      )}

      <Separator />

      <p className="text-xs text-muted-foreground">
        Identificador de carga: <span className="font-mono">{summary.upload_id}</span>
      </p>
    </div>
  )
}
