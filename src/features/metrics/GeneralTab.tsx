import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Separator } from '../../components/ui/separator'
import { Skeleton } from '../../components/ui/skeleton'
import { PartToWholeBar } from './charts/PartToWholeBar'
import { PurchaseFrequencyChart } from './charts/PurchaseFrequencyChart'
import { TrendChart } from './charts/TrendChart'
import { STOP_TYPES } from './kpiCatalog'
import type { KpiValuesResponse, MetricsRange, TrendGranularity } from './metrics.types'
import { getKpiValues, getPurchaseFrequency, getTrends } from './metricsApi'
import { formatCount, formatDays, formatPercent, toAmount } from './metricsFormat'
import { QueryAlerts } from './QueryAlerts'
import { BlockHeading, ChartSlot, KpiSlot, Refreshing, isRefreshing } from './slots'
import { useMetricsQuery, type MetricsQueryState } from './useMetricsQuery'

interface GeneralTabProps {
  range: MetricsRange
  granularity: TrendGranularity
}

const COMPARISON = 'vs periodo anterior'

/** Porción vencida del saldo por cobrar, para la nota de "Cartera vencida". */
function overdueShare(kpis: MetricsQueryState<KpiValuesResponse>): string | undefined {
  if (kpis.status !== 'ready') return undefined
  const overdue = kpis.data.kpis.overdue_portfolio
  const pending = kpis.data.kpis.pending_collections
  if (!overdue || !pending || 'error' in overdue || 'error' in pending) return undefined
  const total = toAmount(pending.value)
  const part = toAmount(overdue.value)
  if (!total || part === null) return undefined
  return `${formatPercent(Math.round((part / total) * 1000) / 10)} del saldo · al día de hoy`
}

/**
 * Pestaña General (wireframes 1d + 1e): las 17 KPIs agrupadas por pregunta
 * de negocio (ventas, campo, cartera), cada grupo con el gráfico que lo
 * explica. Una sola consulta del lote /kpis/values alimenta todas las cifras.
 */
