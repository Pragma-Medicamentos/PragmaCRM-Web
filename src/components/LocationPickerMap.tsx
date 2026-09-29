import { useEffect, useRef, useState } from 'react'
import { getGoogleMapsApiKey, loadGoogleMaps } from '../lib/googleMaps'

// Centro por defecto: San Salvador (sede Droguería Pragma).
const DEFAULT_CENTER = { lat: 13.6929, lng: -89.2182 }
const DEFAULT_ZOOM = 12
const POINT_ZOOM = 16

export interface LocationPoint {
  lat: number
  lng: number
}

interface LocationPickerMapProps {
  value: LocationPoint | null
  onChange: (point: LocationPoint) => void
  /** Radio de validación GPS (RF-06), solo visual. */
  radiusMeters?: number
  readOnly?: boolean
  className?: string
  /** Callback cuando el mapa está listo (p. ej. para Places Autocomplete). */
  onMapReady?: (map: google.maps.Map) => void
}

type LoadState =
  | { status: 'loading' }
  | { status: 'missing-key' }
  | { status: 'error'; message: string }
  | { status: 'ready' }

/**
 * Mapa Google Maps para fijar la ubicación GPS del cliente (RF-02): clic,
 * arrastre del pin y círculo de radio. Requiere VITE_GOOGLE_MAPS_API_KEY;
 * sin ella muestra un mensaje controlado (CA3).
 */
export function LocationPickerMap({
  value,
  onChange,
  radiusMeters = 80,
  readOnly = false,
  className,
  onMapReady,
}: LocationPickerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const circleRef = useRef<google.maps.Circle | null>(null)
  const onChangeRef = useRef(onChange)
  const onMapReadyRef = useRef(onMapReady)
  onChangeRef.current = onChange
  onMapReadyRef.current = onMapReady

  const [loadState, setLoadState] = useState<LoadState>(() =>
    getGoogleMapsApiKey() ? { status: 'loading' } : { status: 'missing-key' }
  )

  useEffect(() => {
    if (loadState.status === 'missing-key') return
    let cancelled = false

    loadGoogleMaps()
      .then(() => {
        if (cancelled || !containerRef.current || mapRef.current) return

        const map = new google.maps.Map(containerRef.current, {
          center: value ?? DEFAULT_CENTER,
          zoom: value ? POINT_ZOOM : DEFAULT_ZOOM,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        })
        mapRef.current = map

        if (!readOnly) {
          map.addListener('click', (e: google.maps.MapMouseEvent) => {
            if (!e.latLng) return
            onChangeRef.current({ lat: e.latLng.lat(), lng: e.latLng.lng() })
          })
        }

        setLoadState({ status: 'ready' })
        onMapReadyRef.current?.(map)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof Error && err.message === 'MISSING_KEY') {
          setLoadState({ status: 'missing-key' })
          return
        }
        setLoadState({
          status: 'error',
          message:
            err instanceof Error
              ? err.message
              : 'No se pudo cargar Google Maps. Revisá la clave de API.',
        })
      })

    return () => {
      cancelled = true
      markerRef.current?.setMap(null)
      circleRef.current?.setMap(null)
      markerRef.current = null
      circleRef.current = null
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly])

  useEffect(() => {
    const map = mapRef.current
    if (!map || loadState.status !== 'ready') return

    if (!value) {
      markerRef.current?.setMap(null)
      markerRef.current = null
      circleRef.current?.setMap(null)
      circleRef.current = null
      return
    }

    const position = { lat: value.lat, lng: value.lng }

    if (!markerRef.current) {
      markerRef.current = new google.maps.Marker({
        map,
        position,
        draggable: !readOnly,
      })
      markerRef.current.addListener('dragend', () => {
        const pos = markerRef.current?.getPosition()
        if (!pos) return
        onChangeRef.current({ lat: pos.lat(), lng: pos.lng() })
      })
    } else {
      markerRef.current.setPosition(position)
    }

    if (!circleRef.current) {
      circleRef.current = new google.maps.Circle({
        map,
        center: position,
        radius: radiusMeters,
        strokeColor: '#2563eb',
        strokeOpacity: 0.9,
        strokeWeight: 1,
        fillColor: '#2563eb',
        fillOpacity: 0.08,
      })
    } else {
      circleRef.current.setCenter(position)
      circleRef.current.setRadius(radiusMeters)
    }

    const bounds = map.getBounds()
    if (!bounds || !bounds.contains(position)) {
      map.panTo(position)
      if ((map.getZoom() ?? DEFAULT_ZOOM) < POINT_ZOOM) map.setZoom(POINT_ZOOM)
    }
  }, [value, radiusMeters, readOnly, loadState.status])

  if (loadState.status === 'missing-key') {
    return (
      <div className={className} style={{ height: 320, width: '100%' }} role="status">
        <div className="flex h-full items-center justify-center bg-muted p-4 text-center text-sm text-muted-foreground">
          Falta configurar <code>VITE_GOOGLE_MAPS_API_KEY</code> para mostrar el mapa. El resto del
          perfil sigue disponible.
        </div>
      </div>
    )
  }

  if (loadState.status === 'error') {
    return (
      <div className={className} style={{ height: 320, width: '100%' }} role="alert">
        <div className="flex h-full items-center justify-center bg-destructive/10 p-4 text-center text-sm text-destructive">
          {loadState.message}
        </div>
      </div>
    )
  }

  return (
    <div className={className} style={{ position: 'relative', height: 320, width: '100%' }}>
      {loadState.status === 'loading' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted text-sm text-muted-foreground">
          Cargando mapa…
        </div>
      )}
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
    </div>
  )
}
