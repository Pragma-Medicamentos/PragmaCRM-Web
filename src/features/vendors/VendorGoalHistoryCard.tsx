import { Bar, CartesianGrid, Cell, ComposedChart, Scatter, XAxis, YAxis } from 'recharts'
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card'
import { ChartContainer, ChartTooltip, type ChartConfig } from '../../components/ui/chart'
import { Skeleton } from '../../components/ui/skeleton'
import { ChartTooltipRow } from '../metrics/charts/ChartTooltipRow'
import { formatMoney, formatMoneyCompact, formatPercent, toAmount } from '../metrics/metricsFormat'
import { useMetricsQuery } from '../metrics/useMetricsQuery'
import { capitalizeFirst, formatMonth, formatShortMonth } from './goalFormat'
import { getVendorGoalHistory } from './vendorsApi'

const MONTHS = 12
const MARGIN = { top: 12, right: 8, left: 0, bottom: 0 }
const BAR_SIZE = 22
/** La marca de meta sobresale un poco de la barra, para leerse aunque la venta la tape. */
const GOAL_MARK_HALF_WIDTH = BAR_SIZE / 2 + 5

type Status = 'met' | 'missed' | 'noGoal'

// Tres estados del mes; la marca de meta, en el color de texto.
const config = {
  met: { label: 'Cumplió', color: 'var(--chart-1)' },
  missed: { label: 'No cumplió', color: 'var(--destructive)' },
  noGoal: { label: 'Sin meta', color: 'var(--chart-4)' },
  goal: { label: 'Meta', color: 'var(--foreground)' },
} satisfies ChartConfig

const LEGEND: Status[] = ['met', 'missed', 'noGoal']

interface Point {
  key: string
  label: string
  long: string
  sales: number | null
  goal: number | null
  compliance: number | null
  status: Status
  inProgress: boolean
}

function HistoryTooltip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null
  return (
    <div className="grid min-w-44 gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium">
        {point.long}
        {point.inProgress && <span className="font-normal text-muted-foreground"> · en curso</span>}
      </div>
      <ChartTooltipRow color={`var(--color-${point.status})`} label="Venta" value={formatMoney(point.sales)} />
      <ChartTooltipRow
        color="var(--color-goal)"
        label="Meta"
        value={point.goal === null ? 'Sin meta' : formatMoney(point.goal)}
      />
      {point.compliance !== null && <ChartTooltipRow label="Cumplimiento" value={formatPercent(point.compliance)} />}
    </div>
  )
}

/** Raya horizontal de la meta, centrada en la barra del mes. */
function GoalMark({ cx, cy }: { cx?: number; cy?: number }) {
  // Sin meta Recharts igual llama a la forma, con coordenadas vacías.
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null
  return (
    <line
      x1={cx! - GOAL_MARK_HALF_WIDTH}
      x2={cx! + GOAL_MARK_HALF_WIDTH}
      y1={cy}
      y2={cy}
      stroke="var(--color-goal)"
      strokeWidth={2.5}
      strokeLinecap="round"
    />
  )
}

interface VendorGoalHistoryCardProps {
  vendorId: string
  /** Cambia cuando se guarda una meta, para volver a pedir el historial. */
  version: number
}

/**
 * Cumplimiento de meta mes a mes del vendedor (PCRM-198), como bullet chart:
 * una barra de venta por mes, verde si llegó a la meta y roja si no, y la meta
 * como una raya encima; gris y sin raya si el mes no tenía meta. El mes en
 * curso se colorea según cómo va hasta hoy.
 */
export function VendorGoalHistoryCard({ vendorId, version }: VendorGoalHistoryCardProps) {
  const { state, reload } = useMetricsQuery(
    `goal-history:${vendorId}:${version}`,
    (signal) => getVendorGoalHistory(vendorId, MONTHS, { signal }),
    { keepPrevious: true }
  )

  const months = state.status === 'ready' ? state.data : []
  const data: Point[] = months.map((m, i) => {
    const compliance = m.goal_compliance
    return {
      key: `${m.year}-${m.month}`,
      label: formatShortMonth(m),
      long: capitalizeFirst(formatMonth(m)),
      sales: toAmount(m.total_sales),
      goal: toAmount(m.goal_amount),
      compliance,
      status: compliance === null ? 'noGoal' : compliance >= 100 ? 'met' : 'missed',
      inProgress: i === months.length - 1,
    }
  })

  // Solo meses cerrados con meta: el en curso todavía puede cambiar.
  const closedPoints = data.filter((point) => !point.inProgress && point.compliance !== null)
  const closed = closedPoints.length
  const reached = closedPoints.filter((point) => point.status === 'met').length

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cumplimiento por mes</CardTitle>
        <CardDescription>Venta contra la meta vigente de cada mes, últimos {MONTHS} meses</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {(state.status === 'loading' || state.status === 'idle') && <Skeleton className="h-64 w-full" />}

        {(state.status === 'error' || state.status === 'pending-backend') && (
          <Alert variant="destructive">
            <AlertTitle>No se pudo cargar el historial</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-2">
              {state.status === 'error' ? state.message : 'El endpoint todavía no está disponible.'}
              <Button size="sm" variant="outline" onClick={reload}>
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {state.status === 'ready' && (
          <ChartContainer config={config} className="aspect-auto h-64 w-full">
            <ComposedChart data={data} margin={MARGIN} accessibilityLayer>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={12} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={60}
                allowDecimals={false}
                tickFormatter={(v: number) => formatMoneyCompact(v)}
              />
              <ChartTooltip cursor={false} content={<HistoryTooltip />} />
              <Bar dataKey="sales" radius={4} barSize={BAR_SIZE}>
                {data.map((point) => (
                  <Cell key={point.key} fill={`var(--color-${point.status})`} />
                ))}
              </Bar>
              <Scatter dataKey="goal" shape={<GoalMark />} isAnimationActive={false} />
            </ComposedChart>
          </ChartContainer>
        )}

        {state.status === 'ready' && (
          <ul aria-label="Leyenda" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {LEGEND.map((status) => (
              <li key={status} className="flex items-center gap-1.5">
                <span aria-hidden className="size-2.5 rounded-[2px]" style={{ backgroundColor: config[status].color }} />
                {config[status].label}
              </li>
            ))}
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="h-0.5 w-3.5 rounded-full bg-foreground" />
              {config.goal.label}
            </li>
          </ul>
        )}
      </CardContent>
      {state.status === 'ready' && (
        <CardFooter className="text-sm text-muted-foreground">
          {closed === 0
            ? 'Sin meses cerrados con meta en este periodo.'
            : `Cumplió la meta en ${reached} de ${closed} ${closed === 1 ? 'mes cerrado' : 'meses cerrados'} con meta.`}
        </CardFooter>
      )}
    </Card>
  )
}
