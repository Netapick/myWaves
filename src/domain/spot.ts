export interface Spot {
  id: string
  name: string
  latitude: number
  longitude: number
  /** Orientation de la côte face au spot (degrés, 0=N) — aide à juger l'abri au vent/houle. */
  facingDegrees?: number
  region: string
  /** Marque les spots où le barrage de la Rance rend les courants modélisés non fiables. */
  underRanceInfluence?: boolean
  /**
   * Identifiant du marégraphe SHOM le plus proche (voir `SHOM_STATIONS` dans
   * `api/shomTideGauge.ts`), quand un spot en a un à proximité immédiate. Permet
   * d'ancrer la courbe de marée affichée sur une mesure réelle plutôt que sur le
   * seul modèle global Open-Meteo — dont le référentiel (niveau moyen) ET l'amplitude
   * peuvent s'écarter sensiblement de la réalité locale (à Saint-Malo, l'un des plus
   * grands marnages d'Europe, le modèle donnait ~8,9 m contre 9,24 m mesurés le même jour).
   */
  shomStationId?: number
  notes?: string
}

/**
 * Amorçage : seulement 2 spots prédéfinis, ceux de l'utilisateur — tous les autres
 * s'ajoutent via la recherche de lieu par nom (voir api/geocode.ts + SpotsListPage.tsx),
 * stockés comme favoris (même table Dexie, voir hooks/useFavoriteSpots.ts).
 */
export const SEED_SPOTS: Spot[] = [
  {
    id: 'saint-malo-sablons',
    name: 'Anse des Sablons — Saint-Malo',
    latitude: 48.634,
    longitude: -2.0086,
    facingDegrees: 0,
    region: 'Bretagne Nord',
    underRanceInfluence: true,
    shomStationId: 410, // SHOM_STATIONS.SAINT_MALO — terminal de la Naye
    notes: "Proche de l'embouchure de la Rance : voir l'avertissement courants dans l'app.",
  },
  {
    id: 'saint-cast-le-guildo',
    name: 'Saint-Cast-le-Guildo',
    // Coordonnées vérifiées via Nominatim/OSM (centroïde de la commune), pas une estimation.
    latitude: 48.6241,
    longitude: -2.2618,
    region: "Côtes-d'Armor",
  },
]

export const DEFAULT_SPOT_ID = 'saint-malo-sablons'
