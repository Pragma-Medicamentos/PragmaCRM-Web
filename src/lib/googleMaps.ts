import { importLibrary, setOptions } from '@googlemaps/js-api-loader'

let configured = false

/** Lee la key de Vite; nunca hardcodear. */
export function getGoogleMapsApiKey(): string | undefined {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  return typeof key === 'string' && key.trim() !== '' ? key.trim() : undefined
}

/**
 * Configura y carga Maps JS + Places.
 * Lanza si falta la key o si el loader falla (key inválida / red).
 */
export async function loadGoogleMaps(): Promise<void> {
  const key = getGoogleMapsApiKey()
  if (!key) throw new Error('MISSING_KEY')
  if (!configured) {
    setOptions({ key, v: 'weekly', language: 'es', region: 'SV', libraries: ['places'] })
    configured = true
  }
  await Promise.all([importLibrary('maps'), importLibrary('places')])
}
