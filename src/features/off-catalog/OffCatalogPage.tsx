import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { PageHeader } from '../../components/PageHeader'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../components/ui/sheet'
import { Skeleton } from '../../components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import type { MetricsRange } from '../metrics/metrics.types'
import { MAX_RANGE_DAYS, RANGE_PRESETS, formatRange, formatTimestamp, isValidDay, rangeLength } from '../metrics/metricsDates'
import { formatCount, formatUnits } from '../metrics/metricsFormat'
import { MetricStat, MetricStatSkeleton } from '../metrics/MetricStat'
import { PeriodPicker } from '../metrics/PeriodPicker'
import { QueryAlerts } from '../metrics/QueryAlerts'
import { useMetricsQuery } from '../metrics/useMetricsQuery'
import { getOffCatalogDemand, getOffCatalogProductDemand } from './offCatalogApi'
import type { OffCatalogDemandProduct } from './offCatalog.types'

const LAST_90_DAYS = RANGE_PRESETS.find((preset) => preset.id === 'last-90')!

// Default de la pantalla 1u: la demanda se acumula despacio y un mes muestra poco.
function useOffCatalogRange(): { range: MetricsRange; setRange: (range: MetricsRange) => void } {
  const [params, setParams] = useSearchParams()
  const from = params.get('desde')
  const to = params.get('hasta')

  const range = useMemo<MetricsRange>(() => {
    if (isValidDay(from) && isValidDay(to) && from <= to) {
      const candidate = { from, to }
      if (rangeLength(candidate) <= MAX_RANGE_DAYS) return candidate
    }
    return LAST_90_DAYS.resolve()
  }, [from, to])

  const setRange = useCallback(
    (next: MetricsRange) => setParams({ desde: next.from, hasta: next.to }, { replace: true }),
    [setParams]
  )

  return { range, setRange }
}

function formatQuantity(value: number | null): string {
  return value === null ? '—' : `${formatUnits(value)} u`
}

function DemandTable({
  products,
  range,
  onSelect,
}: {
  products: OffCatalogDemandProduct[]
  range: MetricsRange
  onSelect: (product: OffCatalogDemandProduct) => void
}) {
  if (products.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-muted-foreground">
        Ningún vendedor registró productos fuera de catálogo en {formatRange(range)}.
      </p>
    )
  }

  return (
    <div className="max-h-[32rem] overflow-auto [&>[data-slot=table-container]]:overflow-visible">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow>
            <TableHead className="pl-4">Producto solicitado</TableHead>
            <TableHead className="text-right">Solicitudes</TableHead>
            <TableHead className="hidden text-right sm:table-cell">Clientes</TableHead>
            <TableHead className="hidden text-right md:table-cell">Cant. aprox.</TableHead>
            <TableHead className="hidden md:table-cell">Últ. solicitud</TableHead>
            <TableHead className="pr-4 text-right">
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="max-w-72 pl-4">
                <div className="truncate font-medium">{product.name}</div>
                <div className="truncate text-xs text-muted-foreground sm:hidden">
                  {formatCount(product.customers)} clientes
                </div>
              </TableCell>
              <TableCell className="text-right font-medium">{formatCount(product.requests)}</TableCell>
              <TableCell className="hidden text-right sm:table-cell">{formatCount(product.customers)}</TableCell>
              <TableCell className="hidden text-right text-muted-foreground md:table-cell">
                {formatQuantity(product.approx_quantity)}
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">
                {formatTimestamp(product.last_requested_at)}
              </TableCell>
              <TableCell className="pr-4 text-right">
                <Button variant="outline" size="sm" onClick={() => onSelect(product)}>
                  Ver detalle
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function DemandDetailSheet({
  product,
  range,
  onClose,
}: {
  product: OffCatalogDemandProduct | null
  range: MetricsRange
  onClose: () => void
}) {
  const query = useMetricsQuery(
    product ? `${product.id}:${range.from}:${range.to}` : null,
    (signal) => getOffCatalogProductDemand(product!.id, range, { signal }),
    { keepPrevious: false }
  )
  const data = query.state.status === 'ready' ? query.state.data : null

  return (
    <Sheet open={product !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto data-[side=right]:sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{product?.name}</SheetTitle>
          <SheetDescription>Solicitudes registradas en campo · {formatRange(range)}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 pb-6">
          <QueryAlerts
            queries={[
              { label: 'las solicitudes', endpoint: 'GET /api/v1/product-requests/demand/:id', ...query },
            ]}
          />

          {data ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden sm:table-cell">Vendedor</TableHead>
                  <TableHead className="text-right">Cant.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="text-muted-foreground">{formatTimestamp(request.requested_at)}</TableCell>
                    <TableCell className="max-w-56">
                      <div className="truncate">{request.target_name ?? '—'}</div>
                      {request.target_kind === 'prospect' && (
                        <Badge variant="secondary" className="mt-1">
                          Prospecto
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {request.seller_name ?? '—'}
                    </TableCell>
                    <TableCell className="text-right">{formatQuantity(request.requested_quantity)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            query.state.status === 'loading' && <Skeleton className="h-48" />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function OffCatalogPage() {
  const { range, setRange } = useOffCatalogRange()
  const [selected, setSelected] = useState<OffCatalogDemandProduct | null>(null)
  const query = useMetricsQuery(`${range.from}:${range.to}`, (signal) => getOffCatalogDemand(range, { signal }))
  const data = query.state.status === 'ready' ? query.state.data : null
  const loading = query.state.status === 'loading' || query.state.status === 'idle'

  return (
    <AppShell>
      <div className="flex max-w-5xl flex-col gap-6">
        <PageHeader
          title="Demanda insatisfecha"
          subtitle="Productos solicitados por clientes que hoy no están en inventario"
          actions={<PeriodPicker value={range} onChange={setRange} />}
        />

        <QueryAlerts
          queries={[{ label: 'la demanda insatisfecha', endpoint: 'GET /api/v1/product-requests/demand', ...query }]}
        />

        {(data || loading) && (
          <>
            <Card>
              <CardContent className="grid gap-x-8 gap-y-6 sm:grid-cols-3">
                {data ? (
                  <>
                    <MetricStat label="Solicitudes registradas" value={formatCount(data.totals.requests)} />
                    <MetricStat label="Productos distintos" value={formatCount(data.totals.products)} />
                    <MetricStat
                      label="Clientes que lo pidieron"
                      value={formatCount(data.totals.customers)}
                      note="Incluye prospectos"
                    />
                  </>
                ) : (
                  Array.from({ length: 3 }, (_, i) => <MetricStatSkeleton key={i} />)
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Productos solicitados</CardTitle>
                <CardDescription>
                  Ordenado por número de solicitudes: sirve para decidir qué línea nueva adquirir.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                {data ? (
                  <DemandTable products={data.products} range={range} onSelect={setSelected} />
                ) : (
                  <Skeleton className="mx-4 h-64" />
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <DemandDetailSheet product={selected} range={range} onClose={() => setSelected(null)} />
    </AppShell>
  )
}
