/**
 * Types miroir des réponses JSON des API externes. On ne type que les champs
 * qu'on demande réellement (voir les query strings dans chaque datasource).
 */

/** Réponse d'un endpoint Open-Meteo générique avec un bloc hourly + minutely_15. */
export interface OpenMeteoSeriesResponse<
  THourly extends Record<string, unknown[]>,
  TMinutely extends Record<string, unknown[]> = Record<string, never>,
> {
  latitude: number
  longitude: number
  timezone: string
  utc_offset_seconds: number
  hourly: { time: string[] } & THourly
  hourly_units: Record<string, string>
  minutely_15?: { time: string[] } & TMinutely
  minutely_15_units?: Record<string, string>
}

export type OpenMeteoMarineResponse = OpenMeteoSeriesResponse<
  {
    wave_height: (number | null)[]
    wave_direction: (number | null)[]
    wave_period: (number | null)[]
    swell_wave_height: (number | null)[]
    swell_wave_direction: (number | null)[]
    swell_wave_period: (number | null)[]
    wind_wave_height: (number | null)[]
    sea_surface_temperature: (number | null)[]
    ocean_current_velocity: (number | null)[]
    ocean_current_direction: (number | null)[]
    sea_level_height_msl: (number | null)[]
  },
  {
    sea_level_height_msl: (number | null)[]
    ocean_current_velocity: (number | null)[]
    ocean_current_direction: (number | null)[]
  }
>

export type OpenMeteoForecastResponse = OpenMeteoSeriesResponse<
  {
    wind_speed_10m: (number | null)[]
    wind_direction_10m: (number | null)[]
    wind_gusts_10m: (number | null)[]
  },
  {
    wind_speed_10m: (number | null)[]
    wind_direction_10m: (number | null)[]
    wind_gusts_10m: (number | null)[]
  }
>

/** Une mesure ponctuelle du marégraphe SHOM. */
export interface ShomObservation {
  idstation: number
  idsource: number
  value: number
  /** Format "AAAA/MM/JJ HH:mm:ss", en UTC. */
  timestamp: string
}

export interface ShomObservationResponse {
  data: ShomObservation[]
}

/** Un point de série temporelle normalisé, utilisé partout dans domain/. */
export interface TimeSeriesPoint {
  /** Instant UTC. */
  time: Date
  value: number | null
}
