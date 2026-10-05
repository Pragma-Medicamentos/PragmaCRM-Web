import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AppShell } from '../../components/AppShell'
import { PageHeader } from '../../components/PageHeader'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Skeleton } from '../../components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import type { MetricsRange, ProductWithoutMovement } from './metrics.types'
import { getProductsNoMovement } from './metricsApi'
import { describeRange, formatRange, formatTimestamp } from './metricsDates'
import { formatCount } from './metricsFormat'
import { MetricStat, MetricStatSkeleton } from './MetricStat'
import { PeriodPicker } from './PeriodPicker'
import { periodSearch, productMetricsPath } from './productMetricsLinks'
import { QueryAlerts } from './QueryAlerts'
import { useMetricsQuery } from './useMetricsQuery'
import { useMetricsSearch } from './useMetricsSearch'

const WINDOWS_NOTE =
  'Las tres ventanas cuentan hacia atrás desde el final del periodo, no desde el largo del rango: un rango de una semana sigue respondiendo cuántos productos llevan 90 días quietos.'

/**
 * Listado completo con scroll propio y encabezado fijo, como en Cobertura: la
 * lista la acota el catálogo y la Card no debe crecer con él.
 */
function NoMovementTable({ products, range }: { products: ProductWithoutMovement[]; range: MetricsRange }) {
  const navigate = useNavigate()

  if (products.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-muted-foreground">
        Todos los productos activos del catálogo registraron al menos una venta en {formatRange(range)}.
      </p>
    )
  }

  return (
    <div className="max-h-[32rem] overflow-auto [&>[data-slot=table-container]]:overflow-visible">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow>
            <TableHead className="hidden pl-4 sm:table-cell">Código</TableHead>
            <TableHead className="pl-4 sm:pl-2">Nombre</TableHead>
            <TableHead className="hidden md:table-cell">Grupo</TableHead>
            <TableHead className="hidden sm:table-cell">Última venta</TableHead>
            <TableHead className="pr-4 text-right">Sin venta</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow
              key={product.product_id}
              className="cursor-pointer"
              onClick={() => navigate(productMetricsPath(product.product_id, range))}
            >
              <TableCell className="hidden pl-4 text-muted-foreground sm:table-cell">{product.code ?? '—'}</TableCell>
              <TableCell className="max-w-72 pl-4 sm:pl-2">
                <div className="truncate font-medium">{product.name}</div>
                {product.code && <div className="truncate text-xs text-muted-foreground sm:hidden">{product.code}</div>}
              </TableCell>
              <TableCell className="hidden max-w-56 truncate text-muted-foreground md:table-cell">
                {product.product_group ?? '—'}
              </TableCell>
              {/* `last_sold_at` null = nunca vendió; formatTimestamp ya dice "Nunca". */}
              <TableCell className="hidden text-muted-foreground sm:table-cell">
                {formatTimestamp(product.last_sold_at)}
              </TableCell>
              <TableCell className="pr-4 text-right">
                <Badge variant={product.days_since_last_sale === null ? 'destructive' : 'secondary'}>
                  {product.days_since_last_sale === null ? 'Nunca' : `${formatCount(product.days_since_last_sale)} d`}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

/**
 * Catálogo sin movimiento (PCRM-177, GET /metrics/products/no-movement): qué
 * parte del catálogo activo no se vendió en el periodo, y cuántos productos
 * llevan 30, 60 y 90 días quietos. El periodo vive en la URL, como en /metricas.
 */
export function ProductsNoMovementPage() {
  const { range, setRange } = useMetricsSearch()
  const query = useMetricsQuery(`${range.from}:${range.to}`, (signal) => getProductsNoMovement(range, { signal }))
  const data = query.state.status === 'ready' ? query.state.data : null
  const loading = query.state.status === 'loading' || query.state.status === 'idle'

  return (
    <AppShell>
      <div className="flex max-w-5xl flex-col gap-6">
        <Button asChild variant="ghost" size="sm" className="self-start">
          <Link to={`/metricas${periodSearch(range)}`}>
            <ArrowLeft data-icon="inline-start" /> Volver al panel de métricas
          </Link>
        </Button>

        <PageHeader
          title="Productos sin movimiento"
          subtitle={describeRange(range)}
          actions={<PeriodPicker value={range} onChange={setRange} />}
        />

        <QueryAlerts
          queries={[
            {
              label: 'los productos sin movimiento',
              endpoint: 'GET /api/v1/metrics/products/no-movement',
              ...query,
            },
          ]}
        />

        {(data || loading) && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Catálogo quieto</CardTitle>
                <CardDescription>
                  Productos activos sin venta confirmada en los últimos 30, 60 y 90 días
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
                  {data ? (
                    <>
                      <MetricStat
                        label="30 días sin venta"
                        hint={WINDOWS_NOTE}
                        value={formatCount(data.without_movement.days_30)}
                      />
                      <MetricStat
                        label="60 días sin venta"
                        hint={WINDOWS_NOTE}
                        value={formatCount(data.without_movement.days_60)}
                      />
                      <MetricStat
                        label="90 días sin venta"
                        hint={WINDOWS_NOTE}
                        value={formatCount(data.without_movement.days_90)}
                      />
                      <MetricStat
                        label="Catálogo activo"
                        value={formatCount(data.active_products)}
                        note="Productos vigentes del ERP"
                      />
                    </>
                  ) : (
                    loading && Array.from({ length: 4 }, (_, i) => <MetricStatSkeleton key={i} />)
                  )}
                </div>
                {data && (
                  <p className="text-xs text-muted-foreground">
                    Las tres ventanas cuelgan del final del periodo ({formatRange({ from: range.to, to: range.to })}),
                    no del largo del rango: cambiar el periodo a una semana no achica los conteos.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sin venta en el periodo</CardTitle>
                <CardDescription>
                  {data
                    ? `${formatCount(data.products.length)} de ${formatCount(data.active_products)} productos activos · ${formatRange(range)}`
                    : `Productos activos sin venta confirmada en ${formatRange(range)}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                {data ? (
                  <NoMovementTable products={data.products} range={range} />
                ) : (
                  loading && <Skeleton className="mx-4 h-64" />
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  )
}
