import { describe, expect, it } from 'vitest'
import {
  applyObservedCorrection,
  calibrateForecastToGauge,
  computeClearanceSeries,
  EMPIRICAL_OBSERVED_CORRECTION_M,
  findAllThresholdCrossings,
  findNextThresholdCrossing,
  getCurrentSillStatus,
  mergeObservedWithForecast,
} from './sillLevel'
import { parseUtcNaive } from '../api/client'
import type { TimeSeriesPoint } from '../api/types'
import shomFixture from '../api/__fixtures__/shom-station-410.json'

function fixtureToSeries(): TimeSeriesPoint[] {
  return shomFixture.data.map((o) => ({ time: parseUtcNaive(o.timestamp), value: o.value }))
}

describe('computeClearanceSeries — fixture réelle SHOM (station 410, 3 août 2026)', () => {
  const series = fixtureToSeries()
  const clearance = computeClearanceSeries(series, 2.0)

  it('retrouve le minimum de hauteur au-dessus du seuil mesuré en direct (~0,27 m)', () => {
    const min = Math.min(...clearance.map((c) => c.clearanceM))
    // Mesuré en direct pendant la préparation du plan : min brut 2,27 m, seuil 2,00 m.
    expect(min).toBeCloseTo(0.27, 1)
  })

  it('retrouve le maximum cohérent avec le marnage exceptionnel de Saint-Malo (~9,5 m au-dessus du seuil)', () => {
    const max = Math.max(...clearance.map((c) => c.clearanceM))
    expect(max).toBeGreaterThan(9)
    expect(max).toBeLessThan(10)
  })
})

describe('getCurrentSillStatus', () => {
  const series = fixtureToSeries()

  it('retourne la mesure la plus proche de l’instant demandé, avec sa fraîcheur', () => {
    const at = parseUtcNaive('2026/08/03 12:00:00')
    const status = getCurrentSillStatus(series, 2.0, at)
    expect(status).not.toBeNull()
    expect(Math.abs(status!.measuredAt.getTime() - at.getTime())).toBeLessThan(60_000)
    expect(Math.abs(status!.stalenessMs)).toBeLessThan(60_000)
  })

  it('détecte la tendance montante pendant le flot et descendante pendant le jusant', () => {
    // Vérifié sur les valeurs minute par minute de la fixture : basse mer ~03h10-04h,
    // puis flot net à 05h (3,59 → 3,93 → 4,30 sur 04h50-05h10).
    const risingAt = parseUtcNaive('2026/08/03 05:00:00')
    const rising = getCurrentSillStatus(series, 2.0, risingAt)
    expect(rising!.trend).toBe('rising')

    // Pleine mer ~09h00-09h05, puis jusant net : 09h00 est déjà en légère baisse
    // par rapport à 08h50 (11,51 → 11,46).
    const fallingAt = parseUtcNaive('2026/08/03 09:00:00')
    const falling = getCurrentSillStatus(series, 2.0, fallingAt)
    expect(falling!.trend).toBe('falling')
  })

  it('retourne null sur une série vide', () => {
    expect(getCurrentSillStatus([], 2.0, new Date())).toBeNull()
  })
})

describe('calibrateForecastToGauge', () => {
  const observed = fixtureToSeries()

  it('retrouve un décalage connu injecté artificiellement entre les deux référentiels', () => {
    const injectedOffset = -4.3 // écart plausible entre zéro hydrographique et niveau moyen
    const lastObserved = [...observed].reverse().find((p) => p.value !== null)!
    // Prévision synthétique, dans un AUTRE référentiel, qui recouvre le dernier point observé.
    const forecast: TimeSeriesPoint[] = observed.map((p) => ({
      time: p.time,
      value: p.value === null ? null : p.value - injectedOffset,
    }))
    // Vérifie qu'au point de recouvrement, avant recalage, l'écart est bien l'offset injecté.
    const forecastAtSameTime = forecast.find((p) => p.time.getTime() === lastObserved.time.getTime())!
    expect(lastObserved.value! - forecastAtSameTime.value!).toBeCloseTo(injectedOffset, 6)

    const calibrated = calibrateForecastToGauge(observed, forecast)
    const calibratedAtSameTime = calibrated.find((p) => p.time.getTime() === lastObserved.time.getTime())!
    expect(calibratedAtSameTime.value).toBeCloseTo(lastObserved.value!, 6)
  })

  it('renvoie la prévision inchangée si les deux séries ne se recouvrent pas', () => {
    const farFuture: TimeSeriesPoint[] = [{ time: new Date(observed[0].time.getTime() + 30 * 86_400_000), value: 5 }]
    const result = calibrateForecastToGauge(observed, farFuture)
    expect(result).toBe(farFuture)
  })

  it('renvoie la prévision inchangée si l’une des deux séries est vide', () => {
    expect(calibrateForecastToGauge([], observed)).toEqual(observed)
    expect(calibrateForecastToGauge(observed, [])).toEqual([])
  })
})

