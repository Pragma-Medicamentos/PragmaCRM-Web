import { Bar, BarChart, LabelList, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '../../../components/ui/chart'
import type { ProductRankingRow } from '../metrics.types'
import { formatCount, formatMoney, toAmount } from '../metricsFormat'
import { ChartTooltipRow } from './ChartTooltipRow'

const ROW_HEIGHT = 36

const config = {
  sales: { label: 'Venta', color: 'var(--chart-1)' },
} satisfies ChartConfig

/**
 * Ranking de productos por monto (PCRM-172), con el mismo lenguaje visual que
 * el de vendedores: barras horizontales en el orden del API y el valor en la
 * punta. Las unidades van en el tooltip, junto al nombre completo.
 */
export function ProductsSalesChart({ products }: { products: ProductRankingRow[] }) {
  const data = products.map((product) => {
    const sales = toAmount(product.amount) ?? 0
    return {
      name: product.name,
      sales,
      salesLabel: formatMoney(sales),
      units: toAmount(product.units),
    }
  })

  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height: data.length * ROW_HEIGHT + 8 }}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 80, bottom: 0, left: 0 }} accessibilityLayer>
        <XAxis type="number" hide domain={[0, 'dataMax']} />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          width={224}
          // Tick propio: el de Recharts parte en dos líneas los nombres largos; el completo va en el tooltip.
          tick={({ x, y, payload }) => {
            const name = String(payload.value)
            return (
              <text x={x} y={y} dy={4} textAnchor="end" fontSize={12} className="fill-muted-foreground">
                {name.length > 30 ? `${name.slice(0, 29)}…` : name}
              </text>
            )
          }}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value, _name, item) => (
                <div className="flex w-full flex-col gap-1">
                  <ChartTooltipRow color="var(--color-sales)" label="Venta" value={formatMoney(Number(value))} />
                  <ChartTooltipRow label="Unidades" value={formatCount(item.payload.units)} />
                </div>
              )}
            />
          }
        />
        <Bar dataKey="sales" fill="var(--color-sales)" radius={[0, 4, 4, 0]} maxBarSize={20}>
          <LabelList dataKey="salesLabel" position="right" offset={8} className="fill-foreground" fontSize={12} />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
