import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// El bundler de Leaflet resuelve los íconos por defecto contra rutas relativas
// que Vite no reescribe. Sin este fix, el pin no se ve.
const defaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

// Centro por defecto: San Salvador (sede de Droguería Pragma), cuando el
// cliente todavía no tiene ubicación asignada.
const DEFAULT_CENTER: L.LatLngTuple = [13.6929, -89.2182]
const DEFAULT_ZOOM = 12
const POINT_ZOOM = 16

export interface LocationPoint {
  lat: number
  lng: number
}

interface LocationPickerMapProps {
  value: LocationPoint | null
  onChange: (point: LocationPoint) => void
  /** Radio de validación GPS (RF-06 / CLAUDE.md 5.3), solo visual — no se persiste por cliente. */
  radiusMeters?: number
  readOnly?: boolean
  className?: string
}

/**
 * Mapa para fijar manualmente la ubicación GPS de un cliente (RF-02): clic o
 * arrastre del pin, sin geocodificación de direcciones (evita depender de un
 * servicio externo no presupuestado, como el riesgo ya señalado con Google
 * Places en CLAUDE.md 9.2).
 */
export function LocationPickerMap({
  value,
  onChange,
  radiusMeters = 80,
  readOnly = false,
  className,
}: LocationPickerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const circleRef = useRef<L.Circle | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: value ? [value.lat, value.lng] : DEFAULT_CENTER,
      zoom: value ? POINT_ZOOM : DEFAULT_ZOOM,
    })
    mapRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    if (!readOnly) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        onChangeRef.current({ lat: e.latlng.lat, lng: e.latlng.lng })
      })
    }

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
      circleRef.current = null
    }
    // El mapa se crea una sola vez; el punto se sincroniza en el efecto de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (!value) {
      markerRef.current?.remove()
      markerRef.current = null
      circleRef.current?.remove()
      circleRef.current = null
      return
    }

    const latLng: L.LatLngTuple = [value.lat, value.lng]

    if (!markerRef.current) {
      markerRef.current = L.marker(latLng, { icon: defaultIcon, draggable: !readOnly }).addTo(map)
      markerRef.current.on('dragend', () => {
        const pos = markerRef.current!.getLatLng()
        onChangeRef.current({ lat: pos.lat, lng: pos.lng })
      })
    } else {
      markerRef.current.setLatLng(latLng)
    }

    if (!circleRef.current) {
      circleRef.current = L.circle(latLng, {
        radius: radiusMeters,
        color: '#2563eb',
        weight: 1,
        dashArray: '4 4',
        fillOpacity: 0.08,
      }).addTo(map)
    } else {
      circleRef.current.setLatLng(latLng)
      circleRef.current.setRadius(radiusMeters)
    }

    // Solo recentra cuando el punto queda fuera de la vista actual (p. ej. al
    // escribirlo a mano en los campos de latitud/longitud). Arrastrar o hacer
    // clic en el pin ya deja el punto visible, así que no fuerza el encuadre.
    if (!map.getBounds().contains(latLng)) {
      map.setView(latLng, Math.max(map.getZoom(), POINT_ZOOM))
    }
  }, [value, radiusMeters, readOnly])

  return <div ref={containerRef} className={className} style={{ height: 320, width: '100%' }} />
}
