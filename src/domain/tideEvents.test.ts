import { describe, expect, it } from 'vitest'
import { extractTideEvents } from './tideEvents'
import type { TimeSeriesPoint } from '../api/types'
import marineFixture from '../api/__fixtures__/open-meteo-marine.json'
import { zipSeries } from '../api/client'

/** Onde semi-diurne synthétique (période 12h25, amplitude 5 m) échantillonnée à l'heure. */
function makeSyntheticTide(hours: number, periodHours = 12 + 25 / 60, amplitudeM = 5): TimeSeriesPoint[] {
  const start = Date.UTC(2026, 0, 1, 0, 0, 0)
  const points: TimeSeriesPoint[] = []
  for (let h = 0; h < hours; h++) {
    const t = new Date(start + h * 3_600_000)
    const value = amplitudeM * Math.sin((2 * Math.PI * h) / periodHours) + 6 // offset positif, réaliste
    points.push({ time: t, value })
  }
  return points
}

describe('extractTideEvents — cas synthétique (onde connue)', () => {
  const series = makeSyntheticTide(72)
  const events = extractTideEvents(series)

  it('trouve le bon nombre de pleines/basses mers sur 3 jours (~2 par jour)', () => {
    // 72h / 6.2083h (quart de période) ≈ 11-12 extrema en excluant les bords non confirmés
    expect(events.length).toBeGreaterThanOrEqual(9)
    expect(events.length).toBeLessThanOrEqual(12)
  })

  it('alterne strictement pleine mer / basse mer', () => {
    for (let i = 1; i < events.length; i++) {
      expect(events[i].phase).not.toBe(events[i - 1].phase)
    }
  })

  it('retrouve la hauteur du pic à moins de 1 cm (interpolation parabolique)', () => {
    const highs = events.filter((e) => e.phase === 'high')
    for (const h of highs) {
      expect(h.height).toBeCloseTo(11, 1) // amplitude 5 + offset 6
    }
    const lows = events.filter((e) => e.phase === 'low')
    for (const l of lows) {
      expect(l.height).toBeCloseTo(1, 1) // -5 + 6
    }
  })

  it("retrouve l'heure du pic à moins de 6 minutes (10% d'un pas horaire)", () => {
    const periodMs = (12 + 25 / 60) * 3_600_000
    const quarterMs = periodMs / 4
    const firstHigh = events.find((e) => e.phase === 'high')!
    // Le premier maximum théorique de sin() est à periodHours/4
    const expected = series[0].time.getTime() + quarterMs
    expect(Math.abs(firstHigh.time.getTime() - expected)).toBeLessThan(6 * 60_000)
  })
})

describe('extractTideEvents — minProminenceM (bruit de capteur sur mesure réelle)', () => {
  // Valeurs RÉELLES relevées le 4 août 2026 sur le marégraphe SHOM 410 (Saint-Malo),
  // pendant une longue descente monotone (jusant) — sauf un micro-sursaut de ~4 mm
  // à 00:18-00:19 (7.2648 → 7.2685 → 7.2645), pur bruit de capteur : ce segment ne
  // contient AUCUNE vraie inversion de marée, la pente est négative de bout en bout.
  function realDescentWithSensorNoise(): TimeSeriesPoint[] {
    const raw: [string, number][] = [
      ['2026-08-04T00:14', 7.3201],
      ['2026-08-04T00:15', 7.2945],
      ['2026-08-04T00:16', 7.2767],
      ['2026-08-04T00:17', 7.2691],
      ['2026-08-04T00:18', 7.2648],
      ['2026-08-04T00:19', 7.2685],
      ['2026-08-04T00:20', 7.2645],
      ['2026-08-04T00:21', 7.2532],
      ['2026-08-04T00:22', 7.2401],
    ]
    return raw.map(([t, value]) => ({ time: new Date(`${t}:00Z`), value }))
  }

  it('sans seuil (défaut) : le bruit de ~4 mm est pris pour une vraie inversion BM/PM', () => {
    const events = extractTideEvents(realDescentWithSensorNoise())
    expect(events.length).toBe(2)
    expect(events[0].phase).toBe('low')
    expect(events[1].phase).toBe('high')
  })

  it("avec minProminenceM=0.15 : le bruit est écarté, aucune fausse inversion sur cette pente réellement monotone", () => {
    const events = extractTideEvents(realDescentWithSensorNoise(), 0.15)
    expect(events).toEqual([])
  })

  it('une vraie inversion (amplitude métrique) survit au même seuil', () => {
    const series = makeSyntheticTide(24)
    const withoutFilter = extractTideEvents(series)
    const withFilter = extractTideEvents(series, 0.15)
    expect(withFilter.length).toBe(withoutFilter.length)
  })
})

describe('extractTideEvents — fixture réelle (Saint-Malo, 3 jours)', () => {
  const h = marineFixture.hourly
  const series = zipSeries(h.time, h.sea_level_height_msl as (number | null)[])
  const events = extractTideEvents(series)

  it('trouve environ 4 événements par jour (2 PM + 2 BM, marée semi-diurne)', () => {
    expect(events.length).toBeGreaterThanOrEqual(9)
    expect(events.length).toBeLessThanOrEqual(12)
  })

  it('alterne pleine mer / basse mer', () => {
    for (let i = 1; i < events.length; i++) {
      expect(events[i].phase).not.toBe(events[i - 1].phase)
    }
  })

  it('les hauteurs restent dans une plage plausible (référentiel MSL, grand marnage de Saint-Malo)', () => {
    // sea_level_height_msl est relatif au niveau moyen (MSL), pas au zéro hydrographique SHOM
    // (qui lui est ~0 à 12 m sur ce port). Amplitude typique ±5 m à Saint-Malo.
    for (const e of events) {
      expect(e.height).toBeGreaterThan(-6)
      expect(e.height).toBeLessThan(6)
    }
  })
})
