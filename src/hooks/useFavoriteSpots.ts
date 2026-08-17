import { useLiveQuery } from 'dexie-react-hooks'
import { db, type FavoriteSpot } from '../db'
import type { Spot } from '../domain/spot'

export function useFavoriteSpots(): FavoriteSpot[] | undefined {
  return useLiveQuery(() => db.favoriteSpots.orderBy('addedAt').reverse().toArray())
}

export async function addFavoriteSpot(spot: Spot): Promise<void> {
  await db.favoriteSpots.put({ ...spot, addedAt: Date.now() })
}

export async function removeFavoriteSpot(spotId: string): Promise<void> {
  await db.favoriteSpots.delete(spotId)
}

export async function isFavoriteSpot(spotId: string): Promise<boolean> {
  return (await db.favoriteSpots.get(spotId)) !== undefined
}
