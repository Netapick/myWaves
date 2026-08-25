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

export interface MarcHarmonicTable {
  gridPoint: { uLat: number; uLon: number; vLat: number; vLon: number; distanceKm: number }
  constituents: MarcConstituent[]
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
