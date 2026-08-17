import type { TideEvent } from './types'
import type { TimeSeriesPoint } from '../api/types'

/**
 * Extrait les pleines et basses mers d'une courbe de hauteur d'eau, avec l'heure
 * du pic affinée par interpolation parabolique (bien plus précis que l'échantillon
 * horaire ou même 15 min le plus proche).
 *
 * Fonctionne sur des segments continus : les trous (valeurs null) coupent la série
 * en plusieurs morceaux traités indépendamment, pour ne jamais interpoler à travers
 * un trou de données.
 *
 * `minProminenceM` (défaut 0, comportement inchangé) filtre les inversions de pente
 * dont l'amplitude est inférieure à ce seuil — nécessaire uniquement pour des données
 * de MESURE réelle (marégraphe, ~1 pt/minute), où le bruit de capteur (clapot, vent,
 * quantification — vérifié en pratique sur SHOM 410 : oscillations de l'ordre du
 * millimètre au centimètre) crée de fausses inversions que l'algorithme, fondé
 * uniquement sur le signe de la pente, prendrait pour de vraies PM/BM. Les courbes
 * MODÉLISÉES (Open-Meteo) sont lisses par construction et n'en ont pas besoin — d'où
 * une valeur par défaut de 0 pour ne pas changer leur comportement, ni risquer
 * d'effacer un vrai marnage sur un site à faible amplitude (ex. Méditerranée).
 */
export function extractTideEvents(series: TimeSeriesPoint[], minProminenceM = 0): TideEvent[] {
  const events: TideEvent[] = []

  for (const segment of splitOnGaps(series)) {
    if (segment.length < 3) continue

    // Signe de la pente entre échantillons consécutifs. Un plateau exact (diff === 0,
    // en pratique quasi inexistant sur des données océaniques réelles) hérite du signe
    // précédent, pour ne pas casser la détection de tendance.
    const slopeSigns: number[] = []
    let lastSign = 0
    for (let i = 1; i < segment.length; i++) {
      const diff = segment[i].value! - segment[i - 1].value!
      const sign = diff === 0 ? lastSign : Math.sign(diff)
      slopeSigns.push(sign)
      if (sign !== 0) lastSign = sign
    }

    for (let i = 1; i < segment.length - 1; i++) {
      const before = slopeSigns[i - 1]
      const after = slopeSigns[i]
      if (before === 0 || after === 0 || before === after) continue

      const isMax = before > 0 && after < 0
      const isMin = before < 0 && after > 0
      if (!isMax && !isMin) continue

      const prev = segment[i - 1]
      const curr = segment[i]
      const next = segment[i + 1]
      events.push(refineExtremum(prev, curr, next, isMax ? 'high' : 'low'))
    }
  }

  return minProminenceM > 0 ? pruneShallowReversals(events, minProminenceM) : events
}

/**
 * Fusionne les paires d'extrema consécutifs (toujours de phases opposées, par
 * construction de l'algorithme ci-dessus) dont l'écart de hauteur est trop faible
 * pour être une vraie inversion de marée. Itératif : après suppression d'une paire,
 * les deux extrema qui deviennent adjacents sont eux-mêmes réévalués — nécessaire
 * pour effacer une chaîne de plusieurs micro-oscillations proches d'un vrai sommet.
 */
function pruneShallowReversals(events: TideEvent[], minProminenceM: number): TideEvent[] {
  const result = [...events]
  let i = 0
  while (i < result.length - 1) {
    if (Math.abs(result[i + 1].height - result[i].height) < minProminenceM) {
      result.splice(i, 2)
      i = Math.max(0, i - 1)
    } else {
      i++
    }
  }
  return result
}

function splitOnGaps(series: TimeSeriesPoint[]): TimeSeriesPoint[][] {
  const segments: TimeSeriesPoint[][] = []
  let current: TimeSeriesPoint[] = []
  for (const point of series) {
    if (point.value === null) {
      if (current.length) segments.push(current)
      current = []
    } else {
      current.push(point)
    }
  }
  if (current.length) segments.push(current)
  return segments
}

/** Interpolation parabolique sur 3 points équidistants pour affiner un extremum. */
function refineExtremum(
  prev: TimeSeriesPoint,
  curr: TimeSeriesPoint,
  next: TimeSeriesPoint,
  phase: 'high' | 'low',
): TideEvent {
  const yPrev = prev.value!
  const yCurr = curr.value!
  const yNext = next.value!

  const a = (yNext + yPrev) / 2 - yCurr
  const b = (yNext - yPrev) / 2

  // a ≈ 0 signifierait une "courbure" nulle au sommet (données quasi linéaires) :
  // on garde l'échantillon brut plutôt que diviser par (quasi) zéro.
  if (Math.abs(a) < 1e-9) {
    return { time: curr.time, height: yCurr, phase }
  }

  // Décalage du sommet en unités d'intervalle d'échantillonnage, borné à ±1 par sécurité
  // (un vrai extremum local a toujours |x*| proche de 0, jamais au-delà d'un pas entier).
  const xStar = Math.max(-1, Math.min(1, -b / (2 * a)))
  const yStar = yCurr - (b * b) / (4 * a)

  const dtMs = xStar >= 0 ? next.time.getTime() - curr.time.getTime() : curr.time.getTime() - prev.time.getTime()

  return {
    time: new Date(curr.time.getTime() + xStar * dtMs),
    height: yStar,
    phase,
  }
}
