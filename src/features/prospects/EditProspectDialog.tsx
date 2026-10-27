import { useState } from 'react'
import { ApiError } from '../../lib/api/apiClient'
import { changedFiscal, fiscalValuesFrom, validateFiscal, type FiscalErrors } from '../../lib/fiscal'
import { FiscalFieldsInputs } from '../../components/FiscalFieldsInputs'
import { updateProspect } from './prospectsApi'
import type { Prospect, UpdateProspectInput } from './prospects.types'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Field, FieldError, FieldLabel } from '../../components/ui/field'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'

interface FormErrors extends FiscalErrors {
  name?: string
  phone?: string
}

interface EditProspectDialogProps {
  prospect: Prospect
  onClose: () => void
  onUpdated: (prospect: Prospect) => void
}

/**
 * Edición de prospecto (caso de uso "Editar y eliminar prospectos"): nombre,
 * teléfono y datos fiscales vía PATCH /api/v1/prospects/:id. Solo manda lo que
 * cambió. El vendedor que lo registró no se edita. Corregir el nombre sirve
 * también para que el cruce con Efactsoft (PCRM-186) lo encuentre.
 */
export function EditProspectDialog({ prospect, onClose, onUpdated }: EditProspectDialogProps) {
  const initialFiscal = fiscalValuesFrom(prospect)
  const [name, setName] = useState(prospect.name)
  const [phone, setPhone] = useState(prospect.phone ?? '')
  const [fiscal, setFiscal] = useState(initialFiscal)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fieldErrors: FormErrors = validateFiscal(fiscal)
    if (!name.trim()) fieldErrors.name = 'El nombre es obligatorio.'
    // La API no deja vaciar el teléfono; solo se exige si ya tenía uno.
    if (prospect.phone && !phone.trim()) fieldErrors.phone = 'El teléfono no puede quedar vacío.'
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) return

    const input: UpdateProspectInput = { ...changedFiscal(initialFiscal, fiscal) }
    if (name.trim() !== prospect.name) input.name = name.trim()
    if (phone.trim() && phone.trim() !== (prospect.phone ?? '')) input.phone = phone.trim()

    if (Object.keys(input).length === 0) {
      onClose()
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    try {
      onUpdated(await updateProspect(prospect.id, input))
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'No se pudo guardar el prospecto. Intenta de nuevo.')
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>Editar prospecto</DialogTitle>
            <DialogDescription>
              Registrado por {prospect.seller_name ?? 'un vendedor'}. Los datos fiscales son opcionales.
            </DialogDescription>
          </DialogHeader>

          {submitError && (
            <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {submitError}
            </p>
          )}

          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.name)}>
                <FieldLabel htmlFor="edit-prospect-name">Nombre</FieldLabel>
                <Input
                  id="edit-prospect-name"
                  type="text"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={Boolean(errors.name)}
                />
                {errors.name && <FieldError>{errors.name}</FieldError>}
              </Field>

              <Field data-invalid={Boolean(errors.phone)}>
                <FieldLabel htmlFor="edit-prospect-phone">Teléfono</FieldLabel>
                <Input
                  id="edit-prospect-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  aria-invalid={Boolean(errors.phone)}
                />
                {errors.phone && <FieldError>{errors.phone}</FieldError>}
              </Field>
            </div>

            <FiscalFieldsInputs idPrefix="edit-prospect" values={fiscal} errors={errors} onChange={setFiscal} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