export function GeneralTab({ range, granularity }: GeneralTabProps) {
  const rangeKey = `${range.from}:${range.to}`
  const kpis = useMetricsQuery(rangeKey, (signal) => getKpiValues(range, undefined, { signal }))
  const trends = useMetricsQuery(`${rangeKey}:${granularity}`, (signal) => getTrends(range, granularity, { signal }))
  const frequency = useMetricsQuery(rangeKey, (signal) => getPurchaseFrequency(range, { signal }))

  const bucketNoun = granularity === 'month' ? 'mes' : 'semana'
  const stopsByType =
    kpis.state.status === 'ready' && kpis.state.data.kpis.stops_by_type && !('error' in kpis.state.data.kpis.stops_by_type)
      ? kpis.state.data.kpis.stops_by_type.value
      : null

  return (
    <div className="flex flex-col gap-6">
      <QueryAlerts
        queries={[
          { label: 'los indicadores', endpoint: 'GET /api/v1/metrics/kpis/values', ...kpis },
          { label: 'las tendencias', endpoint: 'GET /api/v1/metrics/trends', ...trends },
          { label: 'la frecuencia de compra', endpoint: 'GET /api/v1/metrics/purchase-frequency', ...frequency },
        ]}
      />

      <Refreshing active={isRefreshing(kpis.state, trends.state, frequency.state)} className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Ventas</CardTitle>
            <CardDescription>Ventas confirmadas en el ERP, IVA incluido</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="grid items-end gap-6 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
              <KpiSlot kpis={kpis.state} name="total_sales" comparison={COMPARISON} size="hero" className="lg:pb-8" />
              <ChartSlot state={trends.state} className="h-52">
                {(data) => (
                  <TrendChart
                    points={data.points}
                    granularity={data.granularity}
                    metric="total_sales"
                    kind="area"
                    className="h-52"
                  />
                )}
              </ChartSlot>
            </div>
            <Separator />
            <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
              <KpiSlot kpis={kpis.state} name="orders_count" comparison={COMPARISON} />
              <KpiSlot kpis={kpis.state} name="average_monthly_sales" comparison={COMPARISON} />
              <KpiSlot kpis={kpis.state} name="route_effectiveness" comparison={COMPARISON} />
              <KpiSlot kpis={kpis.state} name="goal_compliance" comparison={COMPARISON} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ticket promedio</CardTitle>
            <CardDescription>Venta total entre pedidos, por {bucketNoun}</CardDescription>
          </CardHeader>
          <CardContent className="grid items-end gap-6 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
            <KpiSlot
              kpis={kpis.state}
              name="average_ticket"
              label="En el periodo"
              comparison={COMPARISON}
              className="lg:pb-8"
            />
            <ChartSlot state={trends.state} className="h-52">
              {(data) => (
                <TrendChart
                  points={data.points}
                  granularity={data.granularity}
                  metric="average_ticket"
                  kind="line"
                  className="h-52"
                />
              )}
            </ChartSlot>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actividad en campo</CardTitle>
            <CardDescription>Paradas registradas por los vendedores desde la app</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
              <KpiSlot kpis={kpis.state} name="stops_executed" comparison={COMPARISON} />
              <KpiSlot kpis={kpis.state} name="visited_customers" comparison={COMPARISON} />
              <KpiSlot kpis={kpis.state} name="effective_visits_rate" comparison={COMPARISON} />
              <KpiSlot kpis={kpis.state} name="average_visit_minutes" comparison={COMPARISON} />
            </div>
            <Separator />
            <div className="flex flex-col gap-3">
              <BlockHeading title="Paradas por tipo" />
              {stopsByType ? (
                <PartToWholeBar
                  noun="paradas"
                  segments={STOP_TYPES.map((type) => ({ ...type, value: stopsByType[type.key] }))}
                />
              ) : (
                <Skeleton className="h-14 w-full" />
              )}
            </div>
            <Separator />
            <div className="flex flex-col gap-3">
              <BlockHeading title={`Paradas por ${bucketNoun}`} />
              <ChartSlot state={trends.state} className="h-48">
                {(data) => (
                  <TrendChart points={data.points} granularity={data.granularity} metric="stops" kind="bar" className="h-48" />
                )}
              </ChartSlot>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cartera y clientes</CardTitle>
            <CardDescription>Cobertura, recompra y saldo pendiente</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
              <KpiSlot kpis={kpis.state} name="customers_without_visit" comparison={COMPARISON} />
              <KpiSlot kpis={kpis.state} name="recovered_customers" comparison={COMPARISON} />
              <KpiSlot kpis={kpis.state} name="new_prospects" comparison={COMPARISON} />
              <KpiSlot kpis={kpis.state} name="purchase_frequency_days" comparison={COMPARISON} />
            </div>
            <Separator />
            <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
              <KpiSlot kpis={kpis.state} name="pending_collections" comparison={COMPARISON} />
              <KpiSlot kpis={kpis.state} name="overdue_portfolio" comparison={COMPARISON} note={overdueShare(kpis.state)} />
            </div>
            <Separator />
            <div className="flex flex-col gap-3">
              <BlockHeading
                title="Frecuencia de compra"
                aside={
                  frequency.state.status === 'ready' && frequency.state.data.average_days !== null
                    ? `Promedio: cada ${formatDays(frequency.state.data.average_days)}`
                    : undefined
                }
              />
              <ChartSlot state={frequency.state} className="h-52">
                {(data) => (
                  <div className="flex flex-col gap-2">
                    <PurchaseFrequencyChart buckets={data.buckets} />
                    {data.insufficient_data > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {formatCount(data.insufficient_data)} clientes compraron sin una compra anterior con la
                        cual comparar; no entran en el cálculo.
                      </p>
                    )}
                  </div>
                )}
              </ChartSlot>
            </div>
          </CardContent>
        </Card>
      </Refreshing>
    </div>
  )
}
