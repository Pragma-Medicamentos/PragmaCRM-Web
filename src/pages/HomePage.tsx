import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ChartColumn, FileUp } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { TrendChart } from '../features/metrics/charts/TrendChart'
import type { KpiName } from '../features/metrics/metrics.types'
import { getKpiValues, getTrends } from '../features/metrics/metricsApi'
import { currentWeekRange, formatRange, lastWeeksRange } from '../features/metrics/metricsDates'
import { QueryAlerts } from '../features/metrics/QueryAlerts'
import { ChartSlot, KpiSlot } from '../features/metrics/slots'
import { useMetricsQuery } from '../features/metrics/useMetricsQuery'
import { listVendors } from '../features/vendors/vendorsApi'

/** Las 4 tarjetas de 1a, en el orden del wireframe. */
const HOME_KPIS = ['stops_executed', 'average_ticket', 'customers_without_visit', 'new_prospects'] as const satisfies readonly KpiName[]
const TREND_WEEKS = 8

/**
 * Resumen (wireframe 1a): cómo va la semana en curso contra la anterior, y
 * las paradas de las últimas semanas con la actual resaltada. El detalle
 * completo vive en el Panel de métricas (/metricas).
 */
export function HomePage() {
  const week = useMemo(() => currentWeekRange(), [])
  const trendRange = useMemo(() => lastWeeksRange(TREND_WEEKS), [])

  const kpis = useMetricsQuery(`${week.from}:${week.to}`, (signal) => getKpiValues(week, HOME_KPIS, { signal }))
  const trends = useMetricsQuery(`${trendRange.from}:${trendRange.to}`, (signal) =>
    getTrends(trendRange, 'week', { signal })
  )
  const vendors = useMetricsQuery('vendors', () => listVendors())

  const activeVendors = vendors.state.status === 'ready' ? vendors.state.data.filter((v) => v.active).length : null

  return (
    <AppShell>
      <PageHeader
        title="Resumen"
        subtitle={`Semana del ${formatRange(week)}${
          activeVendors !== null ? ` · ${activeVendors} ${activeVendors === 1 ? 'vendedor activo' : 'vendedores activos'}` : ''
        }`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/metricas">
                <ChartColumn data-icon="inline-start" /> Panel de métricas
              </Link>
            </Button>
            <Button asChild>
              <Link to="/importar">
                <FileUp data-icon="inline-start" /> Importar datos
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-6">
        <QueryAlerts
          queries={[
            { label: 'los indicadores de la semana', endpoint: 'GET /api/v1/metrics/kpis/values', ...kpis },
            { label: 'las paradas por semana', endpoint: 'GET /api/v1/metrics/trends', ...trends },
          ]}
        />

        <section aria-label="Indicadores de la semana" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {HOME_KPIS.map((name) => (
            <Card key={name} size="sm">
              <CardContent>
                <KpiSlot kpis={kpis.state} name={name} comparison="vs semana anterior" />
              </CardContent>
            </Card>
          ))}
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Paradas por semana</CardTitle>
            <CardDescription>Últimas {TREND_WEEKS} semanas, con la semana en curso resaltada</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartSlot state={trends.state}>
              {(data) => <TrendChart points={data.points} granularity="week" metric="stops" kind="bar" emphasizeLast />}
            </ChartSlot>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
