import type { SlackWindow } from './types'
import type { TimeSeriesPoint } from '../api/types'

/**
 * Vitesse de courant en dessous de laquelle on considère qu'il est possible/confortable
 * de plonger : ~0,3 nœud, converti en km/h (1 nd = 1,852 km/h). Valeur par défaut,
 * réglable — les palanquées expérimentées tolèrent plus, les débutants moins.
 */
export const DEFAULT_SLACK_THRESHOLD_KMH = 0.3 * 1.852

/**
 * Extrait les fenêtres d'étale : les intervalles où la vitesse du courant reste
 * sous un seuil donné, avec l'instant du minimum local affiné par interpolation
 * parabolique et les bornes affinées par interpolation linéaire au franchissement du seuil.
 */
export function extractSlackWindows(
  series: TimeSeriesPoint[],
  thresholdKmh: number = DEFAULT_SLACK_THRESHOLD_KMH,
): SlackWindow[] {
  const windows: SlackWindow[] = []

  for (const segment of splitOnGaps(series)) {
    if (segment.length < 2) continue

    let windowStartTime: Date | null = null
    let minValue = Infinity
    let minIndex = -1

    const closeWindow = (endTime: Date) => {
      if (windowStartTime === null || minIndex === -1) return
      const center = refineMinimum(segment, minIndex)
      windows.push({ start: windowStartTime, end: endTime, center, minVelocity: minValue })
      windowStartTime = null
      minValue = Infinity
      minIndex = -1
    }

    // Le tout premier échantillon peut déjà être sous le seuil : on ne connaît pas
    // l'instant réel de franchissement avant le début des données, donc on démarre
    // la fenêtre au premier échantillon disponible (limite documentée).
    if (segment[0].value! <= thresholdKmh) {
      windowStartTime = segment[0].time
      minValue = segment[0].value!
      minIndex = 0
    }

    for (let i = 1; i < segment.length; i++) {
      const prev = segment[i - 1]
      const curr = segment[i]
      const prevBelow = prev.value! <= thresholdKmh
      const currBelow = curr.value! <= thresholdKmh

      if (!prevBelow && currBelow) {
        // Entrée dans la fenêtre : interpolation linéaire de l'instant de franchissement.
        windowStartTime = interpolateCrossingTime(prev, curr, thresholdKmh)
        minValue = curr.value!
        minIndex = i
      } else if (prevBelow && currBelow) {
        if (curr.value! < minValue) {
          minValue = curr.value!
          minIndex = i
        }
      } else if (prevBelow && !currBelow) {
        const endTime = interpolateCrossingTime(prev, curr, thresholdKmh)
        closeWindow(endTime)
      }
    }

    // Fenêtre encore ouverte à la fin du segment : même limite documentée qu'au démarrage.
    if (windowStartTime !== null) {
      closeWindow(segment[segment.length - 1].time)
    }
  }

  return windows
}

function splitOnGaps(series: TimeSeriesPoint[]): TimeSeriesPoint[][] {
  const segments: TimeSeriesPoint[][] = []
  let current: TimeSeriesPoint[] = []
  for (const point of series) {
    if (point.value === null) {
      if (current.length) segments.push(current)
      current = []
    } else {
      current.push(point)
    }
  }
  if (current.length) segments.push(current)
  return segments
}

function interpolateCrossingTime(a: TimeSeriesPoint, b: TimeSeriesPoint, threshold: number): Date {
  const span = b.value! - a.value!
  if (Math.abs(span) < 1e-9) return a.time
  const t = (threshold - a.value!) / span
  const clamped = Math.max(0, Math.min(1, t))
  return new Date(a.time.getTime() + clamped * (b.time.getTime() - a.time.getTime()))
}

/** Affine l'instant du minimum par parabole sur 3 points quand ce n'est pas un bord de segment. */
function refineMinimum(segment: TimeSeriesPoint[], index: number): Date {
  if (index <= 0 || index >= segment.length - 1) return segment[index].time

  const prev = segment[index - 1]
  const curr = segment[index]
  const next = segment[index + 1]
  const yPrev = prev.value!
  const yCurr = curr.value!
  const yNext = next.value!

  const a = (yNext + yPrev) / 2 - yCurr
  if (Math.abs(a) < 1e-9) return curr.time

  const b = (yNext - yPrev) / 2
  const xStar = Math.max(-1, Math.min(1, -b / (2 * a)))
  const dtMs = xStar >= 0 ? next.time.getTime() - curr.time.getTime() : curr.time.getTime() - prev.time.getTime()
  return new Date(curr.time.getTime() + xStar * dtMs)
}
