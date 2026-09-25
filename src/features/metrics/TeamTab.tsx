import { useState } from 'react'
import { ChevronRight, UsersRound } from 'lucide-react'
import { Avatar, AvatarFallback } from '../../components/ui/avatar'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../../components/ui/empty'
import { Progress } from '../../components/ui/progress'
import { Skeleton } from '../../components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { SellersSalesChart } from './charts/SellersSalesChart'
import type { MetricsRange, SellerPerformance } from './metrics.types'
import { getSellerPerformance } from './metricsApi'
import { formatCount, formatMoney, formatPercent, initials } from './metricsFormat'
import { QueryAlerts } from './QueryAlerts'
import { SellerDetailSheet } from './SellerDetailSheet'
import { Refreshing, isRefreshing } from './slots'
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
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-4">Vendedor</TableHead>
          <TableHead className="text-right">Paradas</TableHead>
          <TableHead className="text-right">Cumplim.</TableHead>
          <TableHead className="hidden text-right lg:table-cell">Ticket prom.</TableHead>
          <TableHead className="text-right">Venta</TableHead>
          <TableHead className="hidden text-right lg:table-cell">Venta / ruta</TableHead>
          <TableHead className="w-12 pr-4">
            <span className="sr-only">Detalle</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sellers.map((seller) => (
          <TableRow key={seller.user_id} className="cursor-pointer" onClick={() => onSelect(seller)}>
            <TableCell className="pl-4">
              <div className="flex items-center gap-3">
                <Avatar size="sm">
                  <AvatarFallback>{initials(seller.name)}</AvatarFallback>
                </Avatar>
                <span className="truncate font-medium">{seller.name}</span>
                {!seller.active && <Badge variant="outline">Deshabilitado</Badge>}
              </div>
            </TableCell>
            <TableCell className="text-right tabular-nums">{formatCount(seller.stops_executed)}</TableCell>
            <TableCell className="text-right">
              <ComplianceCell value={seller.goal_compliance} />
            </TableCell>
            <TableCell className="hidden text-right tabular-nums lg:table-cell">
              {formatMoney(seller.average_ticket)}
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums">{formatMoney(seller.total_sales)}</TableCell>
            <TableCell className="hidden text-right tabular-nums lg:table-cell">
              {formatMoney(seller.sales_per_route)}
            </TableCell>
            <TableCell className="pr-4 text-right">
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
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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
export function TeamTab({ range }: { range: MetricsRange }) {
  const sellers = useMetricsQuery(`${range.from}:${range.to}`, (signal) => getSellerPerformance(range, { signal }))
  const [selected, setSelected] = useState<SellerPerformance | null>(null)

  const rows = sellers.state.status === 'ready' ? sellers.state.data.sellers : null

  return (
    <div className="flex flex-col gap-6">
      <QueryAlerts queries={[{ label: 'los vendedores', endpoint: 'GET /api/v1/metrics/sellers', ...sellers }]} />

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
        <Refreshing active={isRefreshing(sellers.state)} className="grid items-start gap-6 xl:grid-cols-5">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Venta por vendedor</CardTitle>
              <CardDescription>Ventas confirmadas atribuidas a cada vendedor</CardDescription>
            </CardHeader>
            <CardContent>
              {rows ? <SellersSalesChart sellers={rows} /> : sellers.state.status === 'loading' && <Skeleton className="h-40 w-full" />}
            </CardContent>
          </Card>

          <Card className="xl:col-span-3">
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

      <SellerDetailSheet seller={selected} range={range} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  )
}
