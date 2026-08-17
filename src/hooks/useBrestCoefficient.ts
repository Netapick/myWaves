import { useQuery } from '@tanstack/react-query'
import { fetchMarineSeries } from '../api/openMeteoMarine'
import { fetchWithCache } from './cachedFetch'

/** Coordonnées du marégraphe SHOM de Brest — référence nationale du coefficient de marée. */
export const BREST_COORDS = { latitude: 48.3809, longitude: -4.4954 }

const REFRESH_INTERVAL_MS = 60 * 60_000

/**
 * Série de hauteur d'eau à Brest (prévision Open-Meteo, 7 jours) utilisée pour
 * estimer le coefficient de marée — voir domain/tideCoefficient.ts pour la méthode
 * et ses limites (surcote météo non filtrée).
 */
export function useBrestSeaLevelSeries() {
  return useQuery({
    queryKey: ['brest-sea-level'],
    queryFn: () =>
      fetchWithCache('brest-sea-level', () => fetchMarineSeries(BREST_COORDS.latitude, BREST_COORDS.longitude, 7)),
    staleTime: REFRESH_INTERVAL_MS,
    refetchInterval: REFRESH_INTERVAL_MS,
    retry: 1,
  })
}
