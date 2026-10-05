import { Link, useLocation, useParams } from 'react-router-dom'
import { ArrowLeft, PackageSearch } from 'lucide-react'
import { AppShell } from '../../components/AppShell'
import { PageHeader } from '../../components/PageHeader'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../../components/ui/empty'
import { Separator } from '../../components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import type { Money, ProductMetricsResponse, ProductSeller } from './metrics.types'
import { getProductMetrics } from './metricsApi'
import { describeRange, formatRange } from './metricsDates'
import { formatCount, formatMoney, formatPercent, toAmount } from './metricsFormat'
import { MetricStat, MetricStatSkeleton } from './MetricStat'
import { PeriodPicker } from './PeriodPicker'
import { parseProductId } from './productMetricsLinks'
import { QueryAlerts } from './QueryAlerts'
import { useMetricsQuery } from './useMetricsQuery'
import { useMetricsSearch } from './useMetricsSearch'

const EMPTY = '—'

const ABC_HINT =
  'Pareto por monto del periodo, calculado por el backend: A hasta el 80 % acumulado, B hasta el 95 %, C el resto. Un producto sin venta no entra al Pareto.'

/** Las unidades llegan como decimal de hasta 4 cifras ("120.0000"). */
function formatUnits(units: string): string {
  return formatCount(toAmount(units))
}

/** Variación contra el periodo anterior: la manda el API, aquí solo se le pone el signo. */
function formatChange(change: number | null): string {
  if (change === null) return EMPTY
  return change > 0 ? `+${formatPercent(change)}` : formatPercent(change)
}

/** La suma de los vendedores puede quedar corta: las líneas sin vendedor no se atribuyen. */
function unattributed(amount: Money, sellers: ProductSeller[]): number {
  const total = toAmount(amount) ?? 0
  const attributed = sellers.reduce((sum, seller) => sum + (toAmount(seller.amount) ?? 0), 0)
  return Math.round((total - attributed) * 100) / 100
}

