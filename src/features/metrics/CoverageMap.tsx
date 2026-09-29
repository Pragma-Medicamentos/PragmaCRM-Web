import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { differenceInCalendarDays } from 'date-fns'
import { ExternalLink, LoaderCircle, MapPinOff, UserRound, X } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { getGoogleMapsApiKey, loadGoogleMaps } from '../../lib/googleMaps'
import { useTheme } from '../../lib/theme'
import type { CoverageCustomer } from './metrics.types'
import { formatTimestamp, parseDay, todayInSv } from './metricsDates'
import { formatCount } from './metricsFormat'

const DEFAULT_CENTER = { lat: 13.6929, lng: -89.2182 }
const DEFAULT_ZOOM = 11

type LoadState =
  | { status: 'loading' }
  | { status: 'missing-key' }
  | { status: 'error'; message: string }
  | { status: 'ready' }

const MARKER_SCALE = 6
const SELECTED_SCALE = 9

function readToken(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

function lastVisitText(iso: string | null): string {
  if (!iso) return 'Nunca visitado'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return formatTimestamp(iso)
  const days = differenceInCalendarDays(parseDay(todayInSv()), date)
  const ago = days <= 0 ? 'hoy' : days === 1 ? 'ayer' : `hace ${formatCount(days)} días`
  return `${formatTimestamp(iso)} · ${ago}`
}

/**
 * Ficha del cliente al hacer clic en su pin: estado en el periodo, última
 * visita y atajos a su perfil y a Google Maps. Flota sobre el mapa (abajo a
 * la izquierda; a todo el ancho en teléfono) en vez de un InfoWindow, para
 * seguir el tema y los componentes de la app.
 */
function CustomerCard({ customer, onClose }: { customer: CoverageCustomer; onClose: () => void }) {
  const title = customer.trade_name ?? customer.name
  const directions = `https://www.google.com/maps/search/?api=1&query=${customer.lat},${customer.lng}`

  return (
    <div
      role="dialog"
      aria-label={title}
      className="absolute inset-x-3 bottom-3 z-20 flex flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground shadow-float sm:right-auto sm:w-80"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium leading-snug">{title}</p>
          {customer.trade_name && <p className="text-xs text-muted-foreground">{customer.name}</p>}
        </div>
        <Button variant="ghost" size="icon-xs" className="-mt-0.5 -mr-1 text-muted-foreground" onClick={onClose} aria-label="Cerrar">
          <X />
        </Button>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
        <dt className="text-muted-foreground">En el periodo</dt>
        <dd className="flex items-center gap-1.5 font-medium">
          <span
            aria-hidden
            className="size-2.5 rounded-full"
            style={{ backgroundColor: customer.visited ? 'var(--chart-1)' : 'var(--chart-2)' }}
          />
          {customer.visited ? 'Visitado' : 'Sin visita'}
        </dd>
        <dt className="text-muted-foreground">Última visita</dt>
        <dd>{lastVisitText(customer.last_visit_at)}</dd>
      </dl>

      <div className="flex gap-2">
        <Button size="sm" asChild className="flex-1">
          <Link to={`/clientes/${customer.customer_id}`}>
            <UserRound data-icon="inline-start" /> Ver perfil
          </Link>
        </Button>
        <Button size="sm" variant="outline" asChild className="flex-1">
          <a href={directions} target="_blank" rel="noreferrer">
            <ExternalLink data-icon="inline-start" /> Abrir en Maps
          </a>
        </Button>
      </div>
    </div>
  )
}

/**
 * Mapa "Cobertura de cartera" (1e): un pin por cliente con GPS, visitado
 * (--chart-1) o sin visita (--chart-2) en el periodo. Mismo ciclo de carga
 * que SequenceMap (routes); la leyenda con conteos vive fuera, en HTML.
 * Los sin visita se pintan encima, porque son los que hay que atender.
 * Clic en un pin → ficha del cliente (CustomerCard); clic en el mapa la cierra.
 */
export function CoverageMap({ customers }: { customers: CoverageCustomer[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const markerByIdRef = useRef(new Map<string, google.maps.Marker>())
  const { theme } = useTheme()
  const [selected, setSelected] = useState<CoverageCustomer | null>(null)

  const [loadState, setLoadState] = useState<LoadState>(() =>
    getGoogleMapsApiKey() ? { status: 'loading' } : { status: 'missing-key' }
  )

  useEffect(() => {
    if (loadState.status === 'missing-key') return
    let cancelled = false

    loadGoogleMaps()
      .then(() => {
        if (cancelled || !containerRef.current || mapRef.current) return
        mapRef.current = new google.maps.Map(containerRef.current, {
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
        })
        mapRef.current.addListener('click', () => setSelected(null))
        setLoadState({ status: 'ready' })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof Error && err.message === 'MISSING_KEY') {
          setLoadState({ status: 'missing-key' })
          return
        }
        setLoadState({
          status: 'error',
          message: err instanceof Error ? err.message : 'No se pudo cargar Google Maps.',
        })
      })

    return () => {
      cancelled = true
      markersRef.current.forEach((marker) => marker.setMap(null))
      markersRef.current = []
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || loadState.status !== 'ready') return

    // Un frame de espera: al cambiar de tema, el efecto de ThemeProvider (el
    // padre) pone la clase `dark` después de este efecto, y los tokens se
    // leerían todavía del tema anterior.
    const frame = requestAnimationFrame(() => paint(map))
    return () => cancelAnimationFrame(frame)
  }, [customers, loadState.status, theme])

  // Datos nuevos (otro periodo): la ficha abierta podría ya no corresponder.
  useEffect(() => setSelected(null), [customers])

  // El pin elegido crece y pasa al frente; sin repintar ni reencuadrar el mapa.
  useEffect(() => {
    markerByIdRef.current.forEach((marker, id) => {
      const icon = marker.getIcon() as google.maps.Symbol | undefined
      if (!icon) return
      const isSelected = id === selected?.customer_id
      marker.setIcon({ ...icon, scale: isSelected ? SELECTED_SCALE : MARKER_SCALE })
      marker.setZIndex(isSelected ? 3 : (marker.get('baseZ') as number))
    })
  }, [selected])

  useEffect(() => {
    if (!selected) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setSelected(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected])

  function paint(map: google.maps.Map) {
    markersRef.current.forEach((marker) => marker.setMap(null))
    markersRef.current = []
    markerByIdRef.current.clear()
    if (customers.length === 0) return

    // Se leen en cada pintada para seguir el tema (los pasos de dark son otros).
    const visitedColor = readToken('--chart-1', '#008000')
    const pendingColor = readToken('--chart-2', '#2a78d6')
    const ring = readToken('--background', '#ffffff')

    const bounds = new google.maps.LatLngBounds()
    customers.forEach((customer) => {
      const position = { lat: customer.lat, lng: customer.lng }
      const marker = new google.maps.Marker({
        map,
        position,
        title: customer.trade_name ?? customer.name,
        cursor: 'pointer',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: MARKER_SCALE,
          fillColor: customer.visited ? visitedColor : pendingColor,
          fillOpacity: 1,
          strokeColor: ring,
          strokeWeight: 2,
        },
        zIndex: customer.visited ? 1 : 2,
      })
      marker.set('baseZ', customer.visited ? 1 : 2)
      marker.addListener('click', () => setSelected(customer))
      markersRef.current.push(marker)
      markerByIdRef.current.set(customer.customer_id, marker)
      bounds.extend(position)
    })

    if (customers.length === 1) {
      map.panTo({ lat: customers[0].lat, lng: customers[0].lng })
      map.setZoom(15)
    } else {
      map.fitBounds(bounds, 48)
    }
  }

  if (loadState.status === 'missing-key' || loadState.status === 'error') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-muted/40 p-6 text-center">
        <MapPinOff className="size-5 text-muted-foreground" />
        {loadState.status === 'missing-key' ? (
          <p className="max-w-[22rem] text-sm text-muted-foreground">
            Falta configurar <code className="font-mono text-xs">VITE_GOOGLE_MAPS_API_KEY</code> para mostrar el mapa. Los
            conteos y el listado siguen disponibles.
          </p>
        ) : (
          <p role="alert" className="max-w-[22rem] text-sm text-destructive">
            {loadState.message}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="relative h-full">
      {loadState.status === 'loading' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-muted/40 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" /> Cargando mapa…
        </div>
      )}
      <div ref={containerRef} className="h-full w-full" />
      {selected && <CustomerCard customer={selected} onClose={() => setSelected(null)} />}
      {loadState.status === 'ready' && customers.length === 0 && (
        <div className="pointer-events-none absolute inset-x-4 bottom-4 flex justify-center">
          <p className="rounded-lg bg-card px-3 py-2 text-sm text-muted-foreground shadow-float">
            Ningún cliente activo tiene ubicación GPS todavía.
          </p>
        </div>
      )}
    </div>
  )
}
