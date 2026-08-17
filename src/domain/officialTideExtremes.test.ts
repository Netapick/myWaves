import { describe, expect, it } from 'vitest'
import { officialCoefficientNear, officialHeightAt, SNAPSHOT_EXTREMA, withOfficialTideWhereAvailable } from './officialTideExtremes'
import { fromZonedTime } from 'date-fns-tz'

describe('officialHeightAt', () => {
  it('retrouve exactement la hauteur officielle au moment d’un extremum connu (PM 04/08 11h25)', () => {
    const at = fromZonedTime('2026-08-04T11:25:00', 'Europe/Paris')
    expect(officialHeightAt(SNAPSHOT_EXTREMA, at)).toBeCloseTo(11.06, 6)
  })

  it('retrouve exactement la hauteur officielle à une basse mer connue (BM 04/08 18h11)', () => {
    const at = fromZonedTime('2026-08-04T18:11:00', 'Europe/Paris')
    expect(officialHeightAt(SNAPSHOT_EXTREMA, at)).toBeCloseTo(2.8, 6)
  })

  // Vérifie le calcul manuel fait pendant l'investigation de l'écart de 21 cm : entre
  // PM 11h25 (11.06) et BM 18h11 (2.80), 13h41 heure de Paris donne ≈8.97 m par
  // interpolation demi-cosinus (valeur utilisée pour expliquer l'écart réel/prédiction).
  it('interpole une valeur plausible entre deux extrema connus', () => {
    const at = fromZonedTime('2026-08-04T13:41:00', 'Europe/Paris')
    expect(officialHeightAt(SNAPSHOT_EXTREMA, at)).toBeCloseTo(8.97, 1)
  })

  it('reste dans [min, max] des deux extrema encadrants — jamais de dépassement', () => {
    const at = fromZonedTime('2026-08-04T15:00:00', 'Europe/Paris')
    const h = officialHeightAt(SNAPSHOT_EXTREMA, at)!
    expect(h).toBeGreaterThanOrEqual(2.8)
    expect(h).toBeLessThanOrEqual(11.06)
  })

  it('renvoie null avant la première donnée connue', () => {
    const at = fromZonedTime('2026-08-01T00:00:00', 'Europe/Paris')
    expect(officialHeightAt(SNAPSHOT_EXTREMA, at)).toBeNull()
  })

  it('renvoie null après la dernière donnée connue', () => {
    const at = fromZonedTime('2026-08-15T00:00:00', 'Europe/Paris')
    expect(officialHeightAt(SNAPSHOT_EXTREMA, at)).toBeNull()
  })

  it('renvoie null pour une liste vide ou à un seul point', () => {
    expect(officialHeightAt([], new Date())).toBeNull()
    expect(officialHeightAt([SNAPSHOT_EXTREMA[0]], new Date())).toBeNull()
  })
})

describe('officialCoefficientNear', () => {
  it('retrouve le coefficient officiel du PM le plus proche', () => {
    const at = fromZonedTime('2026-08-04T12:00:00', 'Europe/Paris') // proche du PM 11h25 (coeff 74)
    expect(officialCoefficientNear(SNAPSHOT_EXTREMA, at)).toBe(74)
  })

  it('ignore les extrema sans coefficient (les BM)', () => {
    const at = fromZonedTime('2026-08-04T06:00:00', 'Europe/Paris') // exactement une BM, sans coeff
    // Le PM le plus proche (11h25, coeff 74) doit être retenu plutôt que null.
    expect(officialCoefficientNear(SNAPSHOT_EXTREMA, at)).toBe(74)
  })

  it('renvoie null si aucun extremum ne porte de coefficient', () => {
    const noCoeff = SNAPSHOT_EXTREMA.map((e) => ({ time: e.time, height: e.height }))
    expect(officialCoefficientNear(noCoeff, new Date())).toBeNull()
  })
})

describe('withOfficialTideWhereAvailable', () => {
  it('remplace les points couverts, laisse les autres inchangés', () => {
    const covered = fromZonedTime('2026-08-04T11:25:00', 'Europe/Paris')
    const uncovered = fromZonedTime('2026-08-20T00:00:00', 'Europe/Paris')
    const series = [
      { time: covered, value: 999 }, // valeur "prévision" volontairement fausse, doit être écrasée
      { time: uncovered, value: 42 }, // hors couverture, doit rester tel quel
    ]
    const result = withOfficialTideWhereAvailable(SNAPSHOT_EXTREMA, series)
    expect(result[0].value).toBeCloseTo(11.06, 6)
    expect(result[1].value).toBe(42)
  })

  // Bug réel trouvé en usage sur build Android (04/08/2026) : depuis que le fetch live
  // ne couvre plus que le jour courant (voir api/mareeInfoTable.ts), juste après le
  // dernier extremum du jour, Open-Meteo peut afficher une valeur bien plus basse que
  // la hauteur officielle (déjà reparti à la baisse à cause de son avance de timing,
  // voir calibrateForecastToGauge) — mesuré en pratique : saut de 1,46 m en 15 min,
  // visible comme une "coupure" nette sur la courbe de marée.
  describe('raccord sans à-coup à la frontière de couverture', () => {
    const extrema = [
      { time: fromZonedTime('2026-08-04T18:11:00', 'Europe/Paris'), height: 2.8 },
      { time: fromZonedTime('2026-08-04T23:40:00', 'Europe/Paris'), height: 11.01, coefficient: 70 },
    ]

    it('reste proche de la dernière valeur officielle juste après elle, au lieu de sauter sur la valeur brute', () => {
      const justAfter = fromZonedTime('2026-08-04T23:45:00', 'Europe/Paris') // 5 min après le dernier extremum
      const series = [{ time: justAfter, value: 9.53 }] // valeur Open-Meteo brute observée en pratique
      const result = withOfficialTideWhereAvailable(extrema, series)
      expect(result[0].value!).toBeGreaterThan(10.5)
    })

    it("s'estompe totalement au-delà de la fenêtre de raccord (3h)", () => {
      const farAfter = fromZonedTime('2026-08-05T03:00:00', 'Europe/Paris') // 3h20 après le dernier extremum
      const series = [{ time: farAfter, value: 5.0 }]
      const result = withOfficialTideWhereAvailable(extrema, series)
      expect(result[0].value).toBe(5.0)
    })

    it('lisse aussi, symétriquement, le raccord juste avant le premier extremum', () => {
      const justBefore = fromZonedTime('2026-08-04T18:06:00', 'Europe/Paris') // 5 min avant le 1er extremum (18h11)
      const series = [{ time: justBefore, value: 0.5 }]
      const result = withOfficialTideWhereAvailable(extrema, series)
      expect(result[0].value!).toBeGreaterThan(2.0)
    })
  })
})
