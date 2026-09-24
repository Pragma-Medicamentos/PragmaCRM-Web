import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Card } from '../../components/ui/card'
import { InputGroup, InputGroupAddon, InputGroupInput } from '../../components/ui/input-group'
import { DraggableRouteCard } from './DraggableRouteCard'
import type { DayCoverage } from './DraggableRouteCard'
import type { Route } from './routes.types'

interface SavedRoutesRailProps {
  routes: Route[]
  coverageFor: (routeId: string) => DayCoverage[]
  onCreateRoute: () => void
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden className={`size-2.5 rounded-[3px] ${className}`} />
      {label}
    </span>
  )
}

/** Columna "Rutas guardadas": lista arrastrable con la cobertura semanal de cada ruta. */
export function SavedRoutesRail({ routes, coverageFor, onCreateRoute }: SavedRoutesRailProps) {
  const [search, setSearch] = useState('')

  const filteredRoutes = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return routes
    return routes.filter((route) =>
      [route.name, route.zone, route.municipality].some((field) => (field ?? '').toLowerCase().includes(query))
    )
  }, [routes, search])

  return (
    <Card className="max-h-[26rem] gap-0 py-0 lg:sticky lg:top-4 lg:max-h-[calc(100svh-7rem)]">
      <div className="flex flex-col gap-3 border-b px-4 pt-4 pb-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-foreground">Rutas guardadas</h2>
          <span className="text-xs text-muted-foreground tabular-nums">{routes.length}</span>
        </div>
        <InputGroup>
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            placeholder="Nombre, zona o municipio"
            aria-label="Buscar rutas"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </InputGroup>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <LegendSwatch className="bg-primary" label="Este vendedor" />
          <LegendSwatch className="bg-foreground/15" label="Otro vendedor" />
          <LegendSwatch className="ring-1 ring-border ring-inset" label="Libre" />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-1.5">
        {filteredRoutes.map((route) => (
          <DraggableRouteCard key={route.id} route={route} coverage={coverageFor(route.id)} />
        ))}

        {filteredRoutes.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            {routes.length === 0 ? 'Todavía no hay rutas guardadas.' : 'Ninguna ruta coincide con la búsqueda.'}
          </p>
        )}
      </div>

      <div className="border-t p-1.5">
        <button
          type="button"
          onClick={onCreateRoute}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/[0.07]"
        >
          <Plus className="size-4" /> Crear ruta nueva
        </button>
      </div>
    </Card>
  )
}
