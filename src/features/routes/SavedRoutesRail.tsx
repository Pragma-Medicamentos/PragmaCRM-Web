import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Input } from '../../components/ui/input'
import { DraggableRouteCard } from './DraggableRouteCard'
import type { Route, RouteAssignment } from './routes.types'

interface SavedRoutesRailProps {
  routes: Route[]
  assignments: RouteAssignment[]
  selectedVendorId: string | null
  onCreateRoute: () => void
}

/** Columna izquierda "Rutas guardadas" (wireframe 1g): lista arrastrable + alta de ruta. */
export function SavedRoutesRail({ routes, assignments, selectedVendorId, onCreateRoute }: SavedRoutesRailProps) {
  const [search, setSearch] = useState('')

  const filteredRoutes = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return routes
    return routes.filter(
      (route) => route.name.toLowerCase().includes(query) || (route.zone ?? '').toLowerCase().includes(query)
    )
  }, [routes, search])

  return (
    <div className="flex w-full flex-col gap-2 sm:w-56 sm:shrink-0">
      <p className="px-0.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Rutas guardadas</p>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar / filtrar por zona"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      <div className="flex flex-col gap-2">
        {filteredRoutes.map((route) => {
          const assignedDays = selectedVendorId
            ? assignments
                .filter((a) => a.route_id === route.id && a.user_id === selectedVendorId)
                .map((a) => a.day)
            : []
          return <DraggableRouteCard key={route.id} route={route} assignedDays={assignedDays} />
        })}

        {filteredRoutes.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">Ninguna ruta coincide con la búsqueda.</p>
        )}

        <button
          type="button"
          onClick={onCreateRoute}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border p-2.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <Plus className="size-4" /> Crear ruta nueva
        </button>
      </div>
    </div>
  )
}
