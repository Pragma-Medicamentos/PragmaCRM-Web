import { Input } from './ui/input'
import { Field, FieldError, FieldLabel } from './ui/field'
import type { FiscalErrors, FiscalValues } from '../lib/fiscal'

interface FiscalFieldsInputsProps {
  idPrefix: string
  values: FiscalValues
  errors: FiscalErrors
  onChange: (values: FiscalValues) => void
}

const FIELDS: { key: keyof FiscalValues; label: string; placeholder?: string; type?: string }[] = [
  { key: 'sanitary_registration', label: 'Registro sanitario' },
  { key: 'nrc', label: 'NRC', placeholder: '230204-4' },
  { key: 'nit', label: 'NIT', placeholder: '0614-250621-108-6' },
  { key: 'email', label: 'Correo', type: 'email' },
]

/** Registro sanitario, NRC, NIT y correo (PCRM-185), opcionales. Usado por clientes y prospectos. */
export function FiscalFieldsInputs({ idPrefix, values, errors, onChange }: FiscalFieldsInputsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {FIELDS.map(({ key, label, placeholder, type }) => (
        <Field key={key} data-invalid={Boolean(errors[key])}>
          <FieldLabel htmlFor={`${idPrefix}-${key}`}>{label}</FieldLabel>
          <Input
            id={`${idPrefix}-${key}`}
            type={type ?? 'text'}
            placeholder={placeholder}
            value={values[key]}
            onChange={(e) => onChange({ ...values, [key]: e.target.value })}
            aria-invalid={Boolean(errors[key])}
          />
          {errors[key] && <FieldError>{errors[key]}</FieldError>}
        </Field>
      ))}
    </div>
  )
}
