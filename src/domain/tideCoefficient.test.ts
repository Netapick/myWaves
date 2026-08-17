import { describe, expect, it } from 'vitest'
import { coefficientNear, estimateTideCoefficientAt, estimateTideCoefficientSeries, pairTideEvents } from './tideCoefficient'
import { extractTideEvents } from './tideEvents'
import { zipSeries } from '../api/client'
import brestFixture from '../api/__fixtures__/open-meteo-marine-brest.json'

const series = zipSeries(brestFixture.hourly.time, brestFixture.hourly.sea_level_height_msl as (number | null)[])

describe('pairTideEvents', () => {
  it('n’apparie que des événements de phases alternées', () => {
    const events = extractTideEvents(series)
    const pairs = pairTideEvents(events)
    for (const p of pairs) {
      expect(p.from.phase).not.toBe(p.to.phase)
      expect(p.marnageM).toBeGreaterThan(0)
    }
  })
})

describe('estimateTideCoefficientSeries — fixture réelle Brest (7 jours)', () => {
  const coeffs = estimateTideCoefficientSeries(series)

  it('produit un coefficient par demi-cycle, borné à la plage officielle 20-120', () => {
    expect(coeffs.length).toBeGreaterThan(5)
    for (const c of coeffs) {
      expect(c.coefficient).toBeGreaterThanOrEqual(20)
      expect(c.coefficient).toBeLessThanOrEqual(120)
      expect(c.source).toBe('estimated-from-sea-level-series')
    }
  })

  it('des coefficients consécutifs restent proches (variation lente jour après jour)', () => {
    for (let i = 1; i < coeffs.length; i++) {
      expect(Math.abs(coeffs[i].coefficient - coeffs[i - 1].coefficient)).toBeLessThan(15)
    }
  })
})

describe('estimateTideCoefficientAt', () => {
  it('retrouve la demi-marée qui encadre l’instant demandé', () => {
    const events = extractTideEvents(series)
    const pairs = pairTideEvents(events)
    const middlePair = pairs[Math.floor(pairs.length / 2)]
    const midpoint = new Date((middlePair.from.time.getTime() + middlePair.to.time.getTime()) / 2)

    const estimate = estimateTideCoefficientAt(series, midpoint)
    expect(estimate).not.toBeNull()
    expect(estimate!.from.time.getTime()).toBe(middlePair.from.time.getTime())
    expect(estimate!.to.time.getTime()).toBe(middlePair.to.time.getTime())
  })

  it('retourne null sur une série vide', () => {
    expect(estimateTideCoefficientAt([], new Date())).toBeNull()
  })
})

describe('coefficientNear', () => {
  it('donne le même résultat que estimateTideCoefficientAt, depuis une série déjà estimée', () => {
    const coeffs = estimateTideCoefficientSeries(series)
    const at = coeffs[Math.floor(coeffs.length / 2)].from.time
    expect(coefficientNear(coeffs, at)).toBe(estimateTideCoefficientAt(series, at)!.coefficient)
  })

  it('retourne null sur une liste vide', () => {
    expect(coefficientNear([], new Date())).toBeNull()
  })
})
