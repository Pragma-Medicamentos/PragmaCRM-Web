import { differenceInCalendarDays } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Separator } from '../../components/ui/separator'
import { formatTimestamp } from '../metrics/metricsDates'
import { formatCount, formatMoney, formatPercent } from '../metrics/metricsFormat'
import { MetricStat, MetricStatSkeleton } from '../metrics/MetricStat'
import { QueryAlerts } from '../metrics/QueryAlerts'
import { BlockHeading } from '../metrics/slots'
import { useMetricsQuery } from '../metrics/useMetricsQuery'
import { getCustomerCreditTotals } from './customersApi'
import type { CustomerCategory, CustomerProfile } from './customers.types'

/** Ventana fija del resumen de GET /customers/:id (CATEGORY_WINDOW_MONTHS en el API). */
const SUMMARY_WINDOW_LABEL = 'Últimos 12 meses'

const CATEGORY_LABEL: Record<CustomerCategory, string> = {
  A: 'Categoría A',
  B: 'Categoría B',
  C: 'Categoría C',
  uncategorized: 'Sin categoría',
}

function daysAgo(iso: string | null): string | undefined {
  if (!iso) return undefined
  const days = differenceInCalendarDays(new Date(), new Date(iso))
  return days <= 0 ? 'Hoy' : days === 1 ? 'Hace 1 día' : `Hace ${formatCount(days)} días`
}

/**
 * Estadísticas del cliente en su perfil (RF-02 + RF-09) con lo que el API ya
 * calcula por cliente: el resumen de 12 meses de GET /customers/:id y los
 * totales de cartera de GET /customers/:id/credits.
 */
export function CustomerStatsCard({ profile }: { profile: CustomerProfile }) {
  const { summary } = profile
  const credits = useMetricsQuery(profile.id, (signal) => getCustomerCreditTotals(profile.id, { signal }))
  const totals = credits.state.status === 'ready' ? credits.state.data.totals : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estadísticas del cliente</CardTitle>
        <CardDescription>Comportamiento de compra, visitas y cartera.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <BlockHeading title="Comportamiento comercial" aside={SUMMARY_WINDOW_LABEL} />
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
            <MetricStat
              label="Clasificación"
              value={CATEGORY_LABEL[profile.category]}
              hint="Combina compras netas, tasa de conversión y días de pago de los últimos 12 meses."
            />
            <MetricStat
              label="Tasa de conversión"
              value={formatPercent(summary.conversion_rate)}
              meter={summary.conversion_rate}
              note={`${formatCount(summary.orders_count)} pedidos en ${formatCount(summary.visits_count)} visitas`}
            />
            <MetricStat
              label="Frecuencia de compra"
              value={summary.purchase_frequency_days === null ? '—' : `${formatCount(summary.purchase_frequency_days)} d`}
              note={summary.purchase_frequency_days === null ? 'Menos de 2 compras' : 'Promedio entre compras'}
            />
            <MetricStat
              label="Días promedio de pago"
              value={summary.avg_payment_days === null ? '—' : `${formatCount(Math.round(summary.avg_payment_days))} d`}
              note={summary.avg_payment_days === null ? 'Sin créditos liquidados' : 'Plazo de crédito: 60 d'}
            />
            <MetricStat
              label="Última compra"
              value={formatTimestamp(summary.last_purchase_at)}
              note={daysAgo(summary.last_purchase_at)}
            />
            <MetricStat
              label="Última visita"
              value={formatTimestamp(summary.last_visit_at)}
              note={daysAgo(summary.last_visit_at)}
            />
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-4">
          <BlockHeading title="Cartera" aside="Al día de hoy" />
          <QueryAlerts
            queries={[{ label: 'los totales de cartera', endpoint: 'GET /api/v1/customers/:id/credits', ...credits }]}
          />
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
            {totals ? (
              <>
                <MetricStat
                  label="Cartera vencida"
                  value={formatMoney(totals.overdue_amount)}
                  note={`${formatCount(totals.overdue_count)} ${totals.overdue_count === 1 ? 'factura' : 'facturas'} con más de 60 d`}
                />
                <MetricStat label="Saldo pendiente" value={formatMoney(totals.pending_balance)} />
                <MetricStat
                  label="Crédito disponible"
                  value={formatMoney(totals.credit_available)}
                  note={totals.credit_limit === null ? 'Sin límite de crédito' : `Límite: ${formatMoney(totals.credit_limit)}`}
                />
              </>
            ) : credits.state.status === 'loading' || credits.state.status === 'idle' ? (
              Array.from({ length: 3 }, (_, i) => <MetricStatSkeleton key={i} />)
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
