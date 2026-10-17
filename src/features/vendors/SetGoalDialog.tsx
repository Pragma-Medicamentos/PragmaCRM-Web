import { useState } from 'react'
import { ApiError } from '../../lib/api/apiClient'
import { todayInSv } from '../metrics/metricsDates'
import { setVendorGoal } from './vendorsApi'
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

interface FormErrors {
  amount?: string
  month?: string
}

/** "2026-10" del mes en curso en El Salvador. */
function currentMonth(): string {
  return todayInSv().slice(0, 7)
}

function validate(amount: string, month: string): FormErrors {
  const errors: FormErrors = {}
  const value = Number(amount)
  if (!amount.trim()) errors.amount = 'El monto es obligatorio.'
  else if (!Number.isFinite(value) || value < 0) errors.amount = 'Ingresa un monto válido, 0 o mayor.'
  else if (Math.abs(value * 100 - Math.round(value * 100)) > 1e-6) errors.amount = 'Usa como máximo 2 decimales.'
  if (!/^\d{4}-\d{2}$/.test(month)) errors.month = 'Elige el mes desde el que aplica.'
  return errors
}

interface SetGoalDialogProps {
  vendor: Pick<Vendor, 'id' | 'name'>
  /** Meta vigente, para precargar el monto. */
  current: VendorGoal | null
  onClose: () => void
  onSaved: (goal: VendorGoal) => void
}

/**
 * Cambiar la meta mensual de un vendedor (PCRM-173). La meta es fija: aplica
 * desde el mes elegido en adelante, hasta que se cambie otra vez. Los meses
 * anteriores conservan la meta que tenían. Un monto de 0 quita la meta desde
 * ese mes.
 */
export function SetGoalDialog({ vendor, current, onClose, onSaved }: SetGoalDialogProps) {
  const [amount, setAmount] = useState(current ? String(Number(current.goal_amount)) : '')
  const [month, setMonth] = useState(currentMonth())
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const isPastMonth = /^\d{4}-\d{2}$/.test(month) && month < currentMonth()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fieldErrors = validate(amount, month)
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) return

    const [year, monthNumber] = month.split('-').map(Number)
    setSubmitting(true)
    setSubmitError(null)
    try {
      const goal = await setVendorGoal(vendor.id, { year, month: monthNumber, goal_amount: Number(amount) })
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
              La meta de {vendor.name} aplica desde el mes que elijas en adelante, hasta que la vuelvas a cambiar.
            </DialogDescription>
          </DialogHeader>

          {submitError && (
            <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {submitError}
            </p>
          )}

          <div className="flex flex-col gap-4">
            <Field data-invalid={Boolean(errors.amount)}>
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
                aria-invalid={Boolean(errors.amount)}
              />
              <FieldDescription>0 quita la meta desde ese mes.</FieldDescription>
              {errors.amount && <FieldError>{errors.amount}</FieldError>}
            </Field>

            <Field data-invalid={Boolean(errors.month)}>
              <FieldLabel htmlFor="goal-month">Aplica desde</FieldLabel>
              <Input
                id="goal-month"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                aria-invalid={Boolean(errors.month)}
              />
              {isPastMonth && (
                <FieldDescription>
                  Es un mes pasado: el cumplimiento se recalcula desde ese mes.
                </FieldDescription>
              )}
              {errors.month && <FieldError>{errors.month}</FieldError>}
            </Field>
          </div>

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
