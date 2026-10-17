import { useState } from 'react'
import { toast } from 'sonner'
import { Target, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Skeleton } from '../../components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { ApiError } from '../../lib/api/apiClient'
import { formatMoney } from '../metrics/metricsFormat'
import { SetGoalDialog } from './SetGoalDialog'
import { useVendorGoals } from './useVendorGoals'
import { deleteVendorGoal } from './vendorsApi'
import type { VendorGoal } from './vendors.types'

const monthFormatter = new Intl.DateTimeFormat('es-SV', { month: 'long', year: 'numeric', timeZone: 'UTC' })

/** "octubre de 2026". UTC para que el día 1 no se corra al mes anterior. */
function formatMonth(goal: Pick<VendorGoal, 'year' | 'month'>): string {
  return monthFormatter.format(new Date(Date.UTC(goal.year, goal.month - 1, 1)))
}

function goalLabel(amount: string): string {
  return Number(amount) > 0 ? formatMoney(amount) : 'Sin meta'
}

interface VendorGoalCardProps {
  vendorId: string
  vendorName: string
  /** Para que la página refresque el desempeño, que depende de la meta. */
  onChanged?: () => void
}

/**
 * Meta mensual del vendedor (PCRM-173): la vigente este mes y el historial de
 * cambios. Cada cambio aplica desde su mes en adelante; quitar uno deja
 * vigente el anterior desde ese mes.
 */
export function VendorGoalCard({ vendorId, vendorName, onChanged }: VendorGoalCardProps) {
  const { state, reload } = useVendorGoals(vendorId)
  const [editing, setEditing] = useState(false)
  const [removing, setRemoving] = useState<VendorGoal | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const current = state.status === 'ready' ? state.goals.current : null

  async function handleRemove(goal: VendorGoal) {
    setSubmitting(true)
    try {
      await deleteVendorGoal(vendorId, goal.id)
      toast.success(`Se quitó el cambio de ${formatMonth(goal)}.`)
      reload()
      onChanged?.()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo quitar el cambio de meta.')
    } finally {
      setSubmitting(false)
      setRemoving(null)
    }
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
              <Button size="sm" variant="outline" onClick={reload}>
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {state.status === 'ready' && (
          <>
            <p className="text-2xl font-semibold tabular-nums">
              {current ? formatMoney(current.goal_amount) : <span className="text-muted-foreground">Sin meta</span>}
            </p>

            {state.goals.history.length > 0 && (
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead>Desde</TableHead>
                    <TableHead className="text-right">Meta</TableHead>
                    <TableHead className="w-12">
                      <span className="sr-only">Acciones</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.goals.history.map((goal) => (
                    <TableRow key={goal.id}>
                      <TableCell className="capitalize">
                        {formatMonth(goal)}
                        {current?.id === goal.id && <span className="ml-2 text-xs text-muted-foreground">(vigente)</span>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{goalLabel(goal.goal_amount)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Quitar el cambio de ${formatMonth(goal)}`}
                          onClick={() => setRemoving(goal)}
                        >
                          <Trash2 />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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

      {removing && (
        <ConfirmDialog
          title="Quitar cambio de meta"
          message={`Desde ${formatMonth(removing)} volverá a aplicar la meta anterior (o ninguna, si no había). El cumplimiento de esos meses se recalcula.`}
          confirmLabel="Quitar"
          submitting={submitting}
          onCancel={() => setRemoving(null)}
          onConfirm={() => handleRemove(removing)}
        />
      )}
    </Card>
  )
}
