import type { DiveScoreInput, DiveScoreResult } from './types'

/**
 * Pondérations et constantes de l'indice de plongeabilité — TOUT se règle ici.
 *
 * Principe : chaque facteur produit un sous-score 0-100 par décroissance exponentielle
 * douce (`100 * exp(-x / k)`), où `k` est la valeur du facteur qui fait tomber le
 * sous-score à ~37 (1/e). Un facteur manquant est simplement exclu de la moyenne
 * pondérée (les poids restants sont renormalisés) plutôt que de faire planter le calcul.
 */
export const DIVE_SCORE_CONFIG = {
  weights: {
    wave: 0.35,
    wind: 0.2,
    current: 0.45, // le courant prime : c'est le facteur de sécurité n°1 en plongée
  },
  /** Hauteur de houle "effective" (m) à laquelle le sous-score vagues tombe à ~37/100. */
  waveHalfLifeM: 0.6,
  /**
   * Facteur multipliant la hauteur de houle brute selon sa période : une houle LONGUE
   * (swell) génère un ressac profond, ressenti jusqu'à 10-20 m — bien plus gênant en
   * plongée qu'un clapot court de même hauteur, qui reste surtout en surface.
   * period=8s → facteur neutre (1.0) ; period=4s → 0.7 ; period=14s+ → ~1.6.
   */
  periodFactor: { neutralPeriodS: 8, min: 0.7, max: 1.6 },
  /** Vitesse de vent (km/h) à laquelle le sous-score vent tombe à ~37/100. */
  windHalfLifeKmh: 25,
  /** Vitesse de courant (km/h) à laquelle le sous-score courant tombe à ~37/100. */
  currentHalfLifeKmh: 1.5,
  /**
   * Bonus de proximité d'étale : si l'instant choisi est à moins de `fadeMinutes`
   * d'une étale, on relève le sous-score courant vers ce bonus (jamais à la baisse) —
   * c'est tout l'intérêt de caler sa plongée sur l'étale plutôt que sur l'instant
   * "moyen" que renvoie le modèle.
   */
  slackBonus: { fadeMinutes: 60 },
} as const

const LABEL_THRESHOLDS: [number, DiveScoreResult['label']][] = [
  [80, 'excellent'],
  [60, 'bon'],
  [40, 'moyen'],
  [20, 'médiocre'],
]

function expScore(value: number, halfLife: number): number {
  return 100 * Math.exp(-value / halfLife)
}

function periodFactor(periodS: number): number {
  const { neutralPeriodS, min, max } = DIVE_SCORE_CONFIG.periodFactor
  return Math.max(min, Math.min(max, periodS / neutralPeriodS))
}

function labelFor(score: number): DiveScoreResult['label'] {
  for (const [min, label] of LABEL_THRESHOLDS) {
    if (score >= min) return label
  }
  return 'déconseillé'
}

export function computeDiveScore(input: DiveScoreInput): DiveScoreResult {
  const { weights } = DIVE_SCORE_CONFIG
  const terms: { key: keyof typeof weights; value: number }[] = []

  if (input.waveHeightM !== null) {
    const factor = input.wavePeriodS !== null ? periodFactor(input.wavePeriodS) : 1
    const effectiveHeight = input.waveHeightM * factor
    terms.push({ key: 'wave', value: expScore(effectiveHeight, DIVE_SCORE_CONFIG.waveHalfLifeM) })
  }

  if (input.windSpeedKmh !== null) {
    terms.push({ key: 'wind', value: expScore(input.windSpeedKmh, DIVE_SCORE_CONFIG.windHalfLifeKmh) })
  }

  if (input.currentVelocityKmh !== null) {
    let currentScore = expScore(input.currentVelocityKmh, DIVE_SCORE_CONFIG.currentHalfLifeKmh)
    if (input.minutesToNearestSlack !== null) {
      const { fadeMinutes } = DIVE_SCORE_CONFIG.slackBonus
      const bonus = Math.max(0, 1 - input.minutesToNearestSlack / fadeMinutes) * 100
      currentScore = Math.max(currentScore, bonus)
    }
    terms.push({ key: 'current', value: currentScore })
  }

  const breakdown = { wave: 0, wind: 0, current: 0, slackBonus: 0 }
  for (const t of terms) breakdown[t.key] = Math.round(t.value)

  if (terms.length === 0) {
    // Aucune donnée exploitable : ne jamais afficher "excellent" par défaut.
    return { score: 0, label: 'déconseillé', breakdown }
  }

  const weightSum = terms.reduce((s, t) => s + weights[t.key], 0)
  const weighted = terms.reduce((s, t) => s + weights[t.key] * t.value, 0) / weightSum
  const score = Math.round(Math.max(0, Math.min(100, weighted)))

  return { score, label: labelFor(score), breakdown }
}