function SellersTable({ sellers }: { sellers: ProductSeller[] }) {
  if (sellers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Ningún vendedor registró venta de este producto en el periodo.</p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Vendedor</TableHead>
          <TableHead className="text-right">Monto</TableHead>
          <TableHead className="text-right">Unidades</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sellers.map((seller) => (
          <TableRow key={seller.user_id}>
            <TableCell className="max-w-72 truncate font-medium">{seller.name}</TableCell>
            <TableCell className="text-right">{formatMoney(seller.amount)}</TableCell>
            <TableCell className="text-right text-muted-foreground">{formatUnits(seller.units)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function ProductMetricsBody({ data }: { data: ProductMetricsResponse }) {
  const missing = unattributed(data.amount, data.sellers)

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Rendimiento</CardTitle>
          <CardDescription>Ventas confirmadas en el ERP, IVA incluido</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            <MetricStat label="Monto vendido" value={formatMoney(data.amount)} size="hero" className="lg:col-span-2" />
            <MetricStat label="Unidades" value={formatUnits(data.units)} note="En la unidad base del producto" />
          </div>
          <Separator />
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            <MetricStat
              label="Participación"
              value={formatPercent(data.share_percent)}
              meter={data.share_percent}
              note={`de ${formatMoney(data.period_total_amount)} vendidos en productos`}
            />
            <MetricStat
              label="Posición en el ranking"
              value={data.position === null ? EMPTY : `#${formatCount(data.position)}`}
              note={data.position === null ? 'No entró al ranking del periodo' : 'Por monto vendido'}
            />
            <MetricStat label="Ticket promedio" value={formatMoney(data.average_ticket)} note="Monto entre facturas" />
            <MetricStat
              label="Facturas"
              value={formatCount(data.invoices)}
              note="Ventas distintas que lo incluyen · su frecuencia"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cobertura</CardTitle>
          <CardDescription>Qué parte de los que compraron se llevó este producto</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-3">
            <MetricStat label="Clientes" value={formatCount(data.customers)} note="Lo compraron en el periodo" />
            <MetricStat
              label="Penetración"
              value={formatPercent(data.penetration_percent)}
              meter={data.penetration_percent}
              note="Sobre la cartera del periodo"
            />
            <MetricStat label="Cartera del periodo" value={formatCount(data.portfolio_customers)} />
          </div>
          <p className="text-xs text-muted-foreground">
            La cartera del periodo son los clientes con al menos una venta confirmada en toda la empresa, no la cartera
            de un vendedor.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Salud</CardTitle>
          <CardDescription>Clase ABC y variación contra el periodo anterior</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-x-8 gap-y-6 sm:grid-cols-3">
          <MetricStat
            label="Clase ABC"
            hint={ABC_HINT}
            value={data.abc_class ?? EMPTY}
            note={data.abc_class === null ? 'Sin ventas que clasificar' : 'Por monto del periodo'}
          />
          <MetricStat
            label="Variación"
            value={formatChange(data.trend.change_percent)}
            note={
              data.trend.change_percent === null
                ? 'Sin base para comparar: el periodo anterior no vendió'
                : 'vs periodo anterior'
            }
          />
          <MetricStat
            label="Periodo anterior"
            value={formatMoney(data.trend.previous_amount)}
            note={formatRange(data.trend.previous_period)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vendedores</CardTitle>
          <CardDescription>Quiénes movieron el producto en el periodo</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <SellersTable sellers={data.sellers} />
          {missing > 0 && (
            <p className="text-xs text-muted-foreground">
              {formatMoney(missing)} del monto corresponde a líneas sin vendedor asignado en el ERP: suman al total,
              pero no se atribuyen a nadie.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ProductMetricsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {[4, 3, 3].map((stats, card) => (
        <Card key={card}>
          <CardContent className="grid gap-x-8 gap-y-6 pt-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: stats }, (_, i) => (
              <MetricStatSkeleton key={i} />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

interface BackState {
  /** De dónde se entró (el panel o el catálogo), para volver al mismo periodo. */
  from?: string
}

/**
 * Métricas de un producto en el periodo (PCRM-177, GET /metrics/products/:id).
 * `:id` es el `erp_product_id` del catálogo. El periodo vive en la URL
 * (?desde=&hasta=), igual que en /metricas, así que la ficha se puede compartir.
 */
export function ProductMetricsPage() {
  const { id } = useParams<{ id: string }>()
  const { range, setRange } = useMetricsSearch()
  const { state: locationState } = useLocation()
  const back = (locationState as BackState | null)?.from
  const backToPanel = !!back && back.startsWith('/metricas')
  const productId = parseProductId(id)

  const metrics = useMetricsQuery(
    productId === null ? null : `${productId}:${range.from}:${range.to}`,
    (signal) => getProductMetrics(productId!, range, { signal }),
    // La llave cambia de producto, no solo de periodo: mostrar las cifras del
    // anterior mientras llega el nuevo confundiría.
    { keepPrevious: false }
  )

  const data = metrics.state.status === 'ready' ? metrics.state.data : null
  const product = data?.product

  return (
    <AppShell>
      <div className="flex max-w-5xl flex-col gap-6">
        <Button asChild variant="ghost" size="sm" className="self-start">
          <Link to={back ?? '/productos'}>
            <ArrowLeft data-icon="inline-start" />
            {backToPanel ? 'Volver al panel de métricas' : 'Volver a productos'}
          </Link>
        </Button>

        <PageHeader
          title={product?.name ?? 'Métricas del producto'}
          subtitle={
            <span className="flex flex-wrap items-center gap-2">
              <span>{describeRange(range)}</span>
              {product && (
                <>
                  <span>· Código: {product.code ?? EMPTY}</span>
                  <Badge variant="outline">{product.product_group ?? EMPTY}</Badge>
                </>
              )}
            </span>
          }
          actions={productId === null ? undefined : <PeriodPicker value={range} onChange={setRange} />}
        />

        {productId === null ? (
          <Empty className="py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <PackageSearch />
              </EmptyMedia>
              <EmptyTitle>Producto no encontrado</EmptyTitle>
              <EmptyDescription>
                El identificador «{id}» no es un código de producto válido. Buscá el producto en el catálogo y abrí sus
                métricas desde ahí.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <QueryAlerts
              queries={[
                {
                  label: 'las métricas del producto',
                  endpoint: 'GET /api/v1/metrics/products/:id',
                  ...metrics,
                },
              ]}
            />
            {data ? (
              <ProductMetricsBody data={data} />
            ) : (
              (metrics.state.status === 'loading' || metrics.state.status === 'idle') && <ProductMetricsSkeleton />
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
