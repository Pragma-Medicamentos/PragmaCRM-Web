import { useEffect, useRef, useState } from 'react'
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

    markersRef.current.forEach((marker) => marker.setMap(null))
    markersRef.current = []

    if (stops.length === 0) return

    const bounds = new google.maps.LatLngBounds()
    stops.forEach((stop) => {
      const marker = new google.maps.Marker({
        map,
        position: stop.location,
        label: String(stop.sequence),
        title: `${stop.sequence}. ${stop.label}`,
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

  if (loadState.status === 'missing-key') {
    return (
      <div className="flex h-full min-h-40 items-center justify-center rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">
        Falta configurar <code>VITE_GOOGLE_MAPS_API_KEY</code> para mostrar el mapa. La lista de paradas
        sigue disponible.
      </div>
    )
  }

  if (loadState.status === 'error') {
    return (
      <div role="alert" className="flex h-full min-h-40 items-center justify-center rounded-lg bg-destructive/10 p-4 text-center text-sm text-destructive">
        {loadState.message}
      </div>
    )
  }

  return (
    <div className="relative h-full min-h-40 overflow-hidden rounded-lg border border-border">
      {loadState.status === 'loading' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted text-sm text-muted-foreground">
          Cargando mapa…
        </div>
      )}
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
      {loadState.status === 'ready' && stops.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 text-sm text-muted-foreground">
          Sin paradas con ubicación GPS todavía.
        </div>
      )}
    </div>
  )
}
