import { fromZonedTime } from 'date-fns-tz'
import type { TimeSeriesPoint } from '../api/types'
import type { ParsedTideExtreme } from './parseMareeInfoTable'

const PARIS_TZ = 'Europe/Paris'

export interface TideExtremum {
  time: Date
  height: number
  coefficient?: number
}

/**
 * Extrema de marée OFFICIELS pour Saint-Malo (© SHOM via maree.info).
 *
 * ⚠️ CE FICHIER FAIT DE L'EXTRACTION AUTOMATISÉE DE maree.info (voir
 * api/mareeInfoTable.ts) — CONTOURNEMENT DÉLIBÉRÉ ET ASSUMÉ de leurs CGU, qui
 * l'interdisent explicitement ("Le site web n'est pas une API pour en extraire les
 * données de manière automatique"). Décision explicite de l'utilisateur (04/08/2026,
 * après avoir été informé que la restriction porte sur la méthode d'accès et pas sur
 * l'audience — contrairement à Windy, où "usage privé" changeait la donne) : usage
 * strictement PERSONNEL, cette app n'est ET NE SERA PAS publiée sur un store tant que
 * ce fetch existe. Voir « À propos » dans l'app pour la même mise en garde côté UI.
 *
 * SAINT_MALO_OFFICIAL_EXTREMES_SNAPSHOT ci-dessous n'est qu'un FILET DE SÉCURITÉ —
 * utilisé uniquement si le fetch live échoue ET qu'aucun cache n'existe encore (tout
 * premier lancement hors-ligne). Il devient rapidement obsolète ; ne pas compter
 * dessus comme source principale. Pour le régénérer : `npm run refresh-tides`.
 */
const SAINT_MALO_OFFICIAL_EXTREMES_SNAPSHOT: { localTime: string; height: number; coefficient?: number }[] = [
  { localTime: '2026-08-04T06:00:00', height: 2.36 }, // BM
  { localTime: '2026-08-04T11:25:00', height: 11.06, coefficient: 74 }, // PM
  { localTime: '2026-08-04T18:11:00', height: 2.8 }, // BM
  { localTime: '2026-08-04T23:40:00', height: 11.01, coefficient: 70 }, // PM
  { localTime: '2026-08-05T06:33:00', height: 2.82 }, // BM
  { localTime: '2026-08-05T12:00:00', height: 10.62, coefficient: 66 }, // PM
  { localTime: '2026-08-05T18:47:00', height: 3.29 }, // BM
  { localTime: '2026-08-06T00:19:00', height: 10.44, coefficient: 61 }, // PM
  { localTime: '2026-08-06T07:12:00', height: 3.37 }, // BM
  { localTime: '2026-08-06T12:42:00', height: 10.1, coefficient: 57 }, // PM
  { localTime: '2026-08-06T19:33:00', height: 3.83 }, // BM
  { localTime: '2026-08-07T01:09:00', height: 9.81, coefficient: 52 }, // PM
  { localTime: '2026-08-07T08:03:00', height: 3.95 }, // BM
  { localTime: '2026-08-07T13:41:00', height: 9.57, coefficient: 48 }, // PM
  { localTime: '2026-08-07T20:39:00', height: 4.29 }, // BM
  { localTime: '2026-08-08T02:25:00', height: 9.27, coefficient: 46 }, // PM
  { localTime: '2026-08-08T09:19:00', height: 4.36 }, // BM
  { localTime: '2026-08-08T15:10:00', height: 9.29, coefficient: 46 }, // PM
  { localTime: '2026-08-08T22:14:00', height: 4.33 }, // BM
  { localTime: '2026-08-09T04:06:00', height: 9.21, coefficient: 48 }, // PM
  { localTime: '2026-08-09T10:56:00', height: 4.24 }, // BM
  { localTime: '2026-08-09T16:49:00', height: 9.61, coefficient: 53 }, // PM
  { localTime: '2026-08-09T23:45:00', height: 3.77 }, // BM
  { localTime: '2026-08-10T05:38:00', height: 9.78, coefficient: 59 }, // PM
  { localTime: '2026-08-10T12:20:00', height: 3.59 }, // BM
  { localTime: '2026-08-10T18:08:00', height: 10.42, coefficient: 66 }, // PM
]

