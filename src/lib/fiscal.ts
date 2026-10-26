// PCRM-185: mismos formatos que domain/schemas/fiscal.schema.ts de
// PragmaCRM-Api (la API los repite; esto solo adelanta el error en el form).
// Compartido por clientes y prospectos.

export interface FiscalValues {
  sanitary_registration: string
  nrc: string
  nit: string
  email: string
}

export type FiscalErrors = Partial<Record<keyof FiscalValues, string>>

const NRC_PATTERN = /^\d{1,8}-\d$/
// NIT de 14 dígitos o DUI homologado como NIT de persona natural.
const NIT_PATTERN = /^(\d{4}-\d{6}-\d{3}-\d|\d{8}-\d)$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateFiscal(values: FiscalValues): FiscalErrors {
  const errors: FiscalErrors = {}
  const nrc = values.nrc.trim()
  const nit = values.nit.trim()
  const email = values.email.trim()
  if (values.sanitary_registration.trim().length > 100) errors.sanitary_registration = 'Máximo 100 caracteres.'
  if (nrc && !NRC_PATTERN.test(nrc)) errors.nrc = 'Formato esperado: 230204-4.'
  if (nit && !NIT_PATTERN.test(nit)) errors.nit = 'Formato esperado: 0614-250621-108-6 o 01234567-8.'
  if (email && !EMAIL_PATTERN.test(email)) errors.email = 'Correo con formato inválido.'
  return errors
}

/** Valores iniciales del form a partir de lo que devuelve la API (null → ''). */
export function fiscalValuesFrom(source: {
  sanitary_registration?: string | null
  nrc?: string | null
  nit?: string | null
  email?: string | null
}): FiscalValues {
  return {
    sanitary_registration: source.sanitary_registration ?? '',
    nrc: source.nrc ?? '',
    nit: source.nit ?? '',
    email: source.email ?? '',
  }
}

/**
 * Solo los campos que cambiaron, recortados. La API guarda "" como NULL, así
 * que vaciar un campo lo limpia.
 */
export function changedFiscal(initial: FiscalValues, current: FiscalValues): Partial<FiscalValues> {
  const changed: Partial<FiscalValues> = {}
  for (const key of Object.keys(current) as (keyof FiscalValues)[]) {
    const value = current[key].trim()
    if (value !== initial[key].trim()) changed[key] = value
  }
  return changed
}
