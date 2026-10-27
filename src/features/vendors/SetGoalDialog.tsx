import { useState } from 'react'
import { ApiError } from '../../lib/api/apiClient'
import { setVendorGoal } from './vendorsApi'
import { currentMonthInSv, formatMonth } from './goalFormat'
import type { Vendor, VendorGoal } from './vendors.types'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Field, FieldDescription, FieldError, FieldLabel } from '../../components/ui/field'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'

function validate(amount: string): string | undefined {
  const value = Number(amount)
  if (!amount.trim()) return 'El monto es obligatorio.'
  if (!Number.isFinite(value) || value < 0) return 'Ingresa un monto válido, 0 o mayor.'
  if (Math.abs(value * 100 - Math.round(value * 100)) > 1e-6) return 'Usa como máximo 2 decimales.'
  return undefined
}

interface SetGoalDialogProps {
  vendor: Pick<Vendor, 'id' | 'name'>
  /** Meta vigente, para precargar el monto. */
  current: VendorGoal | null
  onClose: () => void
  onSaved: (goal: VendorGoal) => void
}

/**
 * Cambiar la meta mensual de un vendedor (PCRM-173). Aplica siempre desde el
 * mes en curso: si ya se cambió este mes, reemplaza ese valor; los meses
 * cerrados conservan la meta que tenían. Un monto de 0 quita la meta.
 */
export function SetGoalDialog({ vendor, current, onClose, onSaved }: SetGoalDialogProps) {
  const [amount, setAmount] = useState(current ? String(Number(current.goal_amount)) : '')
  const [error, setError] = useState<string | undefined>()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const month = formatMonth(currentMonthInSv())

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fieldError = validate(amount)
    setError(fieldError)
    if (fieldError) return

    setSubmitting(true)
    setSubmitError(null)
    try {
      const goal = await setVendorGoal(vendor.id, { goal_amount: Number(amount) })
      onSaved(goal)
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'No se pudo guardar la meta. Intenta de nuevo.')
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>Cambiar meta mensual</DialogTitle>
            <DialogDescription>
              La nueva meta de {vendor.name} aplica desde {month} en adelante. Los meses anteriores conservan la suya.
            </DialogDescription>
          </DialogHeader>

          {submitError && (
            <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {submitError}
            </p>
          )}

          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor="goal-amount">Meta de venta mensual (USD)</FieldLabel>
            <Input
              id="goal-amount"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-invalid={Boolean(error)}
            />
            <FieldDescription>Si la cambias otra vez este mes, reemplaza a esta. 0 quita la meta.</FieldDescription>
            {error && <FieldError>{error}</FieldError>}
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Guardando…' : 'Guardar meta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
