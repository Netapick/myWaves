import type { SlackWindow } from '../../domain/types'
import { formatDateTimeParis, formatTimeParis } from '../../lib/format'

/** Liste lisible des prochaines fenêtres d'étale — la fonctionnalité différenciante pour la plongée. */
export function SlackWindowsList({ windows, now = new Date() }: { windows: SlackWindow[]; now?: Date }) {
  const upcoming = windows.filter((w) => w.end.getTime() >= now.getTime()).slice(0, 6)

  if (upcoming.length === 0) {
    return <p className="text-sm text-(--color-text-muted)">Aucune fenêtre d’étale trouvée dans la période affichée.</p>
  }

  return (
    <ul className="flex flex-col gap-2">
      {upcoming.map((w, i) => {
        const durationMin = Math.round((w.end.getTime() - w.start.getTime()) / 60_000)
        const isOngoing = w.start.getTime() <= now.getTime() && now.getTime() <= w.end.getTime()
        return (
          <li
            key={i}
            className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            style={{
              borderColor: isOngoing ? 'var(--color-good)' : 'var(--color-border)',
              background: isOngoing ? 'color-mix(in srgb, var(--color-good) 12%, transparent)' : 'transparent',
            }}
          >
            <span>
              {isOngoing ? 'En cours — ' : ''}
              Étale à <strong>{formatTimeParis(w.center)}</strong>
              <span className="text-(--color-text-muted)"> ({formatDateTimeParis(w.center)})</span>
            </span>
            <span className="text-(--color-text-muted)">~{durationMin} min</span>
          </li>
        )
      })}
    </ul>
  )
}
