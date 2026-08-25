import type { SlackWindow } from '../../domain/types'
import { MAX_PLAUSIBLE_WINDOW_MIN } from '../../domain/slackWindows'
import { formatDateTimeParis, formatTimeParis } from '../../lib/format'

// Une vraie étale (pleine mer ou basse mer) est un instant précis, généralement inférieur
// à 20 minutes — pas une durée qu'il est pertinent de calculer à partir d'un seuil de
// courant arbitraire (voir extractSlackWindows) : le seuil sert seulement à repérer QUAND
// le courant repasse par un minimum, l'affichage se limite donc à cet instant (`center`).

/** Liste lisible des prochaines étales (instants de courant minimal) — la fonctionnalité différenciante pour la plongée. */
export function SlackWindowsList({ windows, now = new Date() }: { windows: SlackWindow[]; now?: Date }) {
  const upcoming = windows.filter((w) => w.end.getTime() >= now.getTime()).slice(0, 6)

  if (upcoming.length === 0) {
    return <p className="text-sm text-(--color-text-muted)">Aucune étale trouvée dans la période affichée.</p>
  }

  return (
    <ul className="flex flex-col gap-2">
      {upcoming.map((w, i) => {
        const durationMin = (w.end.getTime() - w.start.getTime()) / 60_000
        const isOngoing = w.start.getTime() <= now.getTime() && now.getTime() <= w.end.getTime()

        if (durationMin > MAX_PLAUSIBLE_WINDOW_MIN) {
          return (
            <li
              key={i}
              className="rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--color-good)', background: 'color-mix(in srgb, var(--color-good) 12%, transparent)' }}
            >
              Courant toujours sous le seuil sur toute la période affichée — jamais un frein à la plongée ici en ce moment.
            </li>
          )
        }

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
            Étale à <strong>{formatTimeParis(w.center)}</strong>
            <span className="text-(--color-text-muted)"> ({formatDateTimeParis(w.center)})</span>
          </li>
        )
      })}
    </ul>
  )
}
