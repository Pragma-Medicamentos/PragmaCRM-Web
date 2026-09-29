import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '../../../components/ui/chart'
import type { PurchaseFrequencyBucket } from '../metrics.types'
import { formatCount } from '../metricsFormat'
import { ChartTooltipRow } from './ChartTooltipRow'


function bucketLabel(bucket: PurchaseFrequencyBucket): string {
  return bucket.max_days === null ? `${bucket.min_days}+ d` : `${bucket.min_days}–${bucket.max_days} d`
}

function bucketLong(bucket: PurchaseFrequencyBucket): string {
  return bucket.max_days === null
    ? `Compran cada ${bucket.min_days} días o más`
    : `Compran cada ${bucket.min_days} a ${bucket.max_days} días`
}

/**
 * Histograma de 1e "Frecuencia de compra por cliente": 5 rangos ordenados de
 * días entre compras. Una sola serie → un solo tono para todas las barras
 * (no una rampa: el alto de la barra ya dice cuántos clientes hay).
 */
interface PurchaseFrequencyChartProps {
  buckets: PurchaseFrequencyBucket[]
  /** Otro periodo en barras grises al lado; los rangos de días son fijos, así que se emparejan por posición. */
  comparison?: { buckets: PurchaseFrequencyBucket[]; label: string }
}

export function PurchaseFrequencyChart({ buckets, comparison }: PurchaseFrequencyChartProps) {
  const data = buckets.map((bucket, index) => ({
    label: bucketLabel(bucket),
    long: bucketLong(bucket),
    customers: bucket.customers,
    compare: comparison?.buckets[index]?.customers ?? null,
  }))
  const config = {
    customers: { label: 'Clientes', color: 'var(--chart-1)' },
    compare: { label: comparison?.label ?? '', color: 'var(--muted-foreground)' },
  } satisfies ChartConfig

  return (
    <ChartContainer config={config} className="aspect-auto h-52 w-full">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={36} allowDecimals={false} />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => payload?.[0]?.payload?.long}
              formatter={(value, name) =>
                name === 'compare' ? (
                  <ChartTooltipRow
                    color="var(--color-compare)"
                    label={`Clientes · ${comparison?.label}`}
                    value={formatCount(Number(value))}
                  />
                ) : (
                  <ChartTooltipRow color="var(--color-customers)" label="Clientes" value={formatCount(Number(value))} />
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
            maxBarSize={24}
            isAnimationActive={false}
          />
        )}
        <Bar dataKey="customers" fill="var(--color-customers)" radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ChartContainer>
  )
}
