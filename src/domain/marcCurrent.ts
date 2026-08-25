import { createTidePredictor } from '@neaps/tide-predictor'
import type { TimeSeriesPoint } from '../api/types'

export interface MarcConstituent {
  name: string
  /** Vitesse angulaire (degrés/heure) — constante astronomique standard. */
  speed: number
  uAmplitude: number
  uPhase: number
  vAmplitude: number
  vPhase: number
}

export interface MarcElevationConstituent {
  name: string
  speed: number
  amplitude: number
  phase: number
}

export interface MarcHarmonicTable {
  gridPoint: { uLat: number; uLon: number; vLat: number; vLon: number; distanceKm: number }
  constituents: MarcConstituent[]
  /** Composantes de hauteur d'eau (XE) au même point de grille que le courant — voir
   * predictMarcTideHeightSeries. Absent pour les tableaux générés avant son ajout. */
  elevation?: {
    gridPoint: { tLat: number; tLon: number; distanceKm: number }
    constituents: MarcElevationConstituent[]
  }
}

/** Un point côtier pré-extrait (voir scripts/extract-marc-harmonics.mjs) — `lat`/`lon` sont
 * les coordonnées du point d'extraction lui-même (port, plage...), PAS celles d'un spot de
 * l'app : plusieurs spots proches peuvent partager la même entrée via findNearestMarcTable. */
export interface MarcAtlasEntry {
  lat: number
  lon: number
  gridPoint: MarcHarmonicTable['gridPoint']
  constituents: MarcConstituent[]
  elevation: NonNullable<MarcHarmonicTable['elevation']>
}

/** Au-delà de cette distance (km), le point pré-extrait le plus proche est trop loin pour
 * être représentatif du site recherché — mieux vaut retomber sur Open-Meteo (voir
 * SpotPage.tsx) que d'afficher un courant local qui n'a plus de rapport avec le lieu réel.
 * Généreux par rapport à l'espacement typique des points (~3-5 km, voir
 * scripts/build-coastal-points.mjs), pour couvrir les zones un peu moins denses. */
export const MAX_MARC_LOOKUP_DISTANCE_KM = 8

/**
 * Cherche, parmi tous les points côtiers pré-extraits, le plus proche de coordonnées
 * données — le mécanisme qui permet à N'IMPORTE QUEL spot ajouté via la recherche de lieu
 * (voir api/geocode.ts) de bénéficier du courant MARC sans extraction à la demande (le
 * téléchargement FTP Ifremer ne peut de toute façon pas se faire depuis l'app elle-même,
 * voir l'en-tête de scripts/extract-marc-harmonics.mjs). Retourne aussi la distance réelle
 * entre le point demandé et le point utilisé, pour l'affichage ("courant à X km du site").
 */
export function findNearestMarcTable(
  atlas: MarcAtlasEntry[],
  lat: number,
  lon: number,
): { table: MarcHarmonicTable; distanceKm: number } | undefined {
  let best: MarcAtlasEntry | undefined
  let bestDist = Infinity
  for (const entry of atlas) {
    const dLat = entry.lat - lat
    const dLon = (entry.lon - lon) * Math.cos((lat * Math.PI) / 180)
    const dist = dLat * dLat + dLon * dLon
    if (dist < bestDist) {
      bestDist = dist
      best = entry
    }
  }
  if (!best) return undefined

  const distanceKm = Math.sqrt(bestDist) * 111
  if (distanceKm > MAX_MARC_LOOKUP_DISTANCE_KM) return undefined

  return { table: { gridPoint: best.gridPoint, constituents: best.constituents, elevation: best.elevation }, distanceKm }
}

/**
 * Prédit la vitesse du courant de marée (km/h) à partir des composantes harmoniques
 * locales MARC/Ifremer — bien plus précises que le modèle océanique global Open-Meteo sur
 * cette côte découpée (grille ~1 km contre 15-20 km, voir scripts/extract-marc-harmonics.mjs).
 *
 * Synthèse harmonique classique (somme des constituantes) via @neaps/tide-predictor, qui
 * gère les corrections astronomiques standard (argument d'équilibre, facteurs nodaux) —
 * appliquée séparément aux composantes est-ouest (U) et nord-sud (V) de la vitesse, puis
 * recombinées en norme. Courant purement issu de la marée : ne capture pas les rejets
 * artificiels (ex. usine marémotrice de la Rance) ni les courants induits par le vent.
 */
export function predictMarcCurrentSeries(table: MarcHarmonicTable, start: Date, end: Date, stepMinutes = 15): TimeSeriesPoint[] {
  const uConstituents = table.constituents.map((c) => ({ name: c.name, speed: c.speed, amplitude: c.uAmplitude, phase: c.uPhase }))
  const vConstituents = table.constituents.map((c) => ({ name: c.name, speed: c.speed, amplitude: c.vAmplitude, phase: c.vPhase }))

  const uTimeline = createTidePredictor(uConstituents).getTimelinePrediction({ start, end, timeFidelity: stepMinutes * 60 })
  const vTimeline = createTidePredictor(vConstituents).getTimelinePrediction({ start, end, timeFidelity: stepMinutes * 60 })

  return uTimeline.map((u, i) => {
    const v = vTimeline[i]?.level ?? 0
    const speedMs = Math.sqrt(u.level * u.level + v * v)
    return { time: u.time, value: speedMs * 3.6 }
  })
}

/**
 * Prédit la hauteur d'eau (m) à partir des composantes harmoniques d'élévation (XE) MARC,
 * au même point de grille que le courant — évite un décalage de phase entre les deux
 * courbes affichées dans l'app quand elles viendraient de deux modèles indépendants (à
 * Saint-Cast-le-Guildo, la hauteur Open-Meteo et le courant MARC désaccordaient de plus
 * d'1h sur l'heure de pleine mer). Référentiel identique à celui d'Open-Meteo (niveau
 * moyen local), donc substituable directement à `sea_level_height_msl`.
 */
export function predictMarcTideHeightSeries(
  elevation: NonNullable<MarcHarmonicTable['elevation']>,
  start: Date,
  end: Date,
  stepMinutes = 15,
): TimeSeriesPoint[] {
  const constituents = elevation.constituents.map((c) => ({ name: c.name, speed: c.speed, amplitude: c.amplitude, phase: c.phase }))
  const timeline = createTidePredictor(constituents).getTimelinePrediction({ start, end, timeFidelity: stepMinutes * 60 })
  return timeline.map((p) => ({ time: p.time, value: p.level }))
}
