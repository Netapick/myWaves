import { useQuery } from '@tanstack/react-query'
import { fetchMareeInfoExtremes, todayIsoInParis } from '../api/mareeInfoTable'
import { fetchWithCache } from './cachedFetch'
import { writeCache } from '../db'
import { pruneToTodayAndFuture } from '../domain/parseMareeInfoTable'
import { fromParsedExtremes, SNAPSHOT_EXTREMA, type TideExtremum } from '../domain/officialTideExtremes'

const CACHE_KEY = 'maree-info-extremes'

// La table ne change qu'une fois par jour côté maree.info : 1 seul appel/24h, pas plus —
// minimiser strictement le nombre de requêtes de ce contournement CGU (voir api/mareeInfoTable.ts).
const REFRESH_INTERVAL_MS = 24 * 60 * 60_000

export interface OfficialTideExtremesResult {
  extrema: TideExtremum[]
  /** true si `extrema` vient du cache local ou de l'instantané statique, pas d'un fetch frais. */
  stale: boolean
  fetchedAt: number
}

/**
 * Extrema de marée officiels pour Saint-Malo (fetch live, voir api/mareeInfoTable.ts
 * — contournement CGU assumé, usage privé uniquement, voir domain/officialTideExtremes.ts).
 *
 * Repli en cascade, jamais d'écran vide : fetch live → dernier cache connu (Dexie,
 * même logique que les autres sources de l'app) → instantané statique intégré à l'app
 * (SNAPSHOT_EXTREMA — se périme vite, mais garantit qu'il y a toujours quelque chose).
 *
 * Le cache retient toute la semaine renvoyée par maree.info (pas seulement le jour
 * courant), chaque jour y restant jusqu'à sa fin puis purgé : à chaque lecture, on
 * élimine les jours déjà passés (utile surtout si le fetch a échoué plusieurs jours de
 * suite et qu'on retombe sur un cache vieux) et on réécrit la version élaguée — le
 * stockage local ne grossit donc jamais indéfiniment.
 */
export function useOfficialTideExtremes() {
  return useQuery<OfficialTideExtremesResult>({
    queryKey: [CACHE_KEY],
    queryFn: async () => {
      try {
        const cached = await fetchWithCache(CACHE_KEY, fetchMareeInfoExtremes)
        const todayIso = todayIsoInParis()
        const pruned = pruneToTodayAndFuture(cached.data, todayIso)
        if (pruned.length !== cached.data.length) {
          await writeCache(CACHE_KEY, pruned, cached.fetchedAt)
        }
        return { extrema: fromParsedExtremes(pruned), stale: cached.stale, fetchedAt: cached.fetchedAt }
      } catch {
        return { extrema: SNAPSHOT_EXTREMA, stale: true, fetchedAt: 0 }
      }
    },
    staleTime: REFRESH_INTERVAL_MS,
    refetchInterval: REFRESH_INTERVAL_MS,
    retry: 1,
  })
}
