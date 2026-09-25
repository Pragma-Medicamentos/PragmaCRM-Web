import { Area, Bar, BarChart, CartesianGrid, ComposedChart, LabelList, Line, LineChart, XAxis, YAxis } from 'recharts'
import { cn } from 'cn'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '../../../components/ui/chart'
import type { TrendGranularity, TrendPoint } from '../metrics.types'
import { formatBucket, formatBucketLong } from '../metricsDates'
import { formatCount, formatCountCompact, formatMoney, formatMoneyCompact, toAmount } from '../metricsFormat'
import { ChartTooltipRow } from './ChartTooltipRow'

export type TrendMetric = 'total_sales' | 'average_ticket' | 'stops' | 'orders_count'

const METRICS: Record<TrendMetric, { label: string; money: boolean }> = {
  total_sales: { label: 'Venta', money: true },
  average_ticket: { label: 'Ticket promedio', money: true },
  stops: { label: 'Paradas', money: false },
  orders_count: { label: 'Pedidos', money: false },
}

interface TrendChartProps {
  points: TrendPoint[]
  granularity: TrendGranularity
  metric: TrendMetric
  kind: 'area' | 'line' | 'bar'
  /**
   * Énfasis (solo barras): el último balde en verde y con su valor escrito,
   * los anteriores en el gris de contexto. Para "¿cómo va esta semana?".
   */
  emphasizeLast?: boolean
  /**
   * Otro periodo dibujado detrás, en gris punteado (solo área y línea). Se
   * alinea por posición: el primer balde contra el primero, y así. El eje X
   * sigue siendo el del periodo principal; el tooltip nombra el balde del otro.
   */
  comparison?: { points: TrendPoint[]; label: string }
  className?: string
}

const MARGIN = { top: 20, right: 8, left: 0, bottom: 0 }

/**
 * Una serie de /metrics/trends en el tiempo. Una sola serie y un solo eje:
 * el título de la Card ya nombra lo que se grafica, así que no lleva leyenda.
 */
export function TrendChart({
  points,
  granularity,
  metric,
  kind,
  emphasizeLast = false,
  comparison,
  className,
}: TrendChartProps) {
  const { label, money } = METRICS[metric]
  const format = (value: number | null) => (money ? formatMoney(value) : formatCount(value))
  const lastIndex = points.length - 1
  const showComparison = !!comparison && kind !== 'bar'
  const readValue = (point: TrendPoint) => (money ? toAmount(point[metric]) : (point[metric] as number))

  const data = points.map((point, index) => {
    const value = readValue(point)
    const isLast = index === lastIndex
    const other = showComparison ? comparison.points[index] : undefined
    return {
      key: point.bucket_start,
      label: formatBucket(point.bucket_start, granularity),
      long: formatBucketLong(point.bucket_start, granularity),
      value,
      fill: emphasizeLast && !isLast ? 'var(--chart-4)' : 'var(--color-value)',
      valueLabel: emphasizeLast && isLast ? format(value) : '',
      compare: other ? readValue(other) : null,
      compareLong: other ? formatBucketLong(other.bucket_start, granularity) : '',
    }
  })

  const config = {
    value: { label, color: 'var(--chart-1)' },
    compare: { label: comparison?.label ?? '', color: 'var(--muted-foreground)' },
  } satisfies ChartConfig

  const axes = (
    <>
      <CartesianGrid vertical={false} />
      <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={12} />
      <YAxis
        tickLine={false}
        axisLine={false}
        width={money ? 60 : 36}
        allowDecimals={false}
        tickFormatter={(v: number) => (money ? formatMoneyCompact(v) : formatCountCompact(v))}
      />
      <ChartTooltip
        cursor={kind !== 'bar'}
        content={
          <ChartTooltipContent
            indicator="line"
            labelFormatter={(_, payload) => payload?.[0]?.payload?.long}
            formatter={(value, name, item) =>
              name === 'compare' ? (
                <ChartTooltipRow
                  color="var(--color-compare)"
                  label={`${comparison?.label} · ${item.payload.compareLong}`}
                  value={format(value as number | null)}
                />
              ) : (
                <ChartTooltipRow color="var(--color-value)" label={label} value={format(value as number | null)} />
              )
            }
          />
        }
      />
    </>
  )

  // Va antes de la serie principal para quedar detrás.
  const comparisonSeries = showComparison && (
    <Line
      dataKey="compare"
      type="monotone"
      stroke="var(--color-compare)"
      strokeWidth={1.5}
      strokeDasharray="4 4"
      dot={false}
      activeDot={{ r: 3, strokeWidth: 0, fill: 'var(--color-compare)' }}
      isAnimationActive={false}
    />
  )

  return (
    <ChartContainer config={config} className={cn('aspect-auto h-60 w-full', className)}>
      {kind === 'area' ? (
        <ComposedChart data={data} margin={MARGIN} accessibilityLayer>
          {axes}
          {comparisonSeries}
          <Area
            dataKey="value"
            type="monotone"
            stroke="var(--color-value)"
            strokeWidth={2}
            fill="var(--color-value)"
            fillOpacity={0.1}
            activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--background)' }}
          />
        </ComposedChart>
      ) : kind === 'line' ? (
        <LineChart data={data} margin={MARGIN} accessibilityLayer>
          {axes}
          {comparisonSeries}
          <Line
            dataKey="value"
            type="monotone"
            stroke="var(--color-value)"
            strokeWidth={2}
            connectNulls={false}
            dot={{ r: 4, fill: 'var(--color-value)', strokeWidth: 2, stroke: 'var(--background)' }}
            activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--background)' }}
          />
        </LineChart>
      ) : (
        <BarChart data={data} margin={MARGIN} accessibilityLayer>
          {axes}
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={24}>
            {emphasizeLast && (
              <LabelList dataKey="valueLabel" position="top" offset={8} className="fill-foreground" fontSize={12} />
            )}
          </Bar>
        </BarChart>
      )}
    </ChartContainer>
  )
}
