import { fetchJson, parseUtcNaive } from './client'
import type { ShomObservationResponse, TimeSeriesPoint } from './types'

const BASE_URL = 'https://services.data.shom.fr/maregraphie/observation/json'

/** Marégraphes SHOM utilisés par l'app (v2). */
export const SHOM_STATIONS = {
  /** Terminal de la Naye, Saint-Malo — à quelques centaines de mètres de l'Anse des Sablons. */
  SAINT_MALO: 410,
  /** Référence nationale du coefficient de marée. */
  BREST: 3,
} as const

/** Limite documentée du service : 31 jours par requête. */
const MAX_RANGE_DAYS = 31

function toDateParam(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Vérifié en pratique (non documenté) : `dtEnd` est une borne de DATE EXCLUSIVE côté
 * SHOM — `dtEnd=2026-08-04` ne renvoie que les données jusqu'à 2026-08-04 00:00:00 UTC,
 * jamais celles du 4 août lui-même. Comme `end` vaut typiquement "maintenant", passer sa
 * propre date tronquerait systématiquement toute la journée en cours (observé : le
 * marégraphe semblait figé à minuit UTC quelle que soit l'heure réelle). On demande donc
 * toujours le lendemain de `end` : la disponibilité réelle des données (jamais dans le
 * futur) redevient la seule limite effective.
 */
function toExclusiveEndDateParam(d: Date): string {
  return toDateParam(new Date(d.getTime() + 86_400_000))
}

/**
 * Observations brutes d'un marégraphe SHOM (1 mesure/minute en pratique).
 * Référentiel : mètres au-dessus du zéro hydrographique. Horodatage : UTC.
 */
export async function fetchShomObservations(
  stationId: number,
  start: Date,
  end: Date,
  signal?: AbortSignal,
): Promise<TimeSeriesPoint[]> {
  const rangeDays = (end.getTime() - start.getTime()) / 86_400_000
  if (rangeDays > MAX_RANGE_DAYS) {
    throw new RangeError(
      `Plage de ${rangeDays.toFixed(1)} jours demandée au SHOM : la limite documentée est de ${MAX_RANGE_DAYS} jours par requête.`,
    )
  }

  const url = `${BASE_URL}/${stationId}?sources=1&dtStart=${toDateParam(start)}&dtEnd=${toExclusiveEndDateParam(end)}`
  const data = await fetchJson<ShomObservationResponse>(url, signal)

  // Observé en pratique : la source "1" peut renvoyer {"data": []} pour certaines
  // fenêtres — l'appelant doit prévoir un repli sur la prévision, jamais afficher un blanc.
  return data.data.map((obs) => ({ time: parseUtcNaive(obs.timestamp), value: obs.value }))
}

/** Les dernières N heures de mesures pour un marégraphe (usage typique : écran temps réel). */
export async function fetchShomRecent(
  stationId: number,
  hours = 30,
  signal?: AbortSignal,
): Promise<TimeSeriesPoint[]> {
  const end = new Date()
  const start = new Date(end.getTime() - hours * 3_600_000)
  return fetchShomObservations(stationId, start, end, signal)
}
