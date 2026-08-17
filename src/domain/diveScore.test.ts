import { describe, expect, it } from 'vitest'
import { computeDiveScore } from './diveScore'

describe('computeDiveScore', () => {
  it('conditions calmes → score élevé', () => {
    const r = computeDiveScore({
      waveHeightM: 0.1,
      wavePeriodS: 6,
      windSpeedKmh: 5,
      currentVelocityKmh: 0.2,
      minutesToNearestSlack: 0,
    })
    expect(r.score).toBeGreaterThanOrEqual(80)
    expect(r.label).toBe('excellent')
  })

  it('conditions dures (houle, vent, courant forts) → déconseillé', () => {
    const r = computeDiveScore({
      waveHeightM: 2.5,
      wavePeriodS: 10,
      windSpeedKmh: 45,
      currentVelocityKmh: 4,
      minutesToNearestSlack: 300,
    })
    expect(r.score).toBeLessThan(20)
    expect(r.label).toBe('déconseillé')
  })

  it('à hauteur de houle égale, une période plus longue pénalise davantage (ressac profond)', () => {
    const shortPeriod = computeDiveScore({
      waveHeightM: 1,
      wavePeriodS: 4,
      windSpeedKmh: 0,
      currentVelocityKmh: 0,
      minutesToNearestSlack: 0,
    })
    const longPeriod = computeDiveScore({
      waveHeightM: 1,
      wavePeriodS: 14,
      windSpeedKmh: 0,
      currentVelocityKmh: 0,
      minutesToNearestSlack: 0,
    })
    expect(longPeriod.breakdown.wave).toBeLessThan(shortPeriod.breakdown.wave)
  })

  it('la proximité d’une étale relève le sous-score courant, jamais à la baisse', () => {
    const farFromSlack = computeDiveScore({
      waveHeightM: 0,
      wavePeriodS: 8,
      windSpeedKmh: 0,
      currentVelocityKmh: 3,
      minutesToNearestSlack: 300,
    })
    const nearSlack = computeDiveScore({
      waveHeightM: 0,
      wavePeriodS: 8,
      windSpeedKmh: 0,
      currentVelocityKmh: 3,
      minutesToNearestSlack: 2,
    })
    expect(nearSlack.breakdown.current).toBeGreaterThan(farFromSlack.breakdown.current)
    expect(nearSlack.breakdown.current).toBeGreaterThanOrEqual(90)
  })

  it('une donnée manquante est exclue et n’effondre pas le score (renormalisation)', () => {
    const withWind = computeDiveScore({
      waveHeightM: 0.2,
      wavePeriodS: 6,
      windSpeedKmh: 10,
      currentVelocityKmh: 0.2,
      minutesToNearestSlack: 0,
    })
    const withoutWind = computeDiveScore({
      waveHeightM: 0.2,
      wavePeriodS: 6,
      windSpeedKmh: null,
      currentVelocityKmh: 0.2,
      minutesToNearestSlack: 0,
    })
    // Sans le vent, le score ne doit pas s'effondrer vers 0 : il reste dans le même ordre de grandeur.
    expect(withoutWind.score).toBeGreaterThan(70)
    expect(Math.abs(withoutWind.score - withWind.score)).toBeLessThan(20)
  })

  it('aucune donnée disponible → 0 et "déconseillé", jamais un score optimiste par défaut', () => {
    const r = computeDiveScore({
      waveHeightM: null,
      wavePeriodS: null,
      windSpeedKmh: null,
      currentVelocityKmh: null,
      minutesToNearestSlack: null,
    })
    expect(r.score).toBe(0)
    expect(r.label).toBe('déconseillé')
  })

  it('le score reste toujours borné entre 0 et 100', () => {
    const r = computeDiveScore({
      waveHeightM: 0,
      wavePeriodS: 1,
      windSpeedKmh: 0,
      currentVelocityKmh: 0,
      minutesToNearestSlack: 0,
    })
    expect(r.score).toBeGreaterThanOrEqual(0)
    expect(r.score).toBeLessThanOrEqual(100)
  })
})
