import Dexie, { type EntityTable } from 'dexie'
import type { Spot } from '../domain/spot'

/** Un enregistrement de cache générique : une réponse API sérialisable + son horodatage. */
export interface CacheEntry {
  /** Clé stable : `${datasource}:${spotId ou stationId}:${resolution}`. */
  key: string
  payload: unknown
  fetchedAt: number
}

export interface SettingEntry {
  key: string
  value: unknown
}

export interface FavoriteSpot extends Spot {
  /** Horodatage d'ajout, pour trier les favoris récents en premier. */
  addedAt: number
}

class MyWavesDatabase extends Dexie {
  favoriteSpots!: EntityTable<FavoriteSpot, 'id'>
  cache!: EntityTable<CacheEntry, 'key'>
  settings!: EntityTable<SettingEntry, 'key'>

  constructor() {
    super('myWavesDb')
    this.version(1).stores({
      favoriteSpots: 'id, addedAt',
      cache: 'key, fetchedAt',
      settings: 'key',
    })
  }
}

export const db = new MyWavesDatabase()

// --- Cache : lecture/écriture générique, utilisée par les hooks de données ---

export async function readCache<T>(key: string): Promise<{ payload: T; fetchedAt: number } | undefined> {
  const entry = await db.cache.get(key)
  if (!entry) return undefined
  return { payload: entry.payload as T, fetchedAt: entry.fetchedAt }
}

export async function writeCache<T>(key: string, payload: T, fetchedAt: number = Date.now()): Promise<void> {
  await db.cache.put({ key, payload, fetchedAt })
}

// --- Réglages : accesseurs typés pour les valeurs connues de l'app ---

export const SETTINGS_KEYS = {
  sillHeightM: 'sillHeightM',
  sillAlertClearanceM: 'sillAlertClearanceM',
  sillAlertsEnabled: 'sillAlertsEnabled',
} as const

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const entry = await db.settings.get(key)
  return entry ? (entry.value as T) : fallback
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await db.settings.put({ key, value })
}
