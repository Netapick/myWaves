import type { TimeSeriesPoint } from '../api/types'

/**
 * Hauteur du seuil du Port des Sablons (Saint-Malo), en mètres au-dessus du zéro
 * hydrographique — même référentiel que le marégraphe SHOM (station 410).
 * Modifiable dans les réglages : l'envasement fait varier cette valeur avec le temps,
 * et seul le panneau lumineux en bout de digue fait foi sur place.
 */
export const DEFAULT_SILL_HEIGHT_M = 2.0

/**
 * Correction EMPIRIQUE (pas physiquement dérivée, contrairement à
 * calibrateForecastToGauge) demandée par l'utilisateur le 04/08/2026 après comparaison
 * répétée avec maree.info : la mesure réelle du marégraphe paraissait trop haute.
 * D'abord réglée à -0,2 m, puis affinée à -0,1 m le même jour après un nouveau
 * recoupement. Une constante équivalente avait d'abord été appliquée à la prévision
 * future (-1 m), mais abandonnée : son erreur s'est révélée trop variable dans le temps
 * (jusqu'à 1,3 m à certains horaires, quasi nulle à d'autres — voir
 * domain/officialTideExtremes.ts, qui la remplace par la hauteur officielle quand elle
 * est disponible). Ajustable ici si l'écart observé sur le réel évolue encore.
 */
export const EMPIRICAL_OBSERVED_CORRECTION_M = -0.1

/**
 * Marge d'incertitude affichée à côté de la hauteur au-dessus du seuil "maintenant" —
 * ne change pas le calcul, communique juste que la valeur n'est pas garantie au
 * centimètre près (précision du marégraphe + correction empirique ci-dessus).
 */
export const SILL_CLEARANCE_UNCERTAINTY_M = 0.1

function shiftSeries(series: TimeSeriesPoint[], deltaM: number): TimeSeriesPoint[] {
  return series.map((p) => ({ time: p.time, value: p.value === null ? null : p.value + deltaM }))
}

/** Applique EMPIRICAL_OBSERVED_CORRECTION_M à une série d'observations réelles du marégraphe. */
export function applyObservedCorrection(observed: TimeSeriesPoint[]): TimeSeriesPoint[] {
  return shiftSeries(observed, EMPIRICAL_OBSERVED_CORRECTION_M)
}

export interface SillClearance {
  time: Date
  /** Hauteur d'eau au-dessus du seuil, en m. Négatif = seuil découvert. */
  clearanceM: number
}

export type Trend = 'rising' | 'falling' | 'stable'

export interface CurrentSillStatus {
  clearanceM: number
  measuredAt: Date
  /** Écart entre l'instant demandé (typiquement "maintenant") et la mesure utilisée. */
  stalenessMs: number
  trend: Trend
}

/** Convertit une série de hauteurs d'eau (marégraphe ou prévision) en hauteur au-dessus du seuil. */
export function computeClearanceSeries(gauge: TimeSeriesPoint[], sillHeightM: number = DEFAULT_SILL_HEIGHT_M): SillClearance[] {
  return gauge
    .filter((p): p is TimeSeriesPoint & { value: number } => p.value !== null)
    .map((p) => ({ time: p.time, clearanceM: p.value - sillHeightM }))
}

/**
 * Statut au plus proche de `at` (par défaut maintenant), avec tendance calculée sur
 * les ~10 dernières minutes de données disponibles avant ce point.
 * Retourne `null` si la série est vide.
 */
