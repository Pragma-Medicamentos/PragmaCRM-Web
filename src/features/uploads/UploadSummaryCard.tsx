import { CircleCheck, Info, TriangleAlert } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { UploadRejectionsPanel } from './UploadRejectionsPanel'
import type { SalesUploadSummary, UploadRange } from './uploads.types'

const dateFormatter = new Intl.DateTimeFormat('es-SV', { dateStyle: 'long' })
const numberFormatter = new Intl.NumberFormat('es-SV')

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
  return `${numberFormatter.format(count)} ${count === 1 ? singular : pluralWord}`
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
    return `Este archivo ya se había cargado antes: no se crearon ventas nuevas y se actualizaron ${numberFormatter.format(summary.updated)}.`
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

/** Tarjeta `.kpi` del wireframe: número grande arriba, etiqueta debajo. */
function Stat({ label, value, tone }: { label: string; value: number; tone?: 'destructive' }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border px-3 py-3">
      <div
        className={cn(
          'text-2xl font-bold tabular-nums leading-none',
          tone === 'destructive' ? 'text-destructive' : 'text-primary'
        )}
      >
        {numberFormatter.format(value)}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

export function UploadSummaryCard({ summary }: { summary: SalesUploadSummary }) {
  const note = syncNote(summary)
  const consistent = isConsistent(summary)

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

  const hasNotes = note !== null || warnings.length > 0
  const hasProblems = summary.sync_failed > 0 || !consistent

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CircleCheck className="size-5 shrink-0 text-primary" aria-hidden />
          {headline(summary)}
        </CardTitle>
        <CardDescription>{formatRange(summary.range)}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
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

        {/* Los fallos siguen como alertas propias: son excepcionales y no
            deben leerse al mismo nivel que un aviso esperado. */}
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

        {!consistent && (
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertTitle>Las cifras del resumen no cuadran</AlertTitle>
            <AlertDescription>
              {numberFormatter.format(summary.sales_received)} recibidas ≠{' '}
              {numberFormatter.format(summary.accepted)} +{' '}
              {numberFormatter.format(summary.rejected)} +{' '}
              {numberFormatter.format(summary.warnings.quotations_skipped)}. Reporta el identificador
              de carga al equipo técnico.
            </AlertDescription>
          </Alert>
        )}

        {(summary.rejected > 0 || summary.rejections_truncated > 0) && (
          <UploadRejectionsPanel summary={summary} />
        )}

        {/* La nota de sincronización y los avisos esperados van juntos en un
            solo bloque al pie: antes eran hasta cuatro alertas sueltas que
            competían con el resultado. */}
        {hasNotes && (
          <div className={cn('flex flex-col gap-2', hasProblems && 'pt-1')}>
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Info className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              {note && warnings.length === 0 ? 'Nota' : 'Avisos'}
            </h3>
            <ul className="flex list-disc flex-col gap-1 pl-6 text-sm text-muted-foreground">
              {note && <li>{note}</li>}
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        <Separator />

        <p className="text-xs text-muted-foreground">
          Identificador de carga: <span className="font-mono">{summary.upload_id}</span>
        </p>
      </CardContent>
    </Card>
  )
}
