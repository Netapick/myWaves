import type { DiveScoreResult } from '../../domain/types'

const LABEL_COLORS: Record<DiveScoreResult['label'], string> = {
  excellent: 'var(--color-good)',
  bon: 'var(--color-good)',
  moyen: 'var(--color-warn)',
  médiocre: 'var(--color-warn)',
  déconseillé: 'var(--color-bad)',
}

function barColor(value: number): string {
  if (value >= 60) return 'var(--color-good)'
  if (value >= 35) return 'var(--color-warn)'
  return 'var(--color-bad)'
}

const BREAKDOWN_ITEMS: { key: 'wave' | 'wind' | 'current'; label: string }[] = [
  { key: 'wave', label: 'Houle' },
  { key: 'wind', label: 'Vent' },
  { key: 'current', label: 'Courant' },
]

/**
 * Barres de contribution au score — remplace l'ancien "houle 76 · vent 48 · courant 0"
 * qui prêtait à confusion : ces chiffres sont des SOUS-SCORES 0-100, pas des mesures
 * physiques, alors que le mot "Houle" désigne aussi une mesure physique (m · s) juste
 * en dessous dans NowPanel. La forme "barre + /100" lève l'ambiguïté d'un coup d'œil.
 */
export function ScoreBadge({ result }: { result: DiveScoreResult }) {
  const color = LABEL_COLORS[result.label]
  return (
    <div className="flex w-full items-center gap-4">
      <div
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-semibold"
        style={{ border: `3px solid ${color}`, color }}
      >
        {result.score}
      </div>
      <div className="flex-1">
        <div className="text-lg font-semibold capitalize" style={{ color }}>
          {result.label}
        </div>
        <div className="mt-1 flex flex-col gap-1">
          {BREAKDOWN_ITEMS.map(({ key, label }) => {
            const value = result.breakdown[key]
            return (
              <div key={key} className="flex items-center gap-2 text-xs">
                <span className="w-14 shrink-0 text-(--color-text-muted)">{label}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--color-border)' }}>
                  <div className="h-full rounded-full" style={{ width: `${value}%`, background: barColor(value) }} />
                </div>
                <span className="w-10 shrink-0 text-right text-(--color-text-muted)">{value}/100</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
