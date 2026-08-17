import { extractTideEvents } from './tideEvents'
import type { TideEvent } from './types'
import type { TimeSeriesPoint } from '../api/types'

/**
 * Unité de hauteur du coefficient de marée français : amplitude moyenne des marées
 * de vives-eaux d'équinoxe à Brest, en mètres. Référence SHOM.
 */
export const BREST_REFERENCE_RANGE_M = 6.1

export interface TideCoefficientEstimate {
  /** Coefficient estimé, arrondi, borné à la plage officielle 20-120. */
  coefficient: number
  marnageM: number
  from: TideEvent
  to: TideEvent
  /**
   * ⚠️ Rappel de méthode, à répercuter dans l'UI : ceci est une ESTIMATION dérivée
   * de la courbe de hauteur d'eau à Brest (observée ou prévue par le modèle),
   * pas le coefficient officiel SHOM. Ce dernier se calcule sur la marée
   * ASTRONOMIQUE pure ; la série utilisée ici peut inclure une surcote météo
   * de quelques centimètres, qui décale légèrement le résultat. Pour une
   * planification fine (vives-eaux/mortes-eaux exactes à J+10), croiser avec
   * l'annuaire officiel.
   */
  source: 'estimated-from-sea-level-series'
}

function coefficientFromMarnage(marnageM: number): number {
  const raw = (marnageM / BREST_REFERENCE_RANGE_M) * 100
  return Math.round(Math.max(20, Math.min(120, raw)))
}

/**
 * Apparie les événements de marée consécutifs (BM→PM ou PM→BM) pour calculer un
 * marnage par demi-cycle — jamais un min/max sur une fenêtre calendaire fixe,
 * qui mélangerait deux marées différentes.
 */
export function pairTideEvents(events: TideEvent[]): { from: TideEvent; to: TideEvent; marnageM: number }[] {
  const pairs: { from: TideEvent; to: TideEvent; marnageM: number }[] = []
  for (let i = 0; i < events.length - 1; i++) {
    const from = events[i]
    const to = events[i + 1]
    if (from.phase === to.phase) continue // segments discontinus après un trou de données
    pairs.push({ from, to, marnageM: Math.abs(to.height - from.height) })
  }
  return pairs
}

/**
 * Trouve, parmi des demi-marées consécutives, celle qui encadre `at` — ou à défaut la
 * plus proche. Partagé par `estimateTideCoefficientAt` (depuis une série brute) et
 * `coefficientNear` (depuis une série déjà estimée, ex. pour annoter chaque PM/BM
 * affiché sans reparcourir toute la série à chaque fois).
 */
function findPairNear<T extends { from: TideEvent; to: TideEvent }>(pairs: T[], at: Date): T | null {
  if (pairs.length === 0) return null

  const atMs = at.getTime()
  let best = pairs[0]
  let bestDistance = Infinity
  for (const pair of pairs) {
    const inRange = atMs >= pair.from.time.getTime() && atMs <= pair.to.time.getTime()
    if (inRange) return pair
    const distance = Math.min(Math.abs(atMs - pair.from.time.getTime()), Math.abs(atMs - pair.to.time.getTime()))
    if (distance < bestDistance) {
      best = pair
      bestDistance = distance
    }
  }
  return best
}

/**
 * Estime le coefficient de marée à un instant donné, à partir de la série de hauteur
 * d'eau à Brest (station SHOM 3, ou prévision Open-Meteo aux coordonnées de Brest).
 * Retourne `null` si la série ne couvre pas assez de cycles pour encadrer `at`.
 */
export function estimateTideCoefficientAt(
  brestSeries: TimeSeriesPoint[],
  at: Date = new Date(),
): TideCoefficientEstimate | null {
  const pairs = pairTideEvents(extractTideEvents(brestSeries))
  const best = findPairNear(pairs, at)
  if (!best) return null

  return {
    coefficient: coefficientFromMarnage(best.marnageM),
    marnageM: best.marnageM,
    from: best.from,
    to: best.to,
    source: 'estimated-from-sea-level-series',
  }
}

/**
 * Coefficient le plus proche de `at` dans une série déjà estimée (voir
 * `estimateTideCoefficientSeries`) — pour annoter un événement de marée LOCAL (un
 * spot autre que Brest) avec le coefficient national en vigueur à ce moment-là, sans
 * recalculer les demi-marées de Brest à chaque fois.
 */
export function coefficientNear(estimates: TideCoefficientEstimate[], at: Date): number | null {
  return findPairNear(estimates, at)?.coefficient ?? null
}

/** Série complète des coefficients estimés, un par demi-cycle — pour affichage sur la timeline. */
export function estimateTideCoefficientSeries(brestSeries: TimeSeriesPoint[]): TideCoefficientEstimate[] {
  const events = extractTideEvents(brestSeries)
  return pairTideEvents(events).map((pair) => ({
    coefficient: coefficientFromMarnage(pair.marnageM),
    marnageM: pair.marnageM,
    from: pair.from,
    to: pair.to,
    source: 'estimated-from-sea-level-series' as const,
  }))
}
