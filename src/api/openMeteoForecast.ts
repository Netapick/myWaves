import { fetchJson, zipSeries } from './client'
import type { OpenMeteoForecastResponse, TimeSeriesPoint } from './types'

const BASE_URL = 'https://api.open-meteo.com/v1/forecast'

export interface WindSeries {
  windSpeed10m: TimeSeriesPoint[]
  windDirection10m: TimeSeriesPoint[]
  windGusts10m: TimeSeriesPoint[]
  fine: {
    windSpeed10m: TimeSeriesPoint[]
    windDirection10m: TimeSeriesPoint[]
    windGusts10m: TimeSeriesPoint[]
  } | null
}

const HOURLY_VARS = ['wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m'].join(',')
const MINUTELY_15_VARS = HOURLY_VARS

export function buildForecastUrl(latitude: number, longitude: number, forecastDays = 7): string {
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

export async function fetchWindSeries(
  latitude: number,
  longitude: number,
  forecastDays = 7,
  signal?: AbortSignal,
): Promise<WindSeries> {
  const url = buildForecastUrl(latitude, longitude, forecastDays)
  const data = await fetchJson<OpenMeteoForecastResponse>(url, signal)
  const h = data.hourly

  const fine = data.minutely_15
    ? {
        windSpeed10m: zipSeries(data.minutely_15.time, data.minutely_15.wind_speed_10m),
        windDirection10m: zipSeries(data.minutely_15.time, data.minutely_15.wind_direction_10m),
        windGusts10m: zipSeries(data.minutely_15.time, data.minutely_15.wind_gusts_10m),
      }
    : null

  return {
    windSpeed10m: zipSeries(h.time, h.wind_speed_10m),
    windDirection10m: zipSeries(h.time, h.wind_direction_10m),
    windGusts10m: zipSeries(h.time, h.wind_gusts_10m),
    fine,
  }
}
