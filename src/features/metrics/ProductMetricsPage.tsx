import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, PackageSearch, Users } from 'lucide-react'
import { AppShell } from '../../components/AppShell'
import { PageHeader } from '../../components/PageHeader'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../../components/ui/empty'
import { Progress } from '../../components/ui/progress'
import { Skeleton } from '../../components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import type { Money, ProductCustomersResponse, ProductMetricsResponse, ProductSeller } from './metrics.types'
import { getProductCustomers, getProductMetrics } from './metricsApi'
import { ComparisonPicker } from './ComparisonPicker'
import { type ComparisonTarget, comparisonTarget, describeRange, formatRange, formatTimestamp } from './metricsDates'
import { computeDelta, formatCount, formatMoney, toAmount } from './metricsFormat'
import { DeltaBadge, MetricStat, MetricStatSkeleton } from './MetricStat'
import { PeriodPicker } from './PeriodPicker'
import { parseProductId } from './productMetricsLinks'
import { QueryAlerts } from './QueryAlerts'
import { Refreshing, isRefreshing } from './slots'
import { useMetricsQuery, type MetricsQueryState } from './useMetricsQuery'
import { useMetricsSearch } from './useMetricsSearch'

const CUSTOMERS_PAGE_SIZE = 10

/** Las unidades llegan como decimal de hasta 4 cifras ("120.0000"). */
function formatUnits(units: string): string {
  return formatCount(toAmount(units))
}

/** Peso de una fila sobre el monto del producto, para la barra; nunca se muestra como cifra. */
function weightOf(amount: Money, total: Money | undefined): number {
  const whole = toAmount(total) ?? 0
  return whole > 0 ? ((toAmount(amount) ?? 0) / whole) * 100 : 0
}

/** La suma de los vendedores puede quedar corta: las líneas sin vendedor no se atribuyen. */
function unattributed(amount: Money, sellers: ProductSeller[]): number {
  const total = toAmount(amount) ?? 0
  const attributed = sellers.reduce((sum, seller) => sum + (toAmount(seller.amount) ?? 0), 0)
  return Math.round((total - attributed) * 100) / 100
}

interface Comparison {
  target: ComparisonTarget
  /** null mientras carga o si falló: las cifras se muestran sin variación. */
  data: ProductMetricsResponse | null
}

/** "vs periodo anterior": la etiqueta que acompaña a cada variación. */
function comparisonText(target: ComparisonTarget): string {
  return `vs ${target.label.charAt(0).toLowerCase()}${target.label.slice(1)}`
}

function SalesSummary({ data, comparison }: { data: ProductMetricsResponse | null; comparison: Comparison | null }) {
  const previous = comparison?.data ?? null
  const text = comparison ? comparisonText(comparison.target) : undefined
  // Sin base (el otro periodo no vendió) la variación en dinero no existe: se dice en vez de callarlo.
  const noBase = previous && toAmount(previous.amount) === 0 ? 'Sin ventas en el periodo de comparación' : null

  return (
    <Card className="@container/sales lg:col-span-2">
      <CardHeader>
        <CardTitle>Ventas</CardTitle>
        <CardDescription>
          {comparison
            ? `Ventas confirmadas en el ERP, IVA incluido · comparado con ${formatRange(comparison.target.range)}`
            : 'Ventas confirmadas en el ERP, IVA incluido'}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 items-start gap-x-12 gap-y-6 @2xl/sales:grid-cols-[minmax(0,1fr)_auto_auto] @2xl/sales:items-end">
        {data ? (
          <>
            <MetricStat
              label="Monto vendido"
              value={formatMoney(data.amount)}
              size="hero"
              delta={previous && computeDelta('money', data.amount, previous.amount, 'up')}
              comparison={text}
              note={noBase}
              className="col-span-2 @2xl/sales:col-span-1"
            />
            <MetricStat
              label="Unidades"
              value={formatUnits(data.units)}
              delta={previous && !noBase ? computeDelta('count', data.units, previous.units, 'up') : null}
              comparison={text}
              note={noBase ?? 'En la unidad base del producto'}
            />
            <MetricStat
              label="Ticket promedio"
              value={formatMoney(data.average_ticket)}
              delta={previous && computeDelta('money', data.average_ticket, previous.average_ticket, 'up')}
              comparison={text}
              note={noBase ?? 'Monto entre facturas'}
            />
          </>
        ) : (
          <>
            <div className="col-span-2 @2xl/sales:col-span-1">
              <MetricStatSkeleton size="hero" />
            </div>
            <MetricStatSkeleton />
            <MetricStatSkeleton />
          </>
        )}
      </CardContent>
    </Card>
  )
}

function CustomersTableSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-6 py-4">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-6" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  )
}

interface CustomersCardProps {
  state: MetricsQueryState<ProductCustomersResponse>
  productAmount: Money | undefined
  onPageChange: (page: number) => void
}

function CustomersCard({ state, productAmount, onPageChange }: CustomersCardProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const data = state.status === 'ready' ? state.data : null
  const offset = data ? (data.page - 1) * data.page_size : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clientes que lo compraron</CardTitle>
        <CardDescription>
          {data && data.total > 0
            ? `${formatCount(data.total)} ${data.total === 1 ? 'cliente' : 'clientes'}, del que más compró al que menos`
            : 'Del que más compró al que menos'}
        </CardDescription>
      </CardHeader>

      <CardContent className="px-0">
        <Refreshing active={isRefreshing(state)}>
          {(state.status === 'loading' || state.status === 'idle') && <CustomersTableSkeleton />}

          {data && data.items.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 pl-6 text-right">#</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="w-40 sm:w-48">Monto</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Unidades</TableHead>
                  <TableHead className="hidden text-right md:table-cell">Facturas</TableHead>
                  <TableHead className="hidden pr-6 text-right lg:table-cell">Última compra</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((customer, index) => (
                  <TableRow
                    key={customer.customer_id}
                    className="cursor-pointer"
                    onClick={() =>
                      navigate(`/clientes/${customer.customer_id}`, {
                        state: { from: location.pathname + location.search },
                      })
                    }
                  >
                    <TableCell className="pl-6 text-right text-muted-foreground tabular-nums">
                      {offset + index + 1}
                    </TableCell>
                    <TableCell className="max-w-48 sm:max-w-72 xl:max-w-md">
                      <Link
                        to={`/clientes/${customer.customer_id}`}
                        state={{ from: location.pathname + location.search }}
                        className="block truncate font-medium text-foreground hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {customer.name}
                      </Link>
                      {customer.trade_name && (
                        <div className="truncate text-xs text-muted-foreground">{customer.trade_name}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        <span className="font-medium tabular-nums">{formatMoney(customer.amount)}</span>
                        <Progress
                          value={weightOf(customer.amount, productAmount)}
                          className="h-1.5"
                          aria-label={`Monto de ${customer.name}: ${formatMoney(customer.amount)}`}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-right text-muted-foreground tabular-nums sm:table-cell">
                      {formatUnits(customer.units)}
                    </TableCell>
                    <TableCell className="hidden text-right text-muted-foreground tabular-nums md:table-cell">
                      {formatCount(customer.invoices)}
                    </TableCell>
                    <TableCell className="hidden pr-6 text-right text-muted-foreground lg:table-cell">
                      {formatTimestamp(customer.last_purchase_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {data && data.items.length === 0 && (
            <Empty className="py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Users />
                </EmptyMedia>
                <EmptyTitle>{data.total > 0 ? 'No hay más clientes' : 'Nadie lo compró en este periodo'}</EmptyTitle>
                <EmptyDescription>
                  {data.total > 0 ? 'Volvé a la primera página.' : 'Probá con un periodo más largo.'}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </Refreshing>
      </CardContent>

      {data && data.total_pages > 1 && (
        <CardFooter className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t">
          <span className="text-sm text-muted-foreground">
            Página {data.page} de {data.total_pages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={data.page <= 1 || isRefreshing(state)}
              onClick={() => onPageChange(data.page - 1)}
            >
              <ChevronLeft data-icon="inline-start" /> Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={data.page >= data.total_pages || isRefreshing(state)}
              onClick={() => onPageChange(data.page + 1)}
            >
              Siguiente <ChevronRight data-icon="inline-end" />
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  )
}

/** Variación de un vendedor contra el otro periodo; si allí no lo vendió, se dice. */
function SellerDelta({ amount, previous }: { amount: Money; previous: Money | undefined }) {
  const delta = previous === undefined ? null : computeDelta('money', amount, previous, 'up')
  return delta ? <DeltaBadge delta={delta} /> : <span className="text-xs text-muted-foreground">Sin ventas antes</span>
}

function SellersCard({ data, comparison }: { data: ProductMetricsResponse | null; comparison: Comparison | null }) {
  const missing = data ? unattributed(data.amount, data.sellers) : 0
  const previousBySeller = comparison?.data
    ? new Map(comparison.data.sellers.map((seller) => [seller.user_id, seller.amount]))
    : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendedores</CardTitle>
        <CardDescription>Quién lo vendió en el periodo</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {!data &&
          Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-1.5 w-full" />
            </div>
          ))}

        {data && data.sellers.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Ningún vendedor registró venta de este producto en el periodo.
          </p>
        )}

        {data && data.sellers.length > 0 && (
          <ul className="flex flex-col gap-5">
            {data.sellers.map((seller) => (
              <li key={seller.user_id} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-medium">{seller.name}</span>
                  <span className="shrink-0 text-sm font-medium tabular-nums">{formatMoney(seller.amount)}</span>
                </div>
                <Progress
                  value={weightOf(seller.amount, data.amount)}
                  className="h-1.5"
                  aria-label={`Monto de ${seller.name}: ${formatMoney(seller.amount)}`}
                />
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="text-xs text-muted-foreground tabular-nums">{formatUnits(seller.units)} unidades</span>
                  {previousBySeller && <SellerDelta amount={seller.amount} previous={previousBySeller.get(seller.user_id)} />}
                </div>
              </li>
            ))}
          </ul>
        )}

        {missing > 0 && (
          <p className="text-xs text-muted-foreground">
            {formatMoney(missing)} se vendieron sin vendedor asignado en el ERP: suman al monto, pero no se atribuyen a
            nadie.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

interface BackState {
  /** De dónde se entró (el panel o el catálogo), para volver al mismo periodo. */
  from?: string
}

/**
 * Ficha de un producto en el periodo (PCRM-177): cuánto vendió, a quién y
 * quién lo vendió. `:id` es el `erp_product_id` del catálogo. El periodo vive
 * en la URL (?desde=&hasta=), igual que en /metricas, así que se puede compartir.
 */
export function ProductMetricsPage() {
  const { id } = useParams<{ id: string }>()
  const { range, comparison: comparisonMode, setRange, setComparison } = useMetricsSearch()
  const target = comparisonTarget(comparisonMode, range)
  const { state: locationState } = useLocation()
  const back = (locationState as BackState | null)?.from
  const backToPanel = !!back && back.startsWith('/metricas')
  const productId = parseProductId(id)
  const [page, setPage] = useState(1)

  // Otro periodo es otra lista: se vuelve a la primera página.
  useEffect(() => setPage(1), [productId, range.from, range.to])

  const metrics = useMetricsQuery(
    productId === null ? null : `${productId}:${range.from}:${range.to}`,
    (signal) => getProductMetrics(productId!, range, { signal }),
    // La llave cambia de producto, no solo de periodo: mostrar las cifras del
    // anterior mientras llega el nuevo confundiría.
    { keepPrevious: false },
  )
  const other = useMetricsQuery(
    productId === null || !target ? null : `${productId}:${target.range.from}:${target.range.to}`,
    (signal) => getProductMetrics(productId!, target!.range, { signal }),
    { keepPrevious: false }
  )
  const customers = useMetricsQuery(
    productId === null ? null : `${productId}:${range.from}:${range.to}:${page}`,
    (signal) =>
      getProductCustomers(productId!, range, page, CUSTOMERS_PAGE_SIZE, {
        signal,
      }),
  )

  const data = metrics.state.status === 'ready' ? metrics.state.data : null
  const product = data?.product
  const comparison: Comparison | null = target
    ? { target, data: other.state.status === 'ready' ? other.state.data : null }
    : null

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <Button asChild variant="ghost" size="sm" className="self-start">
          <Link to={back ?? '/productos'}>
            <ArrowLeft data-icon="inline-start" />
            {backToPanel ? 'Volver al panel de métricas' : 'Volver a productos'}
          </Link>
        </Button>

        <PageHeader
          title={product?.name ?? 'Producto'}
          subtitle={
            <span className="flex flex-wrap items-center gap-2">
              {product?.code && <Badge variant="secondary">Código {product.code}</Badge>}
              {product?.product_group && <Badge variant="outline">{product.product_group}</Badge>}
              <span>{describeRange(range)}</span>
            </span>
          }
          actions={
            productId === null ? undefined : (
              <>
                <ComparisonPicker value={comparisonMode} onChange={setComparison} />
                <PeriodPicker value={range} onChange={setRange} />
              </>
            )
          }
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
                {
                  label: 'el periodo de comparación',
                  endpoint: 'GET /api/v1/metrics/products/:id',
                  ...other,
                },
                {
                  label: 'los clientes del producto',
                  endpoint: 'GET /api/v1/metrics/products/:id/customers',
                  ...customers,
                },
              ]}
            />
            {metrics.state.status !== 'error' && metrics.state.status !== 'pending-backend' && (
              <>
                <div className="grid gap-6 lg:grid-cols-3">
                  <SalesSummary data={data} comparison={comparison} />
                  <SellersCard data={data} comparison={comparison} />
                </div>
                <CustomersCard state={customers.state} productAmount={data?.amount} onPageChange={setPage} />
              </>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
