import type { TimeSeriesPoint } from '../api/types'

/** Point de la série le plus proche de l'instant `at`, ou `null` si la série est vide/tout null. */
export function pointNear(series: TimeSeriesPoint[], at: Date = new Date()): TimeSeriesPoint | null {
  let best: TimeSeriesPoint | null = null
  let bestDiff = Infinity
  for (const p of series) {
    if (p.value === null) continue
    const diff = Math.abs(p.time.getTime() - at.getTime())
    if (diff < bestDiff) {
      best = p
      bestDiff = diff
    }
  }
  return best
}

/** Valeur de la série la plus proche de l'instant `at`, ou `null` si la série est vide/tout null. */
export function valueNear(series: TimeSeriesPoint[], at: Date = new Date()): number | null {
  return pointNear(series, at)?.value ?? null
}

/** Ne garde que les points dans [from, to], bornes incluses. */
export function windowSeries(series: TimeSeriesPoint[], from: Date, to: Date): TimeSeriesPoint[] {
  return series.filter((p) => p.time >= from && p.time <= to)
}

/** Ne garde que les points dans [center - hours, center + hours]. */
export function windowAround<T extends { time: Date }>(series: T[], center: Date, hours: number): T[] {
  const from = new Date(center.getTime() - hours * 3_600_000)
  const to = new Date(center.getTime() + hours * 3_600_000)
  return series.filter((p) => p.time >= from && p.time <= to)
}
