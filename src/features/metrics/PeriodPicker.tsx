import { useEffect, useState } from 'react'
import { CalendarDays, ChevronDown } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { es } from 'react-day-picker/locale'
import { Button } from '../../components/ui/button'
import { Calendar } from '../../components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover'
import { Separator } from '../../components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '../../components/ui/sheet'
import type { MetricsRange } from './metrics.types'
import { MAX_RANGE_DAYS, RANGE_PRESETS, formatRange, matchPreset, parseDay, toDay, todayInSv } from './metricsDates'

interface PeriodPickerProps {
  value: MetricsRange
  onChange: (range: MetricsRange) => void
}

/** Por debajo de `sm` (640px) el Popover con dos meses no cabe. */
const PHONE_QUERY = '(max-width: 639px)'

function useIsPhone(): boolean {
  const [isPhone, setIsPhone] = useState(() => window.matchMedia(PHONE_QUERY).matches)
  useEffect(() => {
    const mql = window.matchMedia(PHONE_QUERY)
    const onChange = () => setIsPhone(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return isPhone
}

function toDateRange(range: MetricsRange): DateRange {
  return { from: parseDay(range.from), to: parseDay(range.to) }
}

/**
 * Filtro de periodo del panel: atajos a la izquierda y calendario de rango a
 * la derecha (en teléfono, una hoja desde abajo). Los atajos aplican al instante; un rango manual se confirma con
 * "Aplicar" para no disparar consultas con cada clic. El calendario no deja
 * elegir días futuros ni más de 366 días (límite del API).
 */
export function PeriodPicker({ value, onChange }: PeriodPickerProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DateRange | undefined>(() => toDateRange(value))
  const activePreset = matchPreset(value)
  const isPhone = useIsPhone()
  const today = parseDay(todayInSv())

  function handleOpenChange(next: boolean) {
    if (next) setDraft(toDateRange(value))
    setOpen(next)
  }

  function apply(range: MetricsRange) {
    onChange(range)
    setOpen(false)
  }

  const draftComplete = !!draft?.from && !!draft?.to
  const draftLabel = draftComplete
    ? formatRange({ from: toDay(draft.from!), to: toDay(draft.to!) })
    : 'Elige el día final'

  const trigger = (
    <Button variant="outline" aria-label={`Periodo: ${formatRange(value)}`}>
      <CalendarDays data-icon="inline-start" />
      {formatRange(value)}
      <ChevronDown data-icon="inline-end" />
    </Button>
  )

  const presets = RANGE_PRESETS.map((preset) => (
    <Button
      key={preset.id}
      variant={activePreset === preset.id ? 'secondary' : isPhone ? 'outline' : 'ghost'}
      size={isPhone ? 'default' : 'sm'}
      className="justify-start"
      onClick={() => apply(preset.resolve())}
    >
      {preset.label}
    </Button>
  ))

  const calendar = (
    <Calendar
      mode="range"
      locale={es}
      weekStartsOn={1}
      numberOfMonths={isPhone ? 1 : 2}
      defaultMonth={draft?.from ?? today}
      selected={draft}
      onSelect={setDraft}
      resetOnSelect
      max={MAX_RANGE_DAYS - 1}
      disabled={{ after: today }}
      className={isPhone ? 'mx-auto [--cell-size:--spacing(10)]' : undefined}
    />
  )

  const applyButton = (
    <Button
      size={isPhone ? 'default' : 'sm'}
      disabled={!draftComplete}
      onClick={() => draft?.from && draft.to && apply({ from: toDay(draft.from), to: toDay(draft.to) })}
    >
      Aplicar
    </Button>
  )

  // Teléfono: hoja desde abajo, un solo mes con celdas grandes y "Aplicar"
  // siempre a la vista. El Popover con dos meses no cabía en el ancho y
  // dejaba los atajos cortados y el botón fuera de pantalla.
  if (isPhone) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="bottom" className="max-h-[90dvh] gap-0 rounded-t-2xl">
          <SheetHeader className="pb-2">
            <SheetTitle>Periodo</SheetTitle>
            <SheetDescription>Elige un atajo o marca el día inicial y el final.</SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-col overflow-y-auto">
            <div className="grid grid-cols-2 gap-2 px-4 pb-3">{presets}</div>
            <Separator />
            {calendar}
          </div>
          <div className="flex items-center justify-between gap-3 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <span className="text-sm text-muted-foreground">{draftLabel}</span>
            {applyButton}
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <div className="flex flex-row">
          <div className="flex w-40 flex-col gap-1 p-2">{presets}</div>
          <Separator orientation="vertical" />
          <div className="flex flex-col">
            {calendar}
            <Separator />
            <div className="flex items-center justify-between gap-3 p-2.5">
              <span className="text-xs text-muted-foreground">{draftLabel}</span>
              {applyButton}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
