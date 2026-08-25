import type { EtaleEvent } from '../../domain/types'
import { formatDateTimeParis, formatTimeParis } from '../../lib/format'

const PHASE_LABEL: Record<'high' | 'low', string> = {
  high: 'Étale de pleine mer',
  low: 'Étale de basse mer',
}

/** Liste lisible des prochaines étales — une par pleine mer, une par basse mer, jamais
 * aucune manquante (voir domain/slackWindows.ts:extractEtaleEvents). */
export function SlackWindowsList({ events, now = new Date() }: { events: EtaleEvent[]; now?: Date }) {
  const upcoming = events
    .filter((e) => {
      const halfDurationMs = ((e.durationMin ?? 0) / 2) * 60_000
      return e.time.getTime() + halfDurationMs >= now.getTime()
    })
    .slice(0, 6)

  if (upcoming.length === 0) {
    return <p className="text-sm text-(--color-text-muted)">Aucune étale trouvée dans la période affichée.</p>
  }

  return (
    <ul className="flex flex-col gap-2">
      {upcoming.map((e, i) => {
        const halfDurationMs = ((e.durationMin ?? 0) / 2) * 60_000
        const isOngoing = e.durationMin !== null && Math.abs(now.getTime() - e.time.getTime()) <= halfDurationMs

        return (
          <li
            key={i}
            className="rounded-md border px-3 py-2 text-sm"
            style={{
              borderColor: isOngoing ? 'var(--color-good)' : 'var(--color-border)',
              background: isOngoing ? 'color-mix(in srgb, var(--color-good) 12%, transparent)' : 'transparent',
            }}
          >
            {isOngoing ? 'En cours — ' : ''}
            {PHASE_LABEL[e.phase]} à <strong>{formatTimeParis(e.time)}</strong>
            <span className="text-(--color-text-muted)"> ({formatDateTimeParis(e.time)})</span>
            {e.durationMin !== null ? (
              <span className="text-(--color-text-muted)"> — ~{Math.round(e.durationMin)} min</span>
            ) : e.minVelocityKmh !== null ? (
              <span className="text-(--color-text-muted)"> — courant minimal ~{e.minVelocityKmh.toFixed(2)} km/h (pas de vraie pause)</span>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
