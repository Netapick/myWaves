import { formatInTimeZone } from 'date-fns-tz'
import { fr } from 'date-fns/locale'

const PARIS_TZ = 'Europe/Paris'

export function formatTimeParis(date: Date): string {
  return formatInTimeZone(date, PARIS_TZ, 'HH:mm')
}

export function formatDateTimeParis(date: Date): string {
  return formatInTimeZone(date, PARIS_TZ, "d MMM 'à' HH:mm", { locale: fr })
}

export function formatDayParis(date: Date): string {
  return formatInTimeZone(date, PARIS_TZ, 'EEE d MMM', { locale: fr })
}

export function formatRelativeAge(fromMs: number, nowMs: number = Date.now()): string {
  const diffMin = Math.round((nowMs - fromMs) / 60_000)
  if (diffMin < 1) return "à l'instant"
  if (diffMin < 60) return `il y a ${diffMin} min`
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24) return `il y a ${diffH} h`
  const diffD = Math.round(diffH / 24)
  return `il y a ${diffD} j`
}

export function formatHeight(m: number | null, digits = 2): string {
  if (m === null) return '—'
  return `${m.toFixed(digits)} m`
}

export function formatSpeedKmh(kmh: number | null): string {
  if (kmh === null) return '—'
  return `${kmh.toFixed(1)} km/h`
}

export function formatTemperature(celsius: number | null): string {
  if (celsius === null) return '—'
  return `${celsius.toFixed(1)} °C`
}

export function formatDirection(degrees: number | null): string {
  if (degrees === null) return '—'
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO']
  const index = Math.round(degrees / 22.5) % 16
  return `${dirs[index]} (${Math.round(degrees)}°)`
}
