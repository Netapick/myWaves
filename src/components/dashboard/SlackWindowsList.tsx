import type { SlackWindow } from '../../domain/types'
import { formatDateTimeParis, formatTimeParis } from '../../lib/format'

// Un cycle de marée semi-diurne dure ~12h25 : une fenêtre plus longue qu'un cycle complet
// n'est pas une vraie étale (pause entre flot et jusant) mais un signe que le courant
// reste tout le temps sous le seuil sur la période affichée — cas réel sur certains spots
// avec le courant harmonique MARC (voir domain/marcCurrent.ts), bien plus propre que le
// modèle Open-Meteo qui « fait du bruit » au-dessus du seuil par endroits.
const MAX_PLAUSIBLE_WINDOW_MIN = 20 * 60

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
