import { Bar, BarChart, LabelList, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '../../../components/ui/chart'
import type { SellerPerformance } from '../metrics.types'
import { formatMoney, toAmount } from '../metricsFormat'
import { ChartTooltipRow } from './ChartTooltipRow'

const config = { sales: { label: 'Venta', color: 'var(--chart-1)' } } satisfies ChartConfig
const ROW_HEIGHT = 36

/**
 * Ranking de venta por vendedor: barras horizontales (nombres largos) en un
 * solo tono, en el orden en que las manda el API (venta desc). El valor va
 * escrito en la punta de cada barra, así que no hace falta eje X.
 */
export function SellersSalesChart({ sellers }: { sellers: SellerPerformance[] }) {
  const data = sellers.map((seller) => {
    const sales = toAmount(seller.total_sales) ?? 0
    return { name: seller.name, sales, salesLabel: formatMoney(sales) }
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
          width={132}
          tickFormatter={(name: string) => (name.length > 18 ? `${name.slice(0, 17)}…` : name)}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value) => (
                <ChartTooltipRow color="var(--color-sales)" label="Venta" value={formatMoney(Number(value))} />
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
