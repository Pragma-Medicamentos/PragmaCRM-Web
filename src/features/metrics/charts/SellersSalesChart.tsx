import { Bar, BarChart, LabelList, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '../../../components/ui/chart'
import type { SellerPerformance } from '../metrics.types'
import { formatMoney, toAmount } from '../metricsFormat'
import { ChartTooltipRow } from './ChartTooltipRow'

const ROW_HEIGHT = 36
/** Con comparación cada vendedor lleva dos barras. */
const ROW_HEIGHT_COMPARED = 52

/**
 * Ranking de venta por vendedor: barras horizontales (nombres largos) en un
 * solo tono, en el orden en que las manda el API (venta desc). El valor va
 * escrito en la punta de cada barra, así que no hace falta eje X.
 */
interface SellersSalesChartProps {
  sellers: SellerPerformance[]
  /**
   * Otro periodo: una barra gris debajo de la de cada vendedor, emparejada
   * por `user_id`. Quien no vendió en ese periodo queda en $0; quien solo
   * vendió en ese periodo no aparece (el ranking es el del periodo actual).
   */
  comparison?: { sellers: SellerPerformance[]; label: string }
}

export function SellersSalesChart({ sellers, comparison }: SellersSalesChartProps) {
  const previousById = new Map(comparison?.sellers.map((s) => [s.user_id, toAmount(s.total_sales) ?? 0]))
  const data = sellers.map((seller) => {
    const sales = toAmount(seller.total_sales) ?? 0
    const compare = comparison ? (previousById.get(seller.user_id) ?? 0) : null
    return {
      name: seller.name,
      sales,
      salesLabel: formatMoney(sales),
      compare,
      compareLabel: compare === null ? '' : formatMoney(compare),
    }
  })
  const config = {
    sales: { label: 'Venta', color: 'var(--chart-1)' },
    compare: { label: comparison?.label ?? '', color: 'var(--muted-foreground)' },
  } satisfies ChartConfig
  const rowHeight = comparison ? ROW_HEIGHT_COMPARED : ROW_HEIGHT

  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height: data.length * rowHeight + 8 }}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 80, bottom: 0, left: 0 }} accessibilityLayer>
        <XAxis type="number" hide domain={[0, 'dataMax']} />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          width={132}
          tickFormatter={(name: string) => (name.length > 18 ? `${name.slice(0, 17)}…` : name)}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value, name) =>
                name === 'compare' ? (
                  <ChartTooltipRow
                    color="var(--color-compare)"
                    label={`Venta · ${comparison?.label}`}
                    value={formatMoney(Number(value))}
                  />
                ) : (
                  <ChartTooltipRow color="var(--color-sales)" label="Venta" value={formatMoney(Number(value))} />
                )
              }
            />
          }
        />
        <Bar dataKey="sales" fill="var(--color-sales)" radius={[0, 4, 4, 0]} maxBarSize={20}>
          <LabelList dataKey="salesLabel" position="right" offset={8} className="fill-foreground" fontSize={12} />
        </Bar>
        {comparison && (
          <Bar
            dataKey="compare"
            fill="var(--color-compare)"
            fillOpacity={0.35}
            radius={[0, 4, 4, 0]}
            maxBarSize={14}
            isAnimationActive={false}
          >
            <LabelList dataKey="compareLabel" position="right" offset={8} className="fill-muted-foreground" fontSize={11} />
          </Bar>
        )}
      </BarChart>
    </ChartContainer>
  )
}
