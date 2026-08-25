import { describe, expect, it } from 'vitest'
import { findNearestMarcTable, predictMarcCurrentSeries, type MarcAtlasEntry, type MarcHarmonicTable } from './marcCurrent'
import { MARC_CURRENT_ATLAS } from './marcCurrentAtlas.generated'

function makeEntry(lat: number, lon: number): MarcAtlasEntry {
  return {
    lat,
    lon,
    gridPoint: { uLat: lat, uLon: lon, vLat: lat, vLon: lon, distanceKm: 0 },
    constituents: [],
    elevation: { gridPoint: { tLat: lat, tLon: lon, distanceKm: 0 }, constituents: [] },
  }
}

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

describe('findNearestMarcTable — donnée réelle extraite (Saint-Cast-le-Guildo)', () => {
  // Coordonnées du spot (voir domain/spot.ts), pas celles d'un point de l'atlas : c'est
  // exactement ce que fait SpotPage.tsx en pratique (recherche par plus proche voisin).
  const match = findNearestMarcTable(MARC_CURRENT_ATLAS, 48.6408354, -2.2449483)

  it('trouve bien un point à proximité (< 5 km)', () => {
    expect(match).toBeDefined()
    expect(match!.distanceKm).toBeLessThan(5)
  })

  it('produit une série plausible (pas de NaN, pas de valeurs aberrantes)', () => {
    const start = new Date('2026-08-25T00:00:00Z')
    const end = new Date('2026-08-27T00:00:00Z')
    const series = predictMarcCurrentSeries(match!.table, start, end, 15)

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

describe('findNearestMarcTable — hors couverture', () => {
  it('retourne undefined loin de tout point extrait (ex. large Atlantique)', () => {
    expect(findNearestMarcTable(MARC_CURRENT_ATLAS, 46, -15)).toBeUndefined()
  })
})

describe('findNearestMarcTable — cas synthétique (plusieurs points)', () => {
  const atlas = [makeEntry(48.0, -2.0), makeEntry(48.5, -2.5), makeEntry(47.0, -3.0)]

  it('choisit le point le plus proche, pas le premier de la liste', () => {
    const match = findNearestMarcTable(atlas, 48.51, -2.49)
    expect(match).toBeDefined()
    expect(match!.table.gridPoint.uLat).toBeCloseTo(48.5)
  })

  it('retourne la distance réelle jusqu’au point choisi (pas 0)', () => {
    const match = findNearestMarcTable(atlas, 48.0, -2.05)
    expect(match!.distanceKm).toBeGreaterThan(0)
    expect(match!.distanceKm).toBeLessThan(8)
  })

  it('rejette un point au-delà de MAX_MARC_LOOKUP_DISTANCE_KM', () => {
    expect(findNearestMarcTable(atlas, 40, -2)).toBeUndefined()
  })

  it('retourne undefined pour un atlas vide', () => {
    expect(findNearestMarcTable([], 48, -2)).toBeUndefined()
  })
})
