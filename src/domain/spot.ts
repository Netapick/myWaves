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
    // Port d'Armor (marina, vérifié via Nominatim/OSM) — pas le centroïde de la commune,
    // qui peut tomber loin de la côte réelle et fausser le point de grille MARC/Open-Meteo
    // le plus proche sur un littoral aussi découpé (capes, baies). À privilégier pour tout
    // futur spot : port/plage précis plutôt que centre-ville.
    latitude: 48.6408354,
    longitude: -2.2449483,
    region: "Côtes-d'Armor",
  },
]

export const DEFAULT_SPOT_ID = 'saint-malo-sablons'
