export type TidePhase = 'high' | 'low'

export interface TideEvent {
  time: Date
  /** Hauteur d'eau au pic, interpolée (parabole sur 3 points). */
  height: number
  phase: TidePhase
}

export interface SlackWindow {
  start: Date
  end: Date
  /** Instant du courant le plus faible dans la fenêtre. */
  center: Date
  minVelocity: number
}

export interface DiveScoreBreakdown {
  wave: number
  wind: number
  current: number
  slackBonus: number
}

export interface DiveScoreResult {
  /** 0 (injouable) à 100 (excellent). */
  score: number
  label: 'excellent' | 'bon' | 'moyen' | 'médiocre' | 'déconseillé'
  breakdown: DiveScoreBreakdown
}

export interface DiveScoreInput {
  waveHeightM: number | null
  wavePeriodS: number | null
  windSpeedKmh: number | null
  currentVelocityKmh: number | null
  /** Minutes jusqu'à l'étale la plus proche (passée ou à venir) ; null si inconnu. */
  minutesToNearestSlack: number | null
}
