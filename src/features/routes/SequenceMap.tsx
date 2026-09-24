import { useEffect, useRef, useState } from 'react'
import { LoaderCircle, MapPinOff } from 'lucide-react'
import { getGoogleMapsApiKey, loadGoogleMaps } from '../../lib/googleMaps'
import type { GeoPoint } from './routes.types'

const DEFAULT_CENTER = { lat: 13.6929, lng: -89.2182 }
const DEFAULT_ZOOM = 12

export interface SequenceMapStop {
  key: string
  label: string
  location: GeoPoint
  /** Orden 1-based en la lista de paradas (incluye las sin GPS). */
  sequence: number
}

interface SequenceMapProps {
  stops: SequenceMapStop[]
}

type LoadState =
  | { status: 'loading' }
  | { status: 'missing-key' }
  | { status: 'error'; message: string }
  | { status: 'ready' }

/**
 * Panel "Recorrido resultante" (PCRM-141): mapa de solo lectura con pines
 * numerados según el orden de las paradas. No usa LocationPickerMap ni
 * AssignLocationDialog — esos son para editar la ubicación de un cliente,
 * no para mostrar la secuencia de una ruta.
 */
export function SequenceMap({ stops }: SequenceMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const pathRef = useRef<google.maps.Polyline | null>(null)

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
      pathRef.current?.setMap(null)
      pathRef.current = null
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || loadState.status !== 'ready') return

    markersRef.current.forEach((marker) => marker.setMap(null))
    markersRef.current = []
    pathRef.current?.setMap(null)
    pathRef.current = null

    if (stops.length === 0) return

    // Se lee en cada pintada para seguir el tema (el verde de dark es otro).
    const brand = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#008000'
    const ordered = stops.slice().sort((a, b) => a.sequence - b.sequence)

    if (ordered.length > 1) {
      pathRef.current = new google.maps.Polyline({
        map,
        path: ordered.map((stop) => stop.location),
        strokeColor: brand,
        strokeOpacity: 0.6,
        strokeWeight: 3,
        icons: [
          {
            icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 2.5, strokeOpacity: 0.9, fillOpacity: 0.9 },
            offset: '50%',
            repeat: '140px',
          },
        ],
      })
    }

    const bounds = new google.maps.LatLngBounds()
    ordered.forEach((stop) => {
      const marker = new google.maps.Marker({
        map,
        position: stop.location,
        title: `${stop.sequence}. ${stop.label}`,
        label: { text: String(stop.sequence), color: '#ffffff', fontSize: '12px', fontWeight: '600' },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 13,
          fillColor: brand,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        zIndex: 1000 - stop.sequence,
      })
      markersRef.current.push(marker)
      bounds.extend(stop.location)
    })

    if (stops.length === 1) {
      map.panTo(stops[0].location)
      map.setZoom(15)
    } else {
      map.fitBounds(bounds, 48)
    }
  }, [stops, loadState.status])

  if (loadState.status === 'missing-key' || loadState.status === 'error') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-muted/40 p-6 text-center">
        <MapPinOff className="size-5 text-muted-foreground" />
        {loadState.status === 'missing-key' ? (
          <p className="max-w-[22rem] text-sm text-muted-foreground">
            Falta configurar <code className="font-mono text-xs">VITE_GOOGLE_MAPS_API_KEY</code> para mostrar el mapa. El
            itinerario sigue funcionando.
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
      {loadState.status === 'ready' && stops.length === 0 && (
        <div className="pointer-events-none absolute inset-x-4 bottom-4 flex justify-center">
          <p className="rounded-lg bg-card px-3 py-2 text-sm text-muted-foreground shadow-float">
            Ninguna parada tiene ubicación GPS todavía.
          </p>
        </div>
      )}
    </div>
  )
}