describe('applyObservedCorrection', () => {
  const series = fixtureToSeries()

  it('décale chaque valeur non-nulle de la constante empirique', () => {
    const corrected = applyObservedCorrection(series)
    for (let i = 0; i < series.length; i++) {
      expect(corrected[i].value).toBeCloseTo(series[i].value! + EMPIRICAL_OBSERVED_CORRECTION_M, 9)
      expect(corrected[i].time).toBe(series[i].time)
    }
  })

  it('préserve les valeurs null (trous de données)', () => {
    const withGap: TimeSeriesPoint[] = [{ time: series[0].time, value: null }]
    expect(applyObservedCorrection(withGap)[0].value).toBeNull()
  })
})

describe('mergeObservedWithForecast', () => {
  it('garde toutes les observations et ne prend la prévision que strictement après la dernière', () => {
    const observed = [
      { time: new Date('2026-08-04T08:00:00Z'), value: 5 },
      { time: new Date('2026-08-04T09:00:00Z'), value: 6 },
    ]
    const forecast = [
      { time: new Date('2026-08-04T08:30:00Z'), value: 999 }, // avant la dernière observation : écarté
      { time: new Date('2026-08-04T09:00:00Z'), value: 999 }, // égal à la dernière observation : écarté
      { time: new Date('2026-08-04T10:00:00Z'), value: 7 }, // après : conservé
    ]

    const merged = mergeObservedWithForecast(observed, forecast)

    expect(merged).toEqual([...observed, { time: new Date('2026-08-04T10:00:00Z'), value: 7 }])
  })

  it('renvoie la prévision telle quelle si aucune observation', () => {
    const forecast = [{ time: new Date(), value: 1 }]
    expect(mergeObservedWithForecast([], forecast)).toBe(forecast)
  })

  it("renvoie l'observation telle quelle si aucune prévision", () => {
    const observed = [{ time: new Date(), value: 1 }]
    expect(mergeObservedWithForecast(observed, [])).toBe(observed)
  })
})

describe('findNextThresholdCrossing', () => {
  const series = fixtureToSeries()

  it('trouve le prochain passage sous 1 m au-dessus du seuil, en descente', () => {
    const from = parseUtcNaive('2026/08/03 06:00:00')
    const crossing = findNextThresholdCrossing(series, 1.0, 2.0, from)
    expect(crossing).not.toBeNull()
    expect(crossing!.direction).toBe('falling')
    expect(crossing!.time.getTime()).toBeGreaterThan(from.getTime())
  })

  it('retourne null si aucun franchissement après le point de départ demandé', () => {
    const veryLate = parseUtcNaive('2026/08/03 23:59:00')
    const crossing = findNextThresholdCrossing(series, -5, 2.0, veryLate)
    expect(crossing).toBeNull()
  })
})

describe('findAllThresholdCrossings', () => {
  const series = fixtureToSeries()

  it('trouve tous les franchissements de la journée, en alternant montée/descente', () => {
    const from = parseUtcNaive('2026/08/03 00:00:00')
    const to = parseUtcNaive('2026/08/04 00:00:00')
    const crossings = findAllThresholdCrossings(series, 1.0, 2.0, from, to)
    expect(crossings.length).toBeGreaterThanOrEqual(2)
    for (let i = 1; i < crossings.length; i++) {
      expect(crossings[i].direction).not.toBe(crossings[i - 1].direction)
    }
    for (const c of crossings) {
      expect(c.time.getTime()).toBeGreaterThanOrEqual(from.getTime())
      expect(c.time.getTime()).toBeLessThanOrEqual(to.getTime())
    }
  })

  it('ne retourne rien en dehors de la fenêtre [from, to]', () => {
    const from = parseUtcNaive('2026/08/03 00:00:00')
    const to = parseUtcNaive('2026/08/03 00:30:00') // avant tout franchissement de 1 m
    const crossings = findAllThresholdCrossings(series, 1.0, 2.0, from, to)
    expect(crossings).toEqual([])
  })
})
