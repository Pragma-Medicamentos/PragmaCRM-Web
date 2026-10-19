import { todayInSv } from '../metrics/metricsDates'
import type { YearMonth } from './vendors.types'

const monthFormatter = new Intl.DateTimeFormat('es-SV', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const shortMonthFormatter = new Intl.DateTimeFormat('es-SV', { month: 'short', year: 'numeric', timeZone: 'UTC' })

// UTC para que el día 1 no se corra al mes anterior.
const toDate = ({ year, month }: YearMonth) => new Date(Date.UTC(year, month - 1, 1))

/** "octubre de 2026". */
export function formatMonth(month: YearMonth): string {
  return monthFormatter.format(toDate(month))
}

/** "oct 2026". */
export function formatShortMonth(month: YearMonth): string {
  return shortMonthFormatter.format(toDate(month)).replace('.', '')
}

/** Solo la primera letra: "Octubre de 2026", no "Octubre De 2026" como `capitalize`. */
export function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Mes en curso en El Salvador: el único al que se le puede fijar meta. */
export function currentMonthInSv(): YearMonth {
  const [year, month] = todayInSv().split('-').map(Number)
  return { year, month }
}
