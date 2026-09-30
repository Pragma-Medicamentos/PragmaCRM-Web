import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ChartNoAxesColumn } from 'lucide-react'
import { AppShell } from '../../components/AppShell'
import { PageHeader } from '../../components/PageHeader'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../../components/ui/empty'
import { Skeleton } from '../../components/ui/skeleton'
import { ComparisonPicker } from '../metrics/ComparisonPicker'
import { comparisonTarget, formatRange } from '../metrics/metricsDates'
import { formatCount } from '../metrics/metricsFormat'
import { MetricStatSkeleton } from '../metrics/MetricStat'
import { PeriodPicker } from '../metrics/PeriodPicker'
import { QueryAlerts } from '../metrics/QueryAlerts'
import { SellerPerformanceBody, useSellerDetail } from '../metrics/SellerPerformance'
import { useMetricsSearch } from '../metrics/useMetricsSearch'
import { useVendors } from './useVendors'

function PerformanceSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
      {Array.from({ length: 5 }, (_, i) => (
        <MetricStatSkeleton key={i} />
      ))}
    </div>
  )
}

/**
 * Detalle de un vendedor (RF-01 + RF-09): sus datos y su desempeño en el
 * periodo elegido, con el mismo contenido del panel lateral de la pestaña
 * Equipo. El periodo y la comparación viven en la URL, como en /metricas.
 */
export function VendorDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const { range, comparison: comparisonMode, setRange, setComparison } = useMetricsSearch()
  const comparison = comparisonTarget(comparisonMode, range)
  const vendors = useVendors()
  const queries = useSellerDetail(id, range, comparison)
  const { detail } = queries

  const vendor = vendors.state.status === 'ready' ? vendors.state.vendors.find((v) => v.id === id) : undefined
  const seller = detail.state.status === 'ready' ? detail.state.data.seller : null
  // Un vendedor deshabilitado sin actividad en el periodo no sale en /metrics/sellers/:id.
  const noActivity = detail.state.status === 'error' && /not found/i.test(detail.state.message)
  const name = seller?.name ?? vendor?.name
  const active = seller?.active ?? vendor?.active

  return (
    <AppShell>
      <div className="flex max-w-5xl flex-col gap-6">
        <Button asChild variant="ghost" size="sm" className="self-start">
          <Link to="/vendedores">
            <ArrowLeft data-icon="inline-start" /> Volver a vendedores
          </Link>
        </Button>

        <PageHeader
          title={name ?? 'Vendedor'}
          subtitle={
            <span className="flex flex-wrap items-center gap-2">
              {vendor?.email && <span>{vendor.email}</span>}
              {seller && <span>· {formatCount(seller.portfolio_customers)} clientes en cartera</span>}
              {active !== undefined && (
                <Badge variant={active ? 'default' : 'outline'}>{active ? 'Activo' : 'Deshabilitado'}</Badge>
              )}
            </span>
          }
          actions={
            <>
              <ComparisonPicker value={comparisonMode} onChange={setComparison} />
              <PeriodPicker value={range} onChange={setRange} />
            </>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle>Desempeño</CardTitle>
            <CardDescription>{formatRange(range)}</CardDescription>
          </CardHeader>
          <CardContent>
            {seller ? (
              <SellerPerformanceBody seller={seller} range={range} comparison={comparison} {...queries} />
            ) : noActivity ? (
              <Empty className="py-10">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ChartNoAxesColumn />
                  </EmptyMedia>
                  <EmptyTitle>Sin actividad en el periodo</EmptyTitle>
                  <EmptyDescription>
                    Este vendedor no registró paradas ni ventas entre {formatRange(range)}. Probá con otro periodo.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : detail.state.status === 'loading' || detail.state.status === 'idle' ? (
              <div className="flex flex-col gap-6">
                <PerformanceSkeleton />
                <Skeleton className="h-44 w-full" />
              </div>
            ) : (
              // Error o endpoint pendiente: el aviso trae el botón Reintentar.
              <QueryAlerts
                queries={[{ label: 'el desempeño del vendedor', endpoint: 'GET /api/v1/metrics/sellers/:id', ...detail }]}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}

