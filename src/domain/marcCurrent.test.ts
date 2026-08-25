import { describe, expect, it } from 'vitest'
import { predictMarcCurrentSeries, type MarcHarmonicTable } from './marcCurrent'
import { MARC_CURRENT_ATLAS } from './marcCurrentAtlas.generated'

describe('predictMarcCurrentSeries — cas synthétique (une seule constituante M2)', () => {
  const table: MarcHarmonicTable = {
    gridPoint: { uLat: 0, uLon: 0, vLat: 0, vLon: 0, distanceKm: 0 },
    constituents: [{ name: 'M2', speed: 28.9841042, uAmplitude: 1, uPhase: 0, vAmplitude: 0, vPhase: 0 }],
  }

  it('oscille avec une période proche de 12h25 (M2)', () => {
    const start = new Date('2026-01-01T00:00:00Z')
    const end = new Date('2026-01-03T00:00:00Z')
    const series = predictMarcCurrentSeries(table, start, end, 15)

    expect(series.length).toBeGreaterThan(100)
    for (const p of series) {
      expect(p.value).not.toBeNull()
      expect(p.value as number).toBeGreaterThanOrEqual(0)
    }

    // Amplitude U=1 m/s, V=0 → vitesse = |cos(...)|, donc max proche de 1 m/s = 3.6 km/h.
    const max = Math.max(...series.map((p) => p.value as number))
    expect(max).toBeGreaterThan(3.3)
    expect(max).toBeLessThanOrEqual(3.6)

    // Deux minima (proches de 0) par cycle M2 (~12h25) sur 48h → environ 7-8 minima.
    const nearZero = series.filter((p) => (p.value as number) < 0.1)
    expect(nearZero.length).toBeGreaterThan(0)
  })
})

describe('predictMarcCurrentSeries — donnée réelle extraite (Saint-Cast-le-Guildo)', () => {
  const table = MARC_CURRENT_ATLAS['saint-cast-le-guildo']

  it('a bien été extraite près du spot (< 5 km)', () => {
    expect(table).toBeDefined()
    expect(table.gridPoint.distanceKm).toBeLessThan(5)
  })

  it('produit une série plausible (pas de NaN, pas de valeurs aberrantes)', () => {
    const start = new Date('2026-08-25T00:00:00Z')
    const end = new Date('2026-08-27T00:00:00Z')
    const series = predictMarcCurrentSeries(table, start, end, 15)

    expect(series.length).toBeGreaterThan(100)
    for (const p of series) {
      expect(Number.isFinite(p.value)).toBe(true)
      expect(p.value as number).toBeGreaterThanOrEqual(0)
      // Un courant de marée pure dans ce secteur ne dépasse pas quelques km/h — une valeur
      // très supérieure indiquerait une erreur d'échelle dans l'extraction/la synthèse.
      expect(p.value as number).toBeLessThan(20)
    }
  })
})
