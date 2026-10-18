import { useState } from 'react'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Target } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Item, ItemActions, ItemContent, ItemTitle } from '../../components/ui/item'
import { Skeleton } from '../../components/ui/skeleton'
import { cn } from '../../lib/utils'
import { formatMoney } from '../metrics/metricsFormat'
import { capitalizeFirst, formatMonth, formatShortMonth } from './goalFormat'
import { SetGoalDialog } from './SetGoalDialog'
import { useVendorGoals } from './useVendorGoals'
import type { VendorGoalPeriod } from './vendors.types'

const HISTORY_PAGE_SIZE = 6

function goalLabel(amount: string): string {
  return Number(amount) > 0 ? formatMoney(amount) : 'Sin meta'
}

/** "Oct 2025 – jun 2026", "Jul 2026 – hoy" o un solo mes. */
function periodLabel(goal: VendorGoalPeriod): string {
  const from = capitalizeFirst(formatShortMonth(goal))
  if (!goal.until) return `${from} – hoy`
  if (goal.until.year === goal.year && goal.until.month === goal.month) return from
  return `${from} – ${formatShortMonth(goal.until)}`
}

interface VendorGoalCardProps {
  vendorId: string
  vendorName: string
  /** Para que la página refresque el desempeño, que depende de la meta. */
  onChanged?: () => void
}

/**
 * Meta mensual del vendedor (PCRM-173): la vigente y, en orden cronológico,
 * los periodos en que aplicó cada meta. La meta solo se cambia para el mes en
 * curso y no se elimina, así que los periodos cerrados no cambian.
 */
export function VendorGoalCard({ vendorId, vendorName, onChanged }: VendorGoalCardProps) {
  const [page, setPage] = useState(1)
  const { state, reload: reloadPage } = useVendorGoals(vendorId, page, HISTORY_PAGE_SIZE)
  const [editing, setEditing] = useState(false)

  const current = state.status === 'ready' ? state.goals.current : null
  const history = state.status === 'ready' ? state.goals.history : null

  // El cambio siempre cae en el mes en curso, que está en la primera página.
  function reload() {
    if (page === 1) reloadPage()
    else setPage(1)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meta mensual</CardTitle>
        <CardDescription>
          {state.status !== 'ready'
            ? 'Meta de venta del vendedor'
            : current
              ? `Vigente desde ${formatMonth(current)}`
              : 'Este vendedor no tiene meta vigente'}
        </CardDescription>
        <CardAction>
          <Button size="sm" onClick={() => setEditing(true)} disabled={state.status !== 'ready'}>
            <Target data-icon="inline-start" /> Cambiar meta
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {state.status === 'loading' && (
          <>
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-24 w-full" />
          </>
        )}

        {state.status === 'error' && (
          <Alert variant="destructive">
            <AlertTitle>No se pudo cargar la meta</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-2">
              {state.message}
              <Button size="sm" variant="outline" onClick={reloadPage}>
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {state.status === 'ready' && history && (
          <>
            <p className="text-2xl font-semibold tabular-nums">
              {current ? formatMoney(current.goal_amount) : <span className="text-muted-foreground">Sin meta</span>}
            </p>

            {history.items.length > 0 && (
              <ol aria-label="Historial de metas" className="flex flex-col">
                {history.items.map((goal, i) => {
                  const inForce = goal.until === null
                  // La línea sigue hacia la entrada siguiente, aunque esté en otra página.
                  const continues = i < history.items.length - 1 || history.page < history.total_pages
                  return (
                    <li key={goal.id} className="relative flex gap-3">
                      {continues && (
                        <span aria-hidden className="absolute top-5 bottom-0 left-[5px] w-px bg-border" />
                      )}
                      <span
                        aria-hidden
                        className={cn(
                          'relative mt-4 size-[11px] shrink-0 rounded-full border-2',
                          inForce ? 'border-primary bg-primary' : 'border-muted-foreground/40 bg-background'
                        )}
                      />
                      <Item size="sm" className="flex-1 px-0">
                        <ItemContent>
                          <ItemTitle className={cn(!inForce && 'font-normal text-muted-foreground')}>
                            {periodLabel(goal)}
                          </ItemTitle>
                        </ItemContent>
                        <ItemActions>
                          {inForce && <Badge variant="secondary">Vigente</Badge>}
                          <span className={cn('tabular-nums', !inForce && 'text-muted-foreground')}>
                            {goalLabel(goal.goal_amount)}
                          </span>
                        </ItemActions>
                      </Item>
                    </li>
                  )
                })}
              </ol>
            )}

            {history.total_pages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <span className="text-sm text-muted-foreground">
                  Página {history.page} de {history.total_pages} · {history.total} cambios
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={history.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft data-icon="inline-start" /> Recientes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={history.page >= history.total_pages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Anteriores <ChevronRight data-icon="inline-end" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      {editing && (
        <SetGoalDialog
          vendor={{ id: vendorId, name: vendorName }}
          current={current}
          onClose={() => setEditing(false)}
          onSaved={(goal) => {
            setEditing(false)
            toast.success(`Meta guardada desde ${formatMonth(goal)}.`)
            reload()
            onChanged?.()
          }}
        />
      )}
    </Card>
  )
}
