import { describe, expect, it } from 'vitest'
import { extractSlackWindows } from './slackWindows'
import type { TimeSeriesPoint } from '../api/types'
import marineFixture from '../api/__fixtures__/open-meteo-marine.json'
import { zipSeries } from '../api/client'

/**
 * Vitesse de courant synthétique, toujours positive, avec un vrai minimum lisse
 * (parabolique au voisinage de zéro) à chaque étale — contrairement à |cos(t)| qui
 * formerait un point anguleux non lisse à l'inversion du courant.
 */
function makeSyntheticCurrent(hours: number, periodH = 12 + 25 / 60, amplitudeKmh = 3, stepMinutes = 15) {
  const start = Date.UTC(2026, 0, 1, 0, 0, 0)
  const stepMs = stepMinutes * 60_000
  const nSteps = Math.floor((hours * 3_600_000) / stepMs)
  const points: TimeSeriesPoint[] = []
  for (let i = 0; i < nSteps; i++) {
    const tMs = i * stepMs
    const tH = tMs / 3_600_000
    const s = Math.sin((2 * Math.PI * tH) / periodH)
    points.push({ time: new Date(start + tMs), value: amplitudeKmh * s * s })
  }
  return { points, periodH, amplitudeKmh, stepMs }
}

describe('extractSlackWindows — cas synthétique (minimum lisse connu)', () => {
  const threshold = 0.5
  const { points, periodH, amplitudeKmh } = makeSyntheticCurrent(48)
  const windows = extractSlackWindows(points, threshold)

  it('trouve environ une fenêtre toutes les ~6h12 (deux étales par cycle de marée)', () => {
    // 48h / (periodH/2) ≈ 7.7 étales attendues, moins le premier bord non confirmé
    expect(windows.length).toBeGreaterThanOrEqual(6)
    expect(windows.length).toBeLessThanOrEqual(9)
  })

  it('le centre de chaque fenêtre interne tombe sur un zéro théorique (k · période/2)', () => {
    const halfPeriodMs = (periodH / 2) * 3_600_000
    const seriesStartMs = points[0].time.getTime()
    // On ignore la première fenêtre : elle démarre au bord de la série (limite documentée),
    // son centre peut donc être légèrement biaisé par la troncature des données.
    for (const w of windows.slice(1, -1)) {
      const offsetMs = w.center.getTime() - seriesStartMs
      const kNearest = Math.round(offsetMs / halfPeriodMs)
      const expectedOffsetMs = kNearest * halfPeriodMs
      const errorMinutes = Math.abs(offsetMs - expectedOffsetMs) / 60_000
      expect(errorMinutes).toBeLessThan(8)
    }
  })

  it('la vitesse minimale de chaque fenêtre est proche de zéro', () => {
    for (const w of windows) {
      expect(w.minVelocity).toBeLessThan(threshold)
      expect(w.minVelocity).toBeGreaterThanOrEqual(0)
    }
  })

  it('la largeur de fenêtre correspond à la théorie (v(t)=A·sin²(2πt/P) ≥ seuil résolu analytiquement)', () => {
    // Autour d'un zéro interne, la fenêtre est symétrique : demi-largeur = (P/2π)·asin(√(seuil/A))
    const halfWidthTheory = (periodH / (2 * Math.PI)) * Math.asin(Math.sqrt(threshold / amplitudeKmh)) * 3_600_000
    const interior = windows.slice(1, -1)
    for (const w of interior) {
      const widthMs = w.end.getTime() - w.start.getTime()
      const errorMinutes = Math.abs(widthMs - 2 * halfWidthTheory) / 60_000
      expect(errorMinutes).toBeLessThan(10)
    }
  })
})

describe('extractSlackWindows — fixture réelle (courant 15 min, Saint-Malo)', () => {
  const m15 = marineFixture.minutely_15!
  const series = zipSeries(m15.time, m15.ocean_current_velocity as (number | null)[])
  const windows = extractSlackWindows(series)

  it('ne lève pas d’exception et produit des fenêtres cohérentes (start ≤ center ≤ end)', () => {
    for (const w of windows) {
      expect(w.start.getTime()).toBeLessThanOrEqual(w.center.getTime())
      expect(w.center.getTime()).toBeLessThanOrEqual(w.end.getTime())
      expect(w.minVelocity).toBeGreaterThanOrEqual(0)
    }
  })
})