/** Convertit des extrema parsés (heure légale française, naïve) en instants UTC exploitables. */
export function buildExtrema(raw: { localTime: string; height: number; coefficient?: number }[]): TideExtremum[] {
  return raw
    .map((e) => ({
      time: fromZonedTime(e.localTime, PARIS_TZ),
      height: e.height,
      coefficient: e.coefficient,
    }))
    .sort((a, b) => a.time.getTime() - b.time.getTime())
}

/** Filet de sécurité si le fetch live (voir hooks/useOfficialTideExtremes.ts) échoue sans cache disponible. */
export const SNAPSHOT_EXTREMA: TideExtremum[] = buildExtrema(SAINT_MALO_OFFICIAL_EXTREMES_SNAPSHOT)

/** Convertit directement la sortie de parseMareeInfoTable (déjà triée) en TideExtremum[]. */
export function fromParsedExtremes(parsed: ParsedTideExtreme[]): TideExtremum[] {
  return buildExtrema(parsed)
}

/** Les deux extrema qui encadrent `at` — bornés aux extrémités du tableau si `at` déborde. */
function findBracket(extrema: TideExtremum[], at: Date): [TideExtremum, TideExtremum] {
  const atMs = at.getTime()
  for (let i = 0; i < extrema.length - 1; i++) {
    if (atMs >= extrema[i].time.getTime() && atMs <= extrema[i + 1].time.getTime()) {
      return [extrema[i], extrema[i + 1]]
    }
  }
  return atMs < extrema[0].time.getTime()
    ? [extrema[0], extrema[1]]
    : [extrema[extrema.length - 2], extrema[extrema.length - 1]]
}

/**
 * Interpolation en demi-cosinus entre deux extrema — h(t) = milieu ± demi-amplitude ×
 * cos(π × fraction) — bien plus fidèle à la forme réelle d'une marée qu'une droite,
 * sans nécessiter les constantes harmoniques complètes du port.
 */
function interpolate(a: TideExtremum, b: TideExtremum, at: Date): number {
  const totalMs = b.time.getTime() - a.time.getTime()
  const fraction = totalMs === 0 ? 0 : Math.max(0, Math.min(1, (at.getTime() - a.time.getTime()) / totalMs))
  const mid = (a.height + b.height) / 2
  const halfAmplitude = (a.height - b.height) / 2
  return mid + halfAmplitude * Math.cos(Math.PI * fraction)
}

/**
 * Hauteur d'eau officielle interpolée à `at` à partir de `extrema`, dans le même
 * référentiel (zéro hydrographique) que le marégraphe SHOM — aucun recalage
 * nécessaire. `null` si `at` tombe hors de la plage couverte par `extrema`.
 */
export function officialHeightAt(extrema: TideExtremum[], at: Date): number | null {
  if (extrema.length < 2) return null
  const first = extrema[0]
  const last = extrema[extrema.length - 1]
  if (at.getTime() < first.time.getTime() || at.getTime() > last.time.getTime()) return null
  const [a, b] = findBracket(extrema, at)
  return interpolate(a, b, at)
}

/**
 * Fenêtre sur laquelle on estompe le raccord (voir `withOfficialTideWhereAvailable`) —
 * assez courte pour ne jamais fausser durablement les jours suivants (déjà signalés
 * moins fiables, voir domain/sillLevel.ts), assez longue pour absorber le pire écart
 * mesuré en pratique à ce raccord (~1,5 m sur 15 min un soir de pleine mer vive-eau).
 */
const BOUNDARY_BLEND_MS = 3 * 60 * 60_000

