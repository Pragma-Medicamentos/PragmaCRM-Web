import { RotateCw } from 'lucide-react'
import { PendingBackendNotice } from '../../components/PendingBackendNotice'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import type { MetricsQueryState } from './useMetricsQuery'

export interface TrackedQuery {
  /** Qué no cargó: "los indicadores", "la tendencia". */
  label: string
  endpoint: string
  state: MetricsQueryState<unknown>
  reload: () => void
}

/**
 * Avisos de las consultas de una vista que fallaron, arriba del contenido.
 * Cada sección sigue mostrando lo que sí cargó; un 404 "Not found" (endpoint
 * inexistente en el API desplegado) se muestra como pendiente de backend.
 */
export function QueryAlerts({ queries }: { queries: TrackedQuery[] }) {
  const pending = queries.filter((q) => q.state.status === 'pending-backend')
  const failed = queries.filter((q) => q.state.status === 'error')
  if (pending.length === 0 && failed.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      {pending.length > 0 && <PendingBackendNotice endpoints={pending.map((q) => q.endpoint)} />}
      {failed.map((query) => (
        <Alert key={query.endpoint} variant="destructive">
          <AlertTitle>No se pudieron cargar {query.label}</AlertTitle>
          <AlertDescription>{query.state.status === 'error' ? query.state.message : null}</AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" onClick={query.reload}>
              <RotateCw data-icon="inline-start" /> Reintentar
            </Button>
          </AlertAction>
        </Alert>
      ))}
    </div>
  )
}
