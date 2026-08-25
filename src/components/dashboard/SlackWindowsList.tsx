import type { SlackWindow } from '../../domain/types'
import { formatDateTimeParis, formatTimeParis } from '../../lib/format'

// Une vraie étale (pleine mer ou basse mer) est un instant précis, généralement inférieur
// à 20 minutes — pas une durée qu'il est pertinent de calculer à partir d'un seuil de
// courant arbitraire (voir extractSlackWindows) : le seuil sert seulement à repérer QUAND
// le courant repasse par un minimum, l'affichage se limite donc à cet instant (`center`).
//
// Un cycle de marée semi-diurne dure ~12h25 : une fenêtre sous le seuil plus longue qu'un
// cycle complet ne correspond à aucune étale ponctuelle, mais à un courant qui reste
// simplement faible sur toute la période affichée (cas réel sur certains spots avec le
// courant harmonique MARC, voir domain/marcCurrent.ts) — on l'indique alors comme tel.
const MAX_PLAUSIBLE_WINDOW_MIN = 20 * 60

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
