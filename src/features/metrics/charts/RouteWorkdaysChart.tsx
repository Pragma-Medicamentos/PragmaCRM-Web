import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '../../../components/ui/chart'
import type { RouteWorkday } from '../metrics.types'
import { formatCount, formatMoney, formatMoneyCompact, toAmount } from '../metricsFormat'
import { ChartTooltipRow } from './ChartTooltipRow'

const axisFormatter = new Intl.DateTimeFormat('es-SV', { day: 'numeric', month: 'short' })
const tooltipFormatter = new Intl.DateTimeFormat('es-SV', { day: 'numeric', month: 'short', year: 'numeric' })

/** `YYYY-MM-DD` es un día local: se arma en hora local para no correrse al día anterior. */
function parseLocalDay(date: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const config = {
  sales: { label: 'Última jornada', color: 'var(--chart-1)' },
  previous: { label: 'Jornadas anteriores', color: 'var(--muted-foreground)' },
} satisfies ChartConfig

/**
 * Las jornadas de la comparación (PCRM-188), de la más antigua a la última.
 * La última va en el color de la serie; las anteriores, en el gris del
 * periodo de comparación del panel. No es una serie temporal continua.
 */
export function RouteWorkdaysChart({ workdays }: { workdays: RouteWorkday[] }) {
  const chronological = [...workdays].reverse()
  const lastIndex = chronological.length - 1
  const data = chronological.map((workday, index) => ({
    key: workday.date,
    label: axisFormatter.format(parseLocalDay(workday.date)),
    long: tooltipFormatter.format(parseLocalDay(workday.date)),
    sales: toAmount(workday.amount) ?? 0,
    orders: workday.orders_count,
    latest: index === lastIndex,
  }))

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
              formatter={(value, _name, item) => (
                <div className="flex w-full flex-col gap-1">
                  <ChartTooltipRow
                    color={item.payload.latest ? 'var(--color-sales)' : 'var(--color-previous)'}
                    label={item.payload.latest ? 'Última jornada' : 'Jornada anterior'}
                    value={formatMoney(Number(value))}
                  />
                  <ChartTooltipRow label="Pedidos" value={formatCount(item.payload.orders)} />
                </div>
              )}
            />
          }
        />
        <Bar dataKey="sales" radius={[4, 4, 0, 0]} maxBarSize={36}>
          {data.map((entry) => (
            <Cell
              key={entry.key}
              fill={entry.latest ? 'var(--color-sales)' : 'var(--color-previous)'}
              fillOpacity={entry.latest ? 1 : 0.35}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
