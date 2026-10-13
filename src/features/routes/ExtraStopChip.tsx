import { Check, X } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Spinner } from '../../components/ui/spinner'
import { STOP_TYPE_LABELS } from './routes.types'
import type { DailyRouteStop } from '../daily-route/dailyRoute.types'

interface ExtraStopChipProps {
  stop: DailyRouteStop
  busy: boolean
  onRemove: () => void
}

/** Parada extra (PCRM-158) de una fecha concreta, junto a las rutas recurrentes del día. */
export function ExtraStopChip({ stop, busy, onRemove }: ExtraStopChipProps) {
  const detail = [STOP_TYPE_LABELS[stop.stop_type], 'extra'].join(' · ')
  return (
    <div
      title={stop.reason ? `${stop.name} — ${stop.reason}` : stop.name}
      className="flex max-w-full min-w-0 items-center gap-1 rounded-lg border border-dashed border-primary/35 bg-card py-1.5 pr-1 pl-3"
    >
      <div className="min-w-0">
        <p className="truncate text-sm leading-tight font-medium text-foreground">{stop.name}</p>
        <p className="truncate text-xs leading-tight text-muted-foreground">{detail}</p>
      </div>
      {stop.completed_at ? (
        <span className="grid size-6 shrink-0 place-items-center text-primary" aria-label="Visitada">
          <Check className="size-3.5" />
        </span>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          disabled={busy}
          onClick={onRemove}
          aria-label={`Quitar la parada extra de ${stop.name}`}
          className="shrink-0 text-muted-foreground hover:bg-primary/10 hover:text-foreground"
        >
          {busy ? <Spinner /> : <X />}
        </Button>
      )}
    </div>
  )
}
