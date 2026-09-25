import { useEffect, useRef, useState } from 'react'
import { LoaderCircle, MapPinOff } from 'lucide-react'
import { getGoogleMapsApiKey, loadGoogleMaps } from '../../lib/googleMaps'
import { useTheme } from '../../lib/theme'
import type { CoverageCustomer } from './metrics.types'
import { formatTimestamp } from './metricsDates'

const DEFAULT_CENTER = { lat: 13.6929, lng: -89.2182 }
const DEFAULT_ZOOM = 11

type LoadState =
  | { status: 'loading' }
  | { status: 'missing-key' }
  | { status: 'error'; message: string }
  | { status: 'ready' }

function readToken(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

/**
 * Mapa "Cobertura de cartera" (1e): un pin por cliente con GPS, visitado
 * (--chart-1) o sin visita (--chart-2) en el periodo. Mismo ciclo de carga
 * que SequenceMap (routes); la leyenda con conteos vive fuera, en HTML.
 * Los sin visita se pintan encima, porque son los que hay que atender.
 */
export function CoverageMap({ customers }: { customers: CoverageCustomer[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const { theme } = useTheme()

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
        })
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

  function paint(map: google.maps.Map) {
    markersRef.current.forEach((marker) => marker.setMap(null))
    markersRef.current = []
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
        title: `${customer.trade_name ?? customer.name} · ${
          customer.visited ? 'Visitado' : 'Sin visita'
        } · Última visita: ${formatTimestamp(customer.last_visit_at)}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: customer.visited ? visitedColor : pendingColor,
          fillOpacity: 1,
          strokeColor: ring,
          strokeWeight: 2,
        },
        zIndex: customer.visited ? 1 : 2,
      })
      markersRef.current.push(marker)
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
