import { fetchJson } from './client'

export interface GeocodeResult {
  placeId: number
  name: string
  displayName: string
  latitude: number
  longitude: number
}

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  name?: string
}

const SEARCH_URL = 'https://nominatim.openstreetmap.org/search'
const REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse'

/**
 * Recherche de lieu par nom via Nominatim (OpenStreetMap) — gratuit, sans clé, aucune
 * config nécessaire (déjà utilisé pour les tuiles de la carte, voir SpotsListPage.tsx).
 * N'appeler que sur action explicite (bouton "Rechercher"), jamais à chaque frappe : la
 * politique d'usage de Nominatim proscrit l'autocomplétion à volume élevé (~1 req/s max,
 * pas d'usage intensif) — voir aussi domain/officialTideExtremes.ts pour la même logique
 * appliquée ailleurs dans l'app (minimiser l'empreinte des appels externes).
 */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  const trimmed = query.trim()
  if (!trimmed) return []
  const params = new URLSearchParams({
    format: 'jsonv2',
    q: trimmed,
    limit: '5',
    'accept-language': 'fr',
  })
  const results = await fetchJson<NominatimResult[]>(`${SEARCH_URL}?${params.toString()}`, signal)
  return results.map(toGeocodeResult)
}

/**
 * Trouve le nom du lieu correspondant à une position GPS (géolocalisation, voir
 * SpotsListPage.tsx) via Nominatim — même service, même politique d'usage que
 * `searchPlaces` (appel explicite uniquement, jamais en continu/tâche de fond).
 */
export async function reverseGeocode(latitude: number, longitude: number, signal?: AbortSignal): Promise<GeocodeResult> {
  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: latitude.toFixed(5),
    lon: longitude.toFixed(5),
    'accept-language': 'fr',
  })
  const result = await fetchJson<NominatimResult>(`${REVERSE_URL}?${params.toString()}`, signal)
  return toGeocodeResult(result)
}

function toGeocodeResult(r: NominatimResult): GeocodeResult {
  return {
    placeId: r.place_id,
    name: r.name || r.display_name.split(',')[0],
    displayName: r.display_name,
    latitude: Number.parseFloat(r.lat),
    longitude: Number.parseFloat(r.lon),
  }
}