export function getCurrentSillStatus(
  gauge: TimeSeriesPoint[],
  sillHeightM: number = DEFAULT_SILL_HEIGHT_M,
  at: Date = new Date(),
): CurrentSillStatus | null {
  const clearance = computeClearanceSeries(gauge, sillHeightM)
  if (clearance.length === 0) return null

  let nearest = clearance[0]
  let nearestDiff = Math.abs(nearest.time.getTime() - at.getTime())
  for (const c of clearance) {
    const diff = Math.abs(c.time.getTime() - at.getTime())
    if (diff < nearestDiff) {
      nearest = c
      nearestDiff = diff
    }
  }

  const tenMinAgo = new Date(nearest.time.getTime() - 10 * 60_000)
  let reference = nearest
  let referenceDiff = Infinity
  for (const c of clearance) {
    if (c.time.getTime() > nearest.time.getTime()) continue
    const diff = Math.abs(c.time.getTime() - tenMinAgo.getTime())
    if (diff < referenceDiff) {
      reference = c
      referenceDiff = diff
    }
  }

  const delta = nearest.clearanceM - reference.clearanceM
  const trend: Trend = Math.abs(delta) < 0.02 ? 'stable' : delta > 0 ? 'rising' : 'falling'

  return {
    clearanceM: nearest.clearanceM,
    measuredAt: nearest.time,
    stalenessMs: at.getTime() - nearest.time.getTime(),
    trend,
  }
}

/**
 * Recale une série de prévision (ex. Open-Meteo `sea_level_height_msl`, référencée au
 * niveau moyen de la mer) sur le référentiel du marégraphe SHOM (zéro hydrographique),
 * dont l'écart avec le niveau moyen est important et propre à chaque port — on ne le
 * connaît pas a priori, donc on NE L'INVENTE PAS : on le calcule par comparaison directe
 * des deux séries à l'instant où elles se recouvrent (typiquement "maintenant").
 *
 * LIMITE CONNUE (mesurée en pratique, pas seulement théorique) : cette correction ne
 * traite qu'un décalage de HAUTEUR, pas de TIMING. Or le modèle Open-Meteo est en avance
 * sur la marée réelle à Saint-Malo — écart mesuré : ~20 min sur la pleine mer, ~40 min
 * sur la basse mer suivante (le décalage croît avec le temps écoulé depuis l'ancrage).
 * Sur une côte à fort marnage (~1,5 m/h sur les portions raides), ce décalage de timing
 * se traduit en écart de HAUTEUR qui grandit avec l'horizon — jusqu'à ~1 m mesuré à +4h.
 * Une correction de décalage temporel a été testée et rejetée : elle amplifiait l'erreur
 * plutôt que la corriger (la pente du modèle et la pente réelle ne coïncident pas assez
 * pour qu'un décalage constant fonctionne) — de même une correction de hauteur constante
 * (testée : -1 m aidait à +4h mais aggravait l'écart à +8h, proche d'un pic de marée où
 * l'erreur du modèle est plus faible). Le résultat reste donc exact À l'instant d'ancrage
 * (piloté séparément par la vraie mesure, pas par cette fonction) et de moins en moins
 * fiable au fil de l'horizon. Solution retenue : `officialTideExtremes.ts` remplace cette
 * prévision par la hauteur officielle quand elle est disponible pour la date demandée.
 */
export function calibrateForecastToGauge(observed: TimeSeriesPoint[], forecast: TimeSeriesPoint[]): TimeSeriesPoint[] {
  if (observed.length === 0 || forecast.length === 0) return forecast

  const lastObserved = [...observed].reverse().find((p) => p.value !== null)
  if (!lastObserved) return forecast

  let nearestForecast: TimeSeriesPoint | null = null
  let nearestDiff = Infinity
  for (const p of forecast) {
    if (p.value === null) continue
    const diff = Math.abs(p.time.getTime() - lastObserved.time.getTime())
    if (diff < nearestDiff) {
      nearestForecast = p
      nearestDiff = diff
    }
  }
  // Recalage jugé fiable seulement si les deux séries se recouvrent à moins d'une heure.
  if (!nearestForecast || nearestDiff > 3_600_000) return forecast

  const offset = lastObserved.value! - nearestForecast.value!
  return forecast.map((p) => ({ time: p.time, value: p.value === null ? null : p.value + offset }))
}

