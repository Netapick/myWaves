import type { DiveScoreResult } from '../../domain/types'
import { formatDirection, formatHeight, formatSpeedKmh, formatTemperature } from '../../lib/format'
import { ScoreBadge } from '../common/ScoreBadge'

export interface NowPanelData {
  waveHeightM: number | null
  wavePeriodS: number | null
  seaSurfaceTempC: number | null
  windSpeedKmh: number | null
  windDirectionDeg: number | null
  currentVelocityKmh: number | null
  tideTrend: 'rising' | 'falling' | 'stable' | null
  /** Estimation (pas la valeur officielle SHOM) — voir domain/tideCoefficient.ts. */
  tideCoefficient: number | null
}

const TREND_LABEL: Record<'rising' | 'falling' | 'stable', string> = {
  rising: '↗ montante',
  falling: '↘ descendante',
  stable: '→ étale',
}

/** ≥70 = vive-eau, sinon morte-eau — seuil officiel SHOM (référence Brest). */
function coefficientLabel(coefficient: number | null): string {
  if (coefficient === null) return '—'
  const qualifier = coefficient >= 70 ? 'vive-eau' : 'morte-eau'
  return `${coefficient} (${qualifier})`
}

export function NowPanel({ data, score }: { data: NowPanelData; score: DiveScoreResult }) {
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <ScoreBadge result={score} />
      </div>
      {/* 6 cases : se divise sans reste en 2 colonnes (mobile) comme en 3 (large écran) —
          jamais de case orpheline en fin de grille. */}
      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <Metric label="Eau (surface)" value={formatTemperature(data.seaSurfaceTempC)} />
        <Metric label="Houle" value={`${formatHeight(data.waveHeightM)} · ${data.wavePeriodS?.toFixed(0) ?? '—'} s`} />
        <Metric label="Vent" value={`${formatSpeedKmh(data.windSpeedKmh)} · ${formatDirection(data.windDirectionDeg)}`} />
        <Metric label="Courant" value={formatSpeedKmh(data.currentVelocityKmh)} />
        <Metric label="Marée" value={data.tideTrend ? TREND_LABEL[data.tideTrend] : '—'} />
        <Metric label="Coefficient" value={coefficientLabel(data.tideCoefficient)} />
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-(--color-text-muted)">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  )
}
