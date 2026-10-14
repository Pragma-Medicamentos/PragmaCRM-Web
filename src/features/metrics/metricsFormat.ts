import type { Money } from './metrics.types'

export type MetricUnit = 'count' | 'money' | 'percent' | 'minutes' | 'days'

/** Qué dirección es buena: define el tono del delta, nunca el color de la cifra. */
export type MetricPolarity = 'up' | 'down' | 'neutral'

const EMPTY = '—'

const countFormatter = new Intl.NumberFormat('es-SV')
const decimalFormatter = new Intl.NumberFormat('es-SV', { maximumFractionDigits: 1 })
const moneyFormatter = new Intl.NumberFormat('es-SV', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const wholeMoneyFormatter = new Intl.NumberFormat('es-SV', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})
const compactMoneyFormatter = new Intl.NumberFormat('es-SV', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})
const compactCountFormatter = new Intl.NumberFormat('es-SV', { notation: 'compact', maximumFractionDigits: 1 })

/** El backend manda el dinero como string decimal ("118.00"). */
export function toAmount(value: Money | number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  const amount = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(amount) ? amount : null
}

/** Montos de cuatro cifras o más sin centavos ($4,310); los chicos con centavos ($118.50). */
export function formatMoney(value: Money | number | null | undefined): string {
  const amount = toAmount(value)
  if (amount === null) return EMPTY
  return Math.abs(amount) >= 1000 ? wholeMoneyFormatter.format(amount) : moneyFormatter.format(amount)
}

/** Para ejes de gráfico: $4.3 K. */
export function formatMoneyCompact(value: number): string {
  return Math.abs(value) >= 1000 ? compactMoneyFormatter.format(value) : wholeMoneyFormatter.format(value)
}

export function formatCount(value: number | null | undefined): string {
  return value === null || value === undefined ? EMPTY : countFormatter.format(value)
}

/** Unidades: string del API con hasta 4 decimales. No se redondea a 3 como un conteo. */
const unitsFormatter = new Intl.NumberFormat('es-SV', { maximumFractionDigits: 4 })

export function formatUnits(value: string | number | null | undefined): string {
  const amount = toAmount(value)
  return amount === null ? EMPTY : unitsFormatter.format(amount)
}

export function formatCountCompact(value: number): string {
  return compactCountFormatter.format(value)
}

/** El backend ya manda 0–100 con un decimal. */
export function formatPercent(value: number | null | undefined): string {
  return value === null || value === undefined ? EMPTY : `${decimalFormatter.format(value)}%`
}

export function formatDays(value: number | null | undefined): string {
  return value === null || value === undefined ? EMPTY : `${countFormatter.format(value)} d`
}

export function formatMinutes(value: number | null | undefined): string {
  return value === null || value === undefined ? EMPTY : `${decimalFormatter.format(value)} min`
}

export function formatMetric(unit: MetricUnit, value: Money | number | null | undefined): string {
  switch (unit) {
    case 'money':
      return formatMoney(value)
    case 'percent':
      return formatPercent(toAmount(value))
    case 'minutes':
      return formatMinutes(toAmount(value))
    case 'days':
      return formatDays(toAmount(value))
    default:
      return formatCount(toAmount(value))
  }
}

export interface MetricDelta {
  /** "+8%", "−2.3 pts", "+4", "Sin cambio". */
  text: string
  direction: 'up' | 'down' | 'flat'
  tone: 'good' | 'bad' | 'neutral'
}

const MINUS = '−'

function signed(value: number, formatter: Intl.NumberFormat, suffix = ''): string {
  const sign = value > 0 ? '+' : value < 0 ? MINUS : ''
  return `${sign}${formatter.format(Math.abs(value))}${suffix}`
}

/**
 * Variación contra el periodo anterior. Porcentajes → diferencia en puntos;
 * días y minutos → diferencia absoluta; conteos y dinero → variación
 * relativa, salvo que el anterior sea 0 (conteos: diferencia absoluta;
 * dinero: sin base, se omite). `null` si no hay con qué comparar.
 */
export function computeDelta(
  unit: MetricUnit,
  value: Money | number | null | undefined,
  previous: Money | number | null | undefined,
  polarity: MetricPolarity
): MetricDelta | null {
  const current = toAmount(value)
  const before = toAmount(previous)
  if (current === null || before === null) return null

  const diff = current - before
  let text: string
  let isFlat: boolean

  switch (unit) {
    case 'percent':
      isFlat = Math.abs(diff) < 0.05
      text = `${signed(diff, decimalFormatter)} pts`
      break
    case 'days':
      isFlat = Math.round(diff) === 0
      text = signed(Math.round(diff), countFormatter, ' d')
      break
    case 'minutes':
      isFlat = Math.abs(diff) < 0.05
      text = signed(diff, decimalFormatter, ' min')
      break
    default: {
      if (before === 0) {
        if (unit === 'money' && current !== 0) return null
        isFlat = diff === 0
        text = signed(diff, countFormatter)
        break
      }
      const relative = (diff / Math.abs(before)) * 100
      isFlat = Math.abs(relative) < 0.5
      text = `${signed(Math.round(relative), countFormatter)}%`
    }
  }

  if (isFlat) return { text: 'Sin cambio', direction: 'flat', tone: 'neutral' }

  const direction = diff > 0 ? 'up' : 'down'
  const tone = polarity === 'neutral' ? 'neutral' : polarity === direction ? 'good' : 'bad'
  return { text, direction, tone }
}

/** Iniciales para el Avatar de un vendedor. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?'
}