/**
 * Combine l'historique réel du marégraphe (le plus fiable) avec une prévision déjà
 * recalée par `calibrateForecastToGauge` pour la suite — plutôt que d'afficher soit
 * une prévision seule (moins précise), soit une observation seule (pas d'avenir).
 * Le raccord se fait à la dernière observation : tout point de prévision antérieur ou
 * égal à cet instant est écarté pour ne jamais dupliquer/contredire une vraie mesure.
 */
export function mergeObservedWithForecast(
  observed: TimeSeriesPoint[],
  calibratedForecast: TimeSeriesPoint[],
): TimeSeriesPoint[] {
  if (observed.length === 0) return calibratedForecast
  if (calibratedForecast.length === 0) return observed

  const lastObservedTime = observed[observed.length - 1].time.getTime()
  const future = calibratedForecast.filter((p) => p.time.getTime() > lastObservedTime)
  return [...observed, ...future]
}

/**
 * Prochain instant où la hauteur au-dessus du seuil franchit `alertClearanceM`,
 * à partir de `from`. Interpolation linéaire entre échantillons.
 * Retourne `null` si la série ne contient pas de franchissement après `from`.
 */
export function findNextThresholdCrossing(
  gauge: TimeSeriesPoint[],
  alertClearanceM: number,
  sillHeightM: number = DEFAULT_SILL_HEIGHT_M,
  from: Date = new Date(),
): { time: Date; direction: 'rising' | 'falling' } | null {
  const clearance = computeClearanceSeries(gauge, sillHeightM).filter((c) => c.time.getTime() >= from.getTime())
  if (clearance.length < 2) return null

  for (let i = 1; i < clearance.length; i++) {
    const a = clearance[i - 1]
    const b = clearance[i]
    const aBelow = a.clearanceM < alertClearanceM
    const bBelow = b.clearanceM < alertClearanceM
    if (aBelow === bBelow) continue

    const span = b.clearanceM - a.clearanceM
    const t = Math.max(0, Math.min(1, (alertClearanceM - a.clearanceM) / span))
    const time = new Date(a.time.getTime() + t * (b.time.getTime() - a.time.getTime()))
    return { time, direction: bBelow ? 'falling' : 'rising' }
  }

  return null
}

/**
 * Tous les franchissements de `alertClearanceM` entre `from` et `to` — utilisé pour
 * programmer une fenêtre glissante de notifications (Android tue les tâches de fond,
 * donc on programme les alertes à l'avance plutôt que de sonder le marégraphe en continu).
 */
export function findAllThresholdCrossings(
  gauge: TimeSeriesPoint[],
  alertClearanceM: number,
  sillHeightM: number = DEFAULT_SILL_HEIGHT_M,
  from: Date = new Date(),
  to: Date = new Date(from.getTime() + 7 * 86_400_000),
): { time: Date; direction: 'rising' | 'falling' }[] {
  const clearance = computeClearanceSeries(gauge, sillHeightM).filter(
    (c) => c.time.getTime() >= from.getTime() && c.time.getTime() <= to.getTime(),
  )
  if (clearance.length < 2) return []

  const crossings: { time: Date; direction: 'rising' | 'falling' }[] = []
  for (let i = 1; i < clearance.length; i++) {
    const a = clearance[i - 1]
    const b = clearance[i]
    const aBelow = a.clearanceM < alertClearanceM
    const bBelow = b.clearanceM < alertClearanceM
    if (aBelow === bBelow) continue

    const span = b.clearanceM - a.clearanceM
    const t = Math.max(0, Math.min(1, (alertClearanceM - a.clearanceM) / span))
    const time = new Date(a.time.getTime() + t * (b.time.getTime() - a.time.getTime()))
    crossings.push({ time, direction: bBelow ? 'falling' : 'rising' })
  }
  return crossings
}
