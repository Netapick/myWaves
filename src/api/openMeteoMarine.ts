import { fetchJson, zipSeries } from './client'
import type { OpenMeteoMarineResponse, TimeSeriesPoint } from './types'

const BASE_URL = 'https://marine-api.open-meteo.com/v1/marine'

export interface MarineSeries {
  waveHeight: TimeSeriesPoint[]
  waveDirection: TimeSeriesPoint[]
  wavePeriod: TimeSeriesPoint[]
  swellWaveHeight: TimeSeriesPoint[]
  swellWaveDirection: TimeSeriesPoint[]
  swellWavePeriod: TimeSeriesPoint[]
  windWaveHeight: TimeSeriesPoint[]
  seaSurfaceTemperature: TimeSeriesPoint[]
  /** Résolution horaire — fallback si le 15-minutes n'est pas couvert pour ce point. */
  oceanCurrentVelocity: TimeSeriesPoint[]
  oceanCurrentDirection: TimeSeriesPoint[]
  seaLevelHeightMsl: TimeSeriesPoint[]
  /** Résolution fine (15 min), utilisée en priorité pour les étales et la courbe de marée. */
  fine: {
    seaLevelHeightMsl: TimeSeriesPoint[]
    oceanCurrentVelocity: TimeSeriesPoint[]
    oceanCurrentDirection: TimeSeriesPoint[]
  } | null
}

const HOURLY_VARS = [
  'wave_height',
  'wave_direction',
  'wave_period',
  'swell_wave_height',
  'swell_wave_direction',
  'swell_wave_period',
  'wind_wave_height',
  'sea_surface_temperature',
  'ocean_current_velocity',
  'ocean_current_direction',
  'sea_level_height_msl',
].join(',')

const MINUTELY_15_VARS = ['sea_level_height_msl', 'ocean_current_velocity', 'ocean_current_direction'].join(',')

export function buildMarineUrl(latitude: number, longitude: number, forecastDays = 7): string {
  const params = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    hourly: HOURLY_VARS,
    minutely_15: MINUTELY_15_VARS,
    timezone: 'UTC',
    forecast_days: String(forecastDays),
  })
  return `${BASE_URL}?${params.toString()}`
}

export async function fetchMarineSeries(
  latitude: number,
  longitude: number,
  forecastDays = 7,
  signal?: AbortSignal,
): Promise<MarineSeries> {
  const url = buildMarineUrl(latitude, longitude, forecastDays)
  const data = await fetchJson<OpenMeteoMarineResponse>(url, signal)
  const h = data.hourly

  const fine = data.minutely_15
    ? {
        seaLevelHeightMsl: zipSeries(data.minutely_15.time, data.minutely_15.sea_level_height_msl),
        oceanCurrentVelocity: zipSeries(data.minutely_15.time, data.minutely_15.ocean_current_velocity),
        oceanCurrentDirection: zipSeries(data.minutely_15.time, data.minutely_15.ocean_current_direction),
      }
    : null

  return {
    waveHeight: zipSeries(h.time, h.wave_height),
    waveDirection: zipSeries(h.time, h.wave_direction),
    wavePeriod: zipSeries(h.time, h.wave_period),
    swellWaveHeight: zipSeries(h.time, h.swell_wave_height),
    swellWaveDirection: zipSeries(h.time, h.swell_wave_direction),
    swellWavePeriod: zipSeries(h.time, h.swell_wave_period),
    windWaveHeight: zipSeries(h.time, h.wind_wave_height),
    seaSurfaceTemperature: zipSeries(h.time, h.sea_surface_temperature),
    oceanCurrentVelocity: zipSeries(h.time, h.ocean_current_velocity),
    oceanCurrentDirection: zipSeries(h.time, h.ocean_current_direction),
    seaLevelHeightMsl: zipSeries(h.time, h.sea_level_height_msl),
    fine,
  }
}
