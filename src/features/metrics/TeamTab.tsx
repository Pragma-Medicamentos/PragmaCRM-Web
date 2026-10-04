import { useState } from 'react'
import { ChevronRight, UsersRound } from 'lucide-react'
import { Avatar, AvatarFallback } from '../../components/ui/avatar'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../../components/ui/empty'
import { Progress } from '../../components/ui/progress'
import { Skeleton } from '../../components/ui/skeleton'
import { ComparisonLegend } from './charts/ComparisonLegend'
import { SellersSalesChart } from './charts/SellersSalesChart'
import type { MetricsRange, SellerPerformance } from './metrics.types'
import { getSellerPerformance } from './metricsApi'
import { type ComparisonTarget, formatRange } from './metricsDates'
import { formatCount, formatMoney, formatPercent, initials } from './metricsFormat'
import { QueryAlerts } from './QueryAlerts'
import { SellerDetailSheet } from './SellerDetailSheet'
import { Refreshing, isRefreshing } from './slots'
import { SortableTable, type SortableColumn } from './SortableTable'
import { useMetricsQuery } from './useMetricsQuery'

function ComplianceCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground">Sin meta</span>
  return (
    <div className="flex items-center justify-end gap-2.5">
      <Progress value={Math.min(value, 100)} className="h-1.5 w-14" aria-hidden />
      <span className="w-12 tabular-nums">{formatPercent(value)}</span>
    </div>
  )
}

interface SellersTableProps {
  sellers: SellerPerformance[]
  onSelect: (seller: SellerPerformance) => void
}

/** "Desempeño por vendedor" de 1d. Ticket y Venta/ruta se ocultan en tablet (1v). */
function SellersTable({ sellers, onSelect }: SellersTableProps) {
  const columns: SortableColumn<SellerPerformance>[] = [
    {
      key: 'name',
      label: 'Vendedor',
      sort: { kind: 'text', value: (seller) => seller.name },
      headClassName: 'pl-4',
      cellClassName: 'pl-4',
      cell: (seller) => (
        <div className="flex items-center gap-3">
          <Avatar size="sm">
            <AvatarFallback>{initials(seller.name)}</AvatarFallback>
          </Avatar>
          <span className="truncate font-medium">{seller.name}</span>
          {!seller.active && <Badge variant="outline">Deshabilitado</Badge>}
        </div>
      ),
    },
    {
      key: 'stops_executed',
      label: 'Paradas',
      sort: { kind: 'number', value: (seller) => seller.stops_executed },
      headClassName: 'text-right',
      cellClassName: 'text-right tabular-nums',
      cell: (seller) => formatCount(seller.stops_executed),
    },
    {
      key: 'goal_compliance',
      label: 'Cumplim.',
      sort: { kind: 'number', value: (seller) => seller.goal_compliance },
      headClassName: 'text-right',
      cellClassName: 'text-right',
      cell: (seller) => <ComplianceCell value={seller.goal_compliance} />,
    },
    {
      key: 'average_ticket',
      label: 'Ticket prom.',
      sort: { kind: 'money', value: (seller) => seller.average_ticket },
      headClassName: 'hidden text-right lg:table-cell',
      cellClassName: 'hidden text-right tabular-nums lg:table-cell',
      cell: (seller) => formatMoney(seller.average_ticket),
    },
    {
      key: 'total_sales',
      label: 'Venta',
      sort: { kind: 'money', value: (seller) => seller.total_sales },
      headClassName: 'text-right',
      cellClassName: 'text-right font-medium tabular-nums',
      cell: (seller) => formatMoney(seller.total_sales),
    },
    {
      key: 'sales_per_route',
      label: 'Venta / ruta',
      sort: { kind: 'money', value: (seller) => seller.sales_per_route },
      headClassName: 'hidden text-right lg:table-cell',
      cellClassName: 'hidden text-right tabular-nums lg:table-cell',
      cell: (seller) => formatMoney(seller.sales_per_route),
    },
    {
      key: 'detail',
      label: <span className="sr-only">Detalle</span>,
      headClassName: 'w-12 pr-4',
      cellClassName: 'pr-4 text-right',
      cell: (seller) => (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Ver detalle de ${seller.name}`}
          onClick={(event) => {
            event.stopPropagation()
            onSelect(seller)
          }}
        >
          <ChevronRight />
        </Button>
      ),
    },
  ]

  return (
    <SortableTable
      rows={sellers}
      columns={columns}
      rowKey={(seller) => seller.user_id}
      rowClassName="cursor-pointer"
      onRowClick={onSelect}
    />
  )
}

function TeamSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-4 py-2">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}

/**
 * Pestaña Equipo (1d tabla + 1f detalle): responde "¿cómo va cada
 * vendedor?". El ranking de venta en barras da la lectura rápida; la tabla,
 * las cifras; el Sheet, el detalle de uno.
 */
export function TeamTab({ range, comparison }: { range: MetricsRange; comparison: ComparisonTarget | null }) {
  const sellers = useMetricsQuery(`${range.from}:${range.to}`, (signal) => getSellerPerformance(range, { signal }))
  const otherSellers = useMetricsQuery(comparison && `${comparison.range.from}:${comparison.range.to}`, (signal) =>
    getSellerPerformance(comparison!.range, { signal })
  )
  const [selected, setSelected] = useState<SellerPerformance | null>(null)

  const rows = sellers.state.status === 'ready' ? sellers.state.data.sellers : null
  const otherRows = comparison && otherSellers.state.status === 'ready' ? otherSellers.state.data.sellers : null

  return (
    <div className="flex flex-col gap-6">
      <QueryAlerts
        queries={[
          { label: 'los vendedores', endpoint: 'GET /api/v1/metrics/sellers', ...sellers },
          {
            label: 'los vendedores del periodo de comparación',
            endpoint: 'GET /api/v1/metrics/sellers (comparación)',
            ...otherSellers,
          },
        ]}
      />

      {rows && rows.length === 0 ? (
        <Card>
          <Empty className="py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UsersRound />
              </EmptyMedia>
              <EmptyTitle>Sin actividad de vendedores</EmptyTitle>
              <EmptyDescription>Ningún vendedor registró paradas ni ventas en este periodo. Prueba con otro rango.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Card>
      ) : (
        <Refreshing active={isRefreshing(sellers.state, otherSellers.state)} className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Venta por vendedor</CardTitle>
              <CardDescription>Ventas confirmadas atribuidas a cada vendedor</CardDescription>
            </CardHeader>
            <CardContent>
              {rows ? (
                <div className="flex flex-col gap-3">
                  <SellersSalesChart
                    sellers={rows}
                    comparison={comparison && otherRows ? { sellers: otherRows, label: comparison.label } : undefined}
                  />
                  {comparison && otherRows && (
                    <ComparisonLegend
                      items={[{ label: formatRange(range) }, { label: formatRange(comparison.range), compare: true }]}
                    />
                  )}
                </div>
              ) : (
                sellers.state.status === 'loading' && <Skeleton className="h-40 w-full" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Desempeño por vendedor</CardTitle>
              <CardDescription>Selecciona un vendedor para ver su detalle</CardDescription>
            </CardHeader>
            <CardContent className="border-t px-0">
              {rows ? <SellersTable sellers={rows} onSelect={setSelected} /> : sellers.state.status === 'loading' && <TeamSkeleton />}
            </CardContent>
          </Card>
        </Refreshing>
      )}

      <SellerDetailSheet
        seller={selected}
        range={range}
        comparison={comparison}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </div>
  )
}
