import type { TimeSeriesPoint } from './types'

/** Erreur réseau normalisée, pour un traitement homogène côté UI (bandeau hors-ligne, retry…). */
export class ApiError extends Error {
  readonly url: string
  readonly status?: number

  constructor(message: string, url: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.url = url
    this.status = status
  }
}

export async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, { signal })
  } catch {
    throw new ApiError(`Réseau indisponible pour ${url}`, url)
  }
  if (!response.ok) {
    throw new ApiError(`Réponse HTTP ${response.status} pour ${url}`, url, response.status)
  }
  return (await response.json()) as T
}

/**
 * Les timestamps Open-Meteo et SHOM sont demandés/renvoyés sans offset explicite.
 * On les traite systématiquement comme des instants UTC en ajoutant "Z" —
 * jamais comme des heures locales du runtime (qui peut tourner dans un autre fuseau).
 */
export function parseUtcNaive(isoNaive: string): Date {
  // Open-Meteo : "2026-08-04T00:00"  |  SHOM : "2026/08/04 00:00:00"
  const normalized = isoNaive.includes('/')
    ? isoNaive.replace(/^(\d{4})\/(\d{2})\/(\d{2}) /, '$1-$2-$3T')
    : isoNaive
  return new Date(`${normalized}Z`)
}

export function zipSeries(times: string[], values: (number | null)[]): TimeSeriesPoint[] {
  return times.map((t, i) => ({ time: parseUtcNaive(t), value: values[i] ?? null }))
}
