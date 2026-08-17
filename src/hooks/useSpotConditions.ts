import { useQuery } from '@tanstack/react-query'
import { fetchMarineSeries, type MarineSeries } from '../api/openMeteoMarine'
import { fetchWindSeries, type WindSeries } from '../api/openMeteoForecast'
import { fetchWithCache } from './cachedFetch'
import type { Spot } from '../domain/spot'

export interface SpotConditions {
  marine: MarineSeries
  wind: WindSeries
}

const REFRESH_INTERVAL_MS = 15 * 60_000 // les modèles Open-Meteo se rafraîchissent toutes les heures au mieux

/** `spot` peut être `undefined` (id inconnu, favoris pas encore chargés) : la requête est alors désactivée. */
export function useSpotConditions(spot: Spot | undefined) {
  return useQuery({
    queryKey: ['spot-conditions', spot?.id, spot?.latitude, spot?.longitude],
    queryFn: async ({ signal }) => {
      const cacheKey = `conditions:${spot!.id}`
      return fetchWithCache(cacheKey, async () => {
        const [marine, wind] = await Promise.all([
          fetchMarineSeries(spot!.latitude, spot!.longitude, 7, signal),
          fetchWindSeries(spot!.latitude, spot!.longitude, 7, signal),
        ])
        return { marine, wind } satisfies SpotConditions
      })
    },
    enabled: spot !== undefined,
    staleTime: REFRESH_INTERVAL_MS,
    refetchInterval: REFRESH_INTERVAL_MS,
    retry: 1,
  })
}
