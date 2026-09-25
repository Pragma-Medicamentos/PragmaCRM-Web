import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  isValid,
  parse,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
  subWeeks,
  subYears,
} from 'date-fns'
import type { MetricsRange } from './metrics.types'

/*
 * Fechas de las métricas: el backend trabaja en días locales de El Salvador
 * (UTC-6, sin horario de verano) en formato YYYY-MM-DD. Aquí los días se
 * representan como `Date` a medianoche local del navegador solo para hacer
 * aritmética de calendario; nunca se mandan como timestamp.
 */

export const MAX_RANGE_DAYS = 366
const WEEK_OPTIONS = { weekStartsOn: 1 } as const

const svDayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/El_Salvador',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Hoy en El Salvador, como YYYY-MM-DD. */
export function todayInSv(): string {
  return svDayFormatter.format(new Date())
}

export function parseDay(day: string): Date {
  return parse(day, 'yyyy-MM-dd', new Date())
}

export function isValidDay(day: string | null): day is string {
  return !!day && /^\d{4}-\d{2}-\d{2}$/.test(day) && isValid(parseDay(day))
}

export function toDay(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function rangeLength({ from, to }: MetricsRange): number {
  return differenceInCalendarDays(parseDay(to), parseDay(from)) + 1
}

function range(from: Date, to: Date): MetricsRange {
  return { from: toDay(from), to: toDay(to) }
}

/** Mismo cálculo que `previous_period` del API: igual largo, termina el día antes de `from`. */
export function previousRange(value: MetricsRange): MetricsRange {
  const end = addDays(parseDay(value.from), -1)
  return range(addDays(end, -(rangeLength(value) - 1)), end)
}

/** Las mismas fechas un año antes, para comparar contra la misma temporada. */
export function yearAgoRange(value: MetricsRange): MetricsRange {
  return range(subYears(parseDay(value.from), 1), subYears(parseDay(value.to), 1))
}

/**
 * Contra qué periodo se dibujan los gráficos (?comparar=). No cambia el
 * delta de las KPIs: ese siempre es contra `previous_period`, lo decide el API.
 */
export type ComparisonMode = 'none' | 'previous' | 'year'

export interface ComparisonTarget {
  mode: Exclude<ComparisonMode, 'none'>
  /** Nombre corto para tooltips y leyendas: "Periodo anterior". */
  label: string
  range: MetricsRange
}

export const COMPARISON_OPTIONS: {
  mode: Exclude<ComparisonMode, 'none'>
  label: string
  resolve: (range: MetricsRange) => MetricsRange
}[] = [
  { mode: 'previous', label: 'Periodo anterior', resolve: previousRange },
  { mode: 'year', label: 'Mismo periodo, año anterior', resolve: yearAgoRange },
]

export function comparisonTarget(mode: ComparisonMode, range: MetricsRange): ComparisonTarget | null {
  const option = COMPARISON_OPTIONS.find((o) => o.mode === mode)
  return option ? { mode: option.mode, label: option.label, range: option.resolve(range) } : null
}

export type RangePresetId = 'this-week' | 'this-month' | 'last-month' | 'last-90' | 'year-to-date'

export const RANGE_PRESETS: { id: RangePresetId; label: string; resolve: () => MetricsRange }[] = [
  {
    id: 'this-week',
    label: 'Esta semana',
    resolve: () => {
      const today = parseDay(todayInSv())
      return range(startOfWeek(today, WEEK_OPTIONS), endOfWeek(today, WEEK_OPTIONS))
    },
  },
  {
    id: 'this-month',
    label: 'Este mes',
    resolve: () => {
      const today = parseDay(todayInSv())
      return range(startOfMonth(today), endOfMonth(today))
    },
  },
  {
    id: 'last-month',
    label: 'Mes anterior',
    resolve: () => {
      const previous = subMonths(parseDay(todayInSv()), 1)
      return range(startOfMonth(previous), endOfMonth(previous))
    },
  },
  {
    id: 'last-90',
    label: 'Últimos 90 días',
    resolve: () => {
      const today = parseDay(todayInSv())
      return range(addDays(today, -89), today)
    },
  },
  {
    id: 'year-to-date',
    label: 'Año a la fecha',
    resolve: () => {
      const today = parseDay(todayInSv())
      return range(startOfYear(today), today)
    },
  },
]

/** Mismo default que el backend (resolveRange): el mes local en curso completo. */
export function defaultMetricsRange(): MetricsRange {
  return RANGE_PRESETS[1].resolve()
}

/** Semana actual (lunes–domingo), el periodo fijo del Resumen (1a). */
export function currentWeekRange(): MetricsRange {
  return RANGE_PRESETS[0].resolve()
}

/** Las últimas `weeks` semanas completas terminando en la actual, para el gráfico del Resumen. */
export function lastWeeksRange(weeks: number): MetricsRange {
  const today = parseDay(todayInSv())
  return range(subWeeks(startOfWeek(today, WEEK_OPTIONS), weeks - 1), endOfWeek(today, WEEK_OPTIONS))
}

export function matchPreset(value: MetricsRange): RangePresetId | null {
  const preset = RANGE_PRESETS.find((p) => {
    const r = p.resolve()
    return r.from === value.from && r.to === value.to
  })
  return preset?.id ?? null
}

const dayMonth = new Intl.DateTimeFormat('es-SV', { day: 'numeric', month: 'short' })
const dayMonthYear = new Intl.DateTimeFormat('es-SV', { day: 'numeric', month: 'short', year: 'numeric' })
const monthYear = new Intl.DateTimeFormat('es-SV', { month: 'long', year: 'numeric' })
const shortMonth = new Intl.DateTimeFormat('es-SV', { month: 'short' })

/** "1 – 30 sept 2026", "25 ago – 7 sept 2026", "15 dic 2025 – 10 ene 2026". */
export function formatRange({ from, to }: MetricsRange): string {
  const a = parseDay(from)
  const b = parseDay(to)
  if (from === to) return dayMonthYear.format(a)
  if (a.getFullYear() !== b.getFullYear()) return `${dayMonthYear.format(a)} – ${dayMonthYear.format(b)}`
  if (a.getMonth() === b.getMonth()) return `${a.getDate()} – ${dayMonthYear.format(b)}`
  return `${dayMonth.format(a)} – ${dayMonthYear.format(b)}`
}

/** Un mes calendario completo se nombra como tal: "septiembre de 2026". */
export function describeRange(value: MetricsRange): string {
  const a = parseDay(value.from)
  const b = parseDay(value.to)
  const isFullMonth = toDay(startOfMonth(a)) === value.from && toDay(endOfMonth(a)) === value.to
  if (isFullMonth && a.getMonth() === b.getMonth()) {
    const label = monthYear.format(a)
    return label.charAt(0).toUpperCase() + label.slice(1)
  }
  return formatRange(value)
}

/** Etiqueta del eje X de una tendencia: "21 sept" por semana, "sept" por mes. */
export function formatBucket(bucketStart: string, granularity: 'week' | 'month'): string {
  const date = parseDay(bucketStart)
  return granularity === 'month' ? shortMonth.format(date) : dayMonth.format(date)
}

/** Etiqueta larga de un balde, para el tooltip: "Semana del 21 sept" / "Septiembre de 2026". */
export function formatBucketLong(bucketStart: string, granularity: 'week' | 'month'): string {
  const date = parseDay(bucketStart)
  if (granularity === 'month') {
    const label = monthYear.format(date)
    return label.charAt(0).toUpperCase() + label.slice(1)
  }
  return `Semana del ${dayMonth.format(date)}`
}

const dateFormatter = new Intl.DateTimeFormat('es-SV', { day: 'numeric', month: 'short', year: 'numeric' })

/** Timestamp ISO (UTC) → fecha local legible. */
export function formatTimestamp(iso: string | null): string {
  if (!iso) return 'Nunca'
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date)
}
