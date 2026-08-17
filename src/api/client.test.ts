import { describe, expect, it } from 'vitest'
import { parseUtcNaive, zipSeries } from './client'
import marineFixture from './__fixtures__/open-meteo-marine.json'
import shomFixture from './__fixtures__/shom-station-410.json'

describe('parseUtcNaive', () => {
  it('parse un timestamp Open-Meteo (naive ISO, sans offset) comme un instant UTC', () => {
    const d = parseUtcNaive('2026-08-04T00:00')
    expect(d.toISOString()).toBe('2026-08-04T00:00:00.000Z')
  })

  it('parse un timestamp SHOM ("AAAA/MM/JJ HH:mm:ss") comme un instant UTC', () => {
    const d = parseUtcNaive('2026/08/03 15:51:00')
    expect(d.toISOString()).toBe('2026-08-03T15:51:00.000Z')
  })
})

describe('zipSeries sur fixture Open-Meteo réelle', () => {
  it('associe chaque timestamp horaire à sa valeur', () => {
    const h = marineFixture.hourly
    const series = zipSeries(h.time, h.wave_height as (number | null)[])
    expect(series.length).toBe(h.time.length)
    expect(series[0].time).toBeInstanceOf(Date)
    expect(typeof series[0].value === 'number' || series[0].value === null).toBe(true)
  })

  it('la résolution 15 minutes est bien présente pour ce point (façade française)', () => {
    expect(marineFixture.minutely_15).toBeDefined()
    expect(marineFixture.minutely_15!.time.length).toBeGreaterThan(marineFixture.hourly.time.length)
  })
})

describe('fixture SHOM réelle (station 410, Saint-Malo)', () => {
  it('contient des observations à ~1 minute d’intervalle', () => {
    const points = shomFixture.data
    expect(points.length).toBeGreaterThan(900)
    const t0 = parseUtcNaive(points[0].timestamp).getTime()
    const t1 = parseUtcNaive(points[1].timestamp).getTime()
    expect((t1 - t0) / 1000).toBe(60)
  })
})
