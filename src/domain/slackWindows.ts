import type { EtaleEvent, SlackWindow, TideEvent } from './types'
import type { TimeSeriesPoint } from '../api/types'

/**
 * Vitesse de courant en dessous de laquelle on considère qu'il est possible/confortable
 * de plonger : ~0,3 nœud, converti en km/h (1 nd = 1,852 km/h). Sert uniquement à repérer
 * QUAND le courant repasse par un minimum (voir `center` ci-dessous) — une vraie étale est
 * un instant précis, pas une durée, donc ce seuil n'est plus exposé en réglage utilisateur.
 */
export const DEFAULT_SLACK_THRESHOLD_KMH = 0.3 * 1.852

/**
 * Marge (km/h) au-dessus du minimum local de courant utilisée pour délimiter la DURÉE
 * affichée d'une étale : le courant y reste proche de son minimum, pas nécessairement sous
 * le seuil absolu de confort de plongée (`thresholdKmh` ci-dessous, qui décide seulement SI
 * cette étale compte comme confortable pour plonger). Sur un site à courant globalement
 * faible (Saint-Cast : jamais > 0,66 km/h), le courant reste sous ce seuil absolu pendant
 * des heures — une durée calée sur le minimum LOCAL reste courte et représentative, quel
 * que soit le niveau général de courant du site.
 */
const DURATION_MARGIN_KMH = 0.05

/**
 * Durée max (min) plausible pour une pause de courant — au-delà, il ne s'agit plus d'un
 * vrai creux mais d'un courant qui ondule faiblement sur une longue plage (composantes
 * secondaires de marée) : mieux vaut ne pas afficher de chiffre plutôt qu'une durée qui
 * suggère une précision illusoire.
 */
const MAX_CONFIRMED_DURATION_MIN = 90

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

/** Rayon de recherche (min) autour de chaque étale de marée pour y chercher le minimum
 * local de courant : assez large pour attraper le vrai creux même s'il est décalé de
 * quelques dizaines de minutes par rapport à l'extremum de hauteur (constaté : quelques
 * minutes à Saint-Cast), mais assez court pour ne jamais dériver vers un creux SANS RAPPORT
 * plus loin dans le même demi-cycle (~6h12/2) — sans cette borne, `minVelocityKmh` peut
 * pointer vers un minimum réel mais étranger à cette étale précise. Borné en plus par la
 * moitié de l'écart aux étales voisines, pour ne jamais empiéter sur celle d'à côté. */
const NEIGHBORHOOD_MIN = 90

/**
 * Cherche, pour chaque étale de marée (extremum de hauteur — pleine mer ou basse mer, la
 * vraie définition nautique, déjà validée à ±6 min des tables officielles), le courant
 * minimal dans son voisinage immédiat, puis une éventuelle courte fenêtre sous le seuil.
 *
 * L'instant affiché (`time`) est TOUJOURS celui de l'extremum de marée, jamais celui du
 * minimum de courant : ce dernier peut être bruité par des composantes secondaires du
 * courant sans rapport avec l'étale elle-même, alors que l'extremum de hauteur, lui, est
 * la définition nautique de référence. `minVelocityKmh`/`durationMin` restent des données
 * auxiliaires (à quel point et combien de temps le courant est faible autour de cet instant).
 *
 * Une étale de marée existe TOUJOURS (une par pleine mer, une par basse mer, tous les
 * ~6h12) même quand le courant local ne descend jamais sous le seuil à ce moment précis —
 * `minVelocityKmh` reste alors renseigné (le minimum réel atteint, même au-dessus du
 * seuil) mais `durationMin` reste null plutôt que d'afficher une durée trompeuse.
 */
export function extractEtaleEvents(
  tideEvents: TideEvent[],
  currentSeries: TimeSeriesPoint[],
  thresholdKmh: number = DEFAULT_SLACK_THRESHOLD_KMH,
): EtaleEvent[] {
  const points = currentSeries.filter((p) => p.value !== null)

  return tideEvents.map((e, i) => {
    const prevBound =
      i > 0 ? (tideEvents[i - 1].time.getTime() + e.time.getTime()) / 2 : e.time.getTime() - NEIGHBORHOOD_MIN * 60_000
    const nextBound =
      i < tideEvents.length - 1
        ? (e.time.getTime() + tideEvents[i + 1].time.getTime()) / 2
        : e.time.getTime() + NEIGHBORHOOD_MIN * 60_000
    const lo = Math.max(prevBound, e.time.getTime() - NEIGHBORHOOD_MIN * 60_000)
    const hi = Math.min(nextBound, e.time.getTime() + NEIGHBORHOOD_MIN * 60_000)

    const neighborhood = points.filter((p) => p.time.getTime() >= lo && p.time.getTime() <= hi)
    if (neighborhood.length === 0) {
      return { time: e.time, phase: e.phase, durationMin: null, minVelocityKmh: null }
    }

    let minIndex = 0
    for (let k = 1; k < neighborhood.length; k++) {
      if (neighborhood[k].value! < neighborhood[minIndex].value!) minIndex = k
    }

    // Un minimum au bord même du voisinage n'est pas un vrai creux local : le courant
    // était peut-être encore en train de baisser (le vrai creux est hors voisinage) — cas
    // réel à Saint-Cast près de la pleine mer, où le courant est en fait à son MAXIMUM
    // local (aucun creux à trouver ici, seulement le bord le plus faible de la montée).
    if (minIndex === 0 || minIndex === neighborhood.length - 1) {
      return { time: e.time, phase: e.phase, durationMin: null, minVelocityKmh: null }
    }
    const minVelocityKmh = neighborhood[minIndex].value!

    let durationMin: number | null = null
    if (minVelocityKmh <= thresholdKmh) {
      const durationThreshold = minVelocityKmh + DURATION_MARGIN_KMH
      let startTime = neighborhood[0].time
      for (let k = minIndex; k > 0; k--) {
        if (neighborhood[k - 1].value! > durationThreshold) {
          startTime = interpolateCrossingTime(neighborhood[k - 1], neighborhood[k], durationThreshold)
          break
        }
      }
      let endTime = neighborhood[neighborhood.length - 1].time
      for (let k = minIndex; k < neighborhood.length - 1; k++) {
        if (neighborhood[k + 1].value! > durationThreshold) {
          endTime = interpolateCrossingTime(neighborhood[k], neighborhood[k + 1], durationThreshold)
          break
        }
      }
      const rawDurationMin = (endTime.getTime() - startTime.getTime()) / 60_000
      durationMin = rawDurationMin <= MAX_CONFIRMED_DURATION_MIN ? rawDurationMin : null
    }

    return { time: e.time, phase: e.phase, durationMin, minVelocityKmh }
  })
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
