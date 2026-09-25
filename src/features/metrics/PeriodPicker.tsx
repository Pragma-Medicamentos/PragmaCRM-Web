import { useState } from 'react'
import { CalendarDays, ChevronDown } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { es } from 'react-day-picker/locale'
import { Button } from '../../components/ui/button'
import { Calendar } from '../../components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover'
import { Separator } from '../../components/ui/separator'
import type { MetricsRange } from './metrics.types'
import { MAX_RANGE_DAYS, RANGE_PRESETS, formatRange, matchPreset, parseDay, toDay, todayInSv } from './metricsDates'

interface PeriodPickerProps {
  value: MetricsRange
  onChange: (range: MetricsRange) => void
}

function toDateRange(range: MetricsRange): DateRange {
  return { from: parseDay(range.from), to: parseDay(range.to) }
}

/**
 * Filtro de periodo del panel: atajos a la izquierda y calendario de rango a
 * la derecha. Los atajos aplican al instante; un rango manual se confirma con
 * "Aplicar" para no disparar consultas con cada clic. El calendario no deja
 * elegir días futuros ni más de 366 días (límite del API).
 */
export function PeriodPicker({ value, onChange }: PeriodPickerProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DateRange | undefined>(() => toDateRange(value))
  const activePreset = matchPreset(value)
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

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" aria-label={`Periodo: ${formatRange(value)}`}>
          <CalendarDays data-icon="inline-start" />
          {formatRange(value)}
          <ChevronDown data-icon="inline-end" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <div className="flex flex-col sm:flex-row">
          <div className="flex flex-wrap gap-1 p-2 sm:w-40 sm:flex-col sm:flex-nowrap">
            {RANGE_PRESETS.map((preset) => (
              <Button
                key={preset.id}
                variant={activePreset === preset.id ? 'secondary' : 'ghost'}
                size="sm"
                className="justify-start"
                onClick={() => apply(preset.resolve())}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <Separator orientation="vertical" className="hidden sm:block" />
          <Separator className="sm:hidden" />
          <div className="flex flex-col">
            <Calendar
              mode="range"
              locale={es}
              weekStartsOn={1}
              numberOfMonths={2}
              defaultMonth={draft?.from ?? today}
              selected={draft}
              onSelect={setDraft}
              resetOnSelect
              max={MAX_RANGE_DAYS - 1}
              disabled={{ after: today }}
            />
            <Separator />
            <div className="flex items-center justify-between gap-3 p-2.5">
              <span className="text-xs text-muted-foreground">
                {draftComplete ? formatRange({ from: toDay(draft.from!), to: toDay(draft.to!) }) : 'Elige el día final'}
              </span>
              <Button
                size="sm"
                disabled={!draftComplete}
                onClick={() => draft?.from && draft.to && apply({ from: toDay(draft.from), to: toDay(draft.to) })}
              >
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
