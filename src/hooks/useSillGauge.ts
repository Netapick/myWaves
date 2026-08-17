import { useQuery } from '@tanstack/react-query'
import { fetchShomRecent, SHOM_STATIONS } from '../api/shomTideGauge'
import { fetchWithCache } from './cachedFetch'

const REFRESH_INTERVAL_MS = 60_000 // le marégraphe se rafraîchit à ~1 min, on suit ce rythme

/**
 * Dernières observations d'un marégraphe SHOM. `stationId` peut être `undefined`
 * (spot sans marégraphe à proximité) : la requête est alors désactivée.
 */
export function useShomGauge(stationId: number | undefined, hours = 24) {
  return useQuery({
    queryKey: ['shom-gauge', stationId, hours],
    queryFn: () => fetchWithCache(`shom:${stationId}:${hours}`, () => fetchShomRecent(stationId!, hours)),
    enabled: stationId !== undefined,
    staleTime: REFRESH_INTERVAL_MS,
    refetchInterval: REFRESH_INTERVAL_MS,
    retry: 1,
  })
}

/** Marégraphe de Saint-Malo (station 410, terminal de la Naye) — écran seuil des Sablons. */
export function useSillGauge() {
  return useShomGauge(SHOM_STATIONS.SAINT_MALO)
}
