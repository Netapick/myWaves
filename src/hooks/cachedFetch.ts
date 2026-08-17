import { readCache, writeCache } from '../db'

export interface CachedResult<T> {
  data: T
  fetchedAt: number
  /** true si la donnée vient du cache local (réseau indisponible ou requête en échec). */
  stale: boolean
}

/**
 * Récupère `fetcher()`, en écrivant le résultat dans le cache local (Dexie) en cas de
 * succès. En cas d'échec réseau, retombe sur la dernière valeur en cache si elle existe
 * (le résultat est alors marqué `stale: true` — jamais présenté comme frais par erreur).
 * Si aucun cache n'existe non plus, l'erreur d'origine remonte.
 */
export async function fetchWithCache<T>(cacheKey: string, fetcher: () => Promise<T>): Promise<CachedResult<T>> {
  try {
    const data = await fetcher()
    const fetchedAt = Date.now()
    await writeCache(cacheKey, data, fetchedAt)
    return { data, fetchedAt, stale: false }
  } catch (networkError) {
    const cached = await readCache<T>(cacheKey)
    if (cached) {
      return { data: cached.payload, fetchedAt: cached.fetchedAt, stale: true }
    }
    throw networkError
  }
}
