import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '../../../components/ui/chart'
import type { RouteWeekdaySales } from '../metrics.types'
import { WEEKDAY_LABELS, WEEKDAY_LABELS_SHORT } from '../routeMetricsDisplay'
import { formatCount, formatMoney, formatMoneyCompact, toAmount } from '../metricsFormat'
import { ChartTooltipRow } from './ChartTooltipRow'

/**
 * Venta de la ruta por día de la semana (PCRM-178). El eje es el día, no el
 * tiempo: son siete baldes fijos que se repiten, así que va en barras y
 * nunca como área — una línea continua sugeriría una serie temporal.
 *
 * `comparison` es el mismo día en el periodo anterior: barra gris a la
 * izquierda, emparejada por `weekday` (0 domingo … 6 sábado). El eje X sigue
 * siendo el del periodo actual.
 */
export function RouteWeekdaySalesChart({
  weekdays,
  comparison,
}: {
  weekdays: RouteWeekdaySales[]
  comparison?: { weekdays: RouteWeekdaySales[]; label: string }
}) {
  const previousByWeekday = new Map(comparison?.weekdays.map((bucket) => [bucket.weekday, bucket]))
  const data = weekdays.map((bucket) => {
    const previous = previousByWeekday.get(bucket.weekday)
    return {
      label: WEEKDAY_LABELS_SHORT[bucket.weekday] ?? String(bucket.weekday),
      long: WEEKDAY_LABELS[bucket.weekday] ?? String(bucket.weekday),
      sales: toAmount(bucket.amount) ?? 0,
      orders: bucket.orders_count,
      compare: comparison ? (toAmount(previous?.amount) ?? 0) : null,
      compareOrders: previous?.orders_count ?? 0,
    }
  })

  const config = {
    sales: { label: 'Venta', color: 'var(--chart-1)' },
    compare: { label: comparison?.label ?? '', color: 'var(--muted-foreground)' },
  } satisfies ChartConfig

  return (
    <ChartContainer config={config} className="aspect-auto h-44 w-full">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={60} tickFormatter={(v: number) => formatMoneyCompact(v)} />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => payload?.[0]?.payload?.long}
              formatter={(value, name, item) =>
                name === 'compare' ? (
                  <div className="flex w-full flex-col gap-1">
                    <ChartTooltipRow
                      color="var(--color-compare)"
                      label={`Venta · ${comparison?.label}`}
                      value={formatMoney(Number(value))}
                    />
                    <ChartTooltipRow label="Pedidos" value={formatCount(item.payload.compareOrders)} />
                  </div>
                ) : (
                  <div className="flex w-full flex-col gap-1">
                    <ChartTooltipRow color="var(--color-sales)" label="Venta" value={formatMoney(Number(value))} />
                    <ChartTooltipRow label="Pedidos" value={formatCount(item.payload.orders)} />
                  </div>
                )
              }
            />
          }
        />
        {comparison && (
          <Bar
            dataKey="compare"
            fill="var(--color-compare)"
            fillOpacity={0.35}
            radius={[4, 4, 0, 0]}
            maxBarSize={22}
            isAnimationActive={false}
          />
        )}
        <Bar dataKey="sales" fill="var(--color-sales)" radius={[4, 4, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ChartContainer>
  )
}