/** Point de `series` le plus proche de `at` (valeur non nulle), ou `null` si `series` est vide. */
function nearestValue(series: TimeSeriesPoint[], at: Date): number | null {
  let nearest: TimeSeriesPoint | null = null
  let nearestDiff = Infinity
  for (const p of series) {
    if (p.value === null) continue
    const diff = Math.abs(p.time.getTime() - at.getTime())
    if (diff < nearestDiff) {
      nearest = p
      nearestDiff = diff
    }
  }
  return nearest?.value ?? null
}

/**
 * Remplace, dans `series`, chaque point dont l'instant est couvert par `extrema` par
 * la valeur officielle interpolée. Juste hors couverture, la donnée de repli (Open-Meteo
 * calibré) n'est PAS reprise brute : elle est décalée pour raccorder sans à-coup à la
 * dernière valeur officielle connue, puis ce décalage s'estompe linéairement sur
 * `BOUNDARY_BLEND_MS`.
 *
 * Sans ça, la jonction peut être franchement discontinue : Open-Meteo est en avance de
 * timing sur la marée réelle (~20-40 min, voir calibrateForecastToGauge) — pile à la
 * frontière de couverture (la fin de la semaine renvoyée par maree.info, ou un jour déjà
 * purgé du cache, voir api/mareeInfoTable.ts et hooks/useOfficialTideExtremes.ts), sa
 * propre courbe peut déjà être repartie à la baisse alors que la hauteur officielle est
 * encore proche du pic. Mesuré en pratique (avant l'extension de la couverture à toute
 * la semaine, quand la frontière tombait chaque soir) : un saut de 1,46 m en 15 min au
 * raccord, visible comme une "coupure" nette sur la courbe.
 */
export function withOfficialTideWhereAvailable(extrema: TideExtremum[], series: TimeSeriesPoint[]): TimeSeriesPoint[] {
  if (extrema.length < 2) return series

  const first = extrema[0]
  const last = extrema[extrema.length - 1]
  const afterOffset = (() => {
    const raw = nearestValue(series, last.time)
    return raw === null ? null : last.height - raw
  })()
  const beforeOffset = (() => {
    const raw = nearestValue(series, first.time)
    return raw === null ? null : first.height - raw
  })()

  return series.map((p) => {
    const official = officialHeightAt(extrema, p.time)
    if (official !== null) return { time: p.time, value: official }
    if (p.value === null) return p

    if (p.time.getTime() > last.time.getTime() && afterOffset !== null) {
      const fraction = Math.max(0, 1 - (p.time.getTime() - last.time.getTime()) / BOUNDARY_BLEND_MS)
      return { time: p.time, value: p.value + afterOffset * fraction }
    }
    if (p.time.getTime() < first.time.getTime() && beforeOffset !== null) {
      const fraction = Math.max(0, 1 - (first.time.getTime() - p.time.getTime()) / BOUNDARY_BLEND_MS)
      return { time: p.time, value: p.value + beforeOffset * fraction }
    }
    return p
  })
}

/**
 * Coefficient de marée OFFICIEL le plus proche de `at`, parmi les extrema qui en
 * portent un (en pratique : les pleines mers, dans les tableaux maree.info). `null`
 * si aucun extremum avec coefficient n'est connu — l'appelant retombe alors sur
 * l'estimation dérivée de Brest (voir domain/tideCoefficient.ts).
 */
export function officialCoefficientNear(extrema: TideExtremum[], at: Date): number | null {
  const withCoeff = extrema.filter((e) => e.coefficient !== undefined)
  if (withCoeff.length === 0) return null
  const atMs = at.getTime()
  let best = withCoeff[0]
  let bestDiff = Math.abs(best.time.getTime() - atMs)
  for (const e of withCoeff) {
    const diff = Math.abs(e.time.getTime() - atMs)
    if (diff < bestDiff) {
      best = e
      bestDiff = diff
    }
  }
  return best.coefficient!
}
