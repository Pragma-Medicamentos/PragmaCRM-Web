import { useState } from 'react'
import { ApiError } from '../../lib/api/apiClient'
import { changedFiscal, fiscalValuesFrom, validateFiscal, type FiscalErrors } from '../../lib/fiscal'
import { FiscalFieldsInputs } from '../../components/FiscalFieldsInputs'
import {
  updateCustomerCommercialProfile,
  updateCustomerContact,
  updateCustomerFiscalData,
} from './customersApi'
import {
  CUSTOMER_PERSONALITIES,
  CUSTOMER_POTENTIALS,
  PERSONALITY_LABELS,
  POTENTIAL_LABELS,
  type CustomerCore,
  type CustomerPersonality,
  type CustomerPotential,
  type UpdateCustomerCommercialProfileInput,
  type UpdateCustomerContactInput,
} from './customers.types'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Field, FieldLabel } from '../../components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Separator } from '../../components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'

// Select de Radix no admite value="" — este centinela es "sin clasificar" (null en la API).
const UNSET = 'none'

function SectionTitle({ children }: { children: string }) {
  return <h3 className="text-sm font-medium text-foreground">{children}</h3>
}

interface EditCustomerDialogProps {
  customer: CustomerCore
  onClose: () => void
  onUpdated: (customer: CustomerCore) => void
}

/**
 * Edición de los datos del cliente que no vienen de Efactsoft: contacto
 * (teléfono, nombre comercial), perfil comercial (RF-12) y datos fiscales
 * (PCRM-185). Cada sección es un PATCH propio en la API; solo se llama al de
 * las secciones que cambiaron. Nombre, crédito y demás vienen del ERP y no se
 * editan aquí: la próxima carga del JSON los sobrescribiría.
 */
export function EditCustomerDialog({ customer, onClose, onUpdated }: EditCustomerDialogProps) {
  const initialFiscal = fiscalValuesFrom(customer)
  const [tradeName, setTradeName] = useState(customer.trade_name ?? '')
  const [phone, setPhone] = useState(customer.phone ?? '')
  const [personality, setPersonality] = useState(customer.personality ?? UNSET)
  const [potential, setPotential] = useState(customer.potential ?? UNSET)
  const [fiscal, setFiscal] = useState(initialFiscal)
  const [errors, setErrors] = useState<FiscalErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fieldErrors = validateFiscal(fiscal)
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) return

    const contact: UpdateCustomerContactInput = {}
    if (tradeName.trim() !== (customer.trade_name ?? '')) contact.trade_name = tradeName.trim() || null
    if (phone.trim() !== (customer.phone ?? '')) contact.phone = phone.trim() || null

    const commercial: UpdateCustomerCommercialProfileInput = {}
    if (personality !== (customer.personality ?? UNSET)) {
      commercial.personality = personality === UNSET ? null : (personality as CustomerPersonality)
    }
    if (potential !== (customer.potential ?? UNSET)) {
      commercial.potential = potential === UNSET ? null : (potential as CustomerPotential)
    }

    const fiscalChanges = changedFiscal(initialFiscal, fiscal)

    const requests: (() => Promise<CustomerCore>)[] = []
    if (Object.keys(contact).length > 0) requests.push(() => updateCustomerContact(customer.id, contact))
    if (Object.keys(commercial).length > 0) {
      requests.push(() => updateCustomerCommercialProfile(customer.id, commercial))
    }
    if (Object.keys(fiscalChanges).length > 0) {
      requests.push(() => updateCustomerFiscalData(customer.id, fiscalChanges))
    }

    if (requests.length === 0) {
      onClose()
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    // En serie: cada respuesta trae el cliente completo, la última ya incluye todo.
    let latest: CustomerCore | null = null
    try {
      for (const request of requests) latest = await request()
      if (latest) onUpdated(latest)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No se pudieron guardar los cambios. Intenta de nuevo.'
      // El diálogo sigue abierto para corregir; si alguna sección ya quedó guardada, se avisa.
      setSubmitError(latest ? `${message} Parte de los cambios ya se guardó.` : message)
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
            <DialogDescription>
              {customer.name}. El nombre y el crédito vienen de Efactsoft y se actualizan con cada carga.
            </DialogDescription>
          </DialogHeader>

          {submitError && (
            <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {submitError}
            </p>
          )}

          <div className="flex flex-col gap-4">
            <SectionTitle>Contacto</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="edit-customer-trade-name">Nombre comercial</FieldLabel>
                <Input
                  id="edit-customer-trade-name"
                  type="text"
                  autoFocus
                  maxLength={255}
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-customer-phone">Teléfono</FieldLabel>
                <Input
                  id="edit-customer-phone"
                  type="tel"
                  maxLength={30}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </Field>
            </div>

            <Separator />
            <SectionTitle>Perfil comercial</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="edit-customer-personality">Personalidad</FieldLabel>
                <Select value={personality} onValueChange={setPersonality}>
                  <SelectTrigger id="edit-customer-personality">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNSET}>Sin clasificar</SelectItem>
                    {CUSTOMER_PERSONALITIES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {PERSONALITY_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-customer-potential">Potencial de compra</FieldLabel>
                <Select value={potential} onValueChange={setPotential}>
                  <SelectTrigger id="edit-customer-potential">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNSET}>Sin clasificar</SelectItem>
                    {CUSTOMER_POTENTIALS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {POTENTIAL_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Separator />
            <SectionTitle>Datos fiscales</SectionTitle>
            <FiscalFieldsInputs idPrefix="edit-customer" values={fiscal} errors={errors} onChange={setFiscal} />
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
