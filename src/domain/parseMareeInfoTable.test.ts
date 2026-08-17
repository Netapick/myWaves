import { describe, expect, it } from 'vitest'
import { pruneToTodayAndFuture, type ParsedTideExtreme } from './parseMareeInfoTable'

function extreme(localTime: string): ParsedTideExtreme {
  return { localTime, height: 5, isPM: false }
}

describe('pruneToTodayAndFuture', () => {
  it('garde les jours égaux ou postérieurs à todayIso, élimine les jours passés', () => {
    const extrema = [extreme('2026-08-02T23:40:00'), extreme('2026-08-03T06:00:00'), extreme('2026-08-04T06:00:00'), extreme('2026-08-05T06:00:00')]
    const result = pruneToTodayAndFuture(extrema, '2026-08-04')
    expect(result.map((e) => e.localTime)).toEqual(['2026-08-04T06:00:00', '2026-08-05T06:00:00'])
  })

  it('ne change rien si tous les jours sont déjà aujourd’hui ou plus tard', () => {
    const extrema = [extreme('2026-08-04T06:00:00'), extreme('2026-08-10T18:08:00')]
    expect(pruneToTodayAndFuture(extrema, '2026-08-04')).toEqual(extrema)
  })

  it('renvoie un tableau vide si tous les jours sont passés (repli sur cache très ancien)', () => {
    const extrema = [extreme('2026-08-01T06:00:00'), extreme('2026-08-02T06:00:00')]
    expect(pruneToTodayAndFuture(extrema, '2026-08-04')).toEqual([])
  })
})
