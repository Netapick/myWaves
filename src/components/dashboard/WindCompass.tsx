import { formatDirection, formatSpeedKmh } from '../../lib/format'

interface WindCompassProps {
  windSpeedKmh: number | null
  windDirectionDeg: number | null
  waveDirectionDeg: number | null
  /** Orientation de la côte face au spot — permet de juger si le vent/la houle sont "de terre" ou "du large". */
  facingDegrees?: number
}

/** Rose simplifiée : direction du vent (flèche pleine) et de la houle (flèche fine), repère de l'orientation du spot. */
export function WindCompass({ windSpeedKmh, windDirectionDeg, waveDirectionDeg, facingDegrees }: WindCompassProps) {
  const size = 140
  const center = size / 2
  const radius = size / 2 - 12

  // Convention météo : la direction donnée est celle D'OÙ vient le vent/la houle.
  // On dessine donc la flèche pointant VERS le centre depuis cette direction.
  const arrow = (deg: number | null, length: number, color: string, key: string) => {
    if (deg === null) return null
    const rad = ((deg - 90) * Math.PI) / 180
    const x1 = center + radius * Math.cos(rad)
    const y1 = center + radius * Math.sin(rad)
    const x2 = center + (radius - length) * Math.cos(rad)
    const y2 = center + (radius - length) * Math.sin(rad)
    return (
      <line
        key={key}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={key === 'wind' ? 3 : 2}
        strokeDasharray={key === 'wave' ? '4 3' : undefined}
        markerEnd={`url(#arrow-${key})`}
      />
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <marker id="arrow-wind" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#0077b6" />
          </marker>
          <marker id="arrow-wave" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#48cae4" />
          </marker>
        </defs>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--color-border)" />
        <text x={center} y={14} textAnchor="middle" fontSize="10" fill="var(--color-text-muted)">
          N
        </text>
        {facingDegrees !== undefined && (
          <path
            d={sectorPath(center, radius, facingDegrees, 60)}
            fill="color-mix(in srgb, var(--color-good) 15%, transparent)"
          />
        )}
        {arrow(windDirectionDeg, 34, '#0077b6', 'wind')}
        {arrow(waveDirectionDeg, 24, '#48cae4', 'wave')}
      </svg>
      <div className="text-center text-xs text-(--color-text-muted)">
        <div>
          <span style={{ color: '#0077b6' }}>●</span> vent {formatSpeedKmh(windSpeedKmh)} {formatDirection(windDirectionDeg)}
        </div>
        {waveDirectionDeg !== null && (
          <div>
            <span style={{ color: '#48cae4' }}>●</span> houle {formatDirection(waveDirectionDeg)}
          </div>
        )}
        {facingDegrees !== undefined && <div>zone abritée (orientation du spot) en vert</div>}
      </div>
    </div>
  )
}

function sectorPath(center: number, radius: number, centerDeg: number, spanDeg: number): string {
  const startRad = ((centerDeg - spanDeg / 2 - 90) * Math.PI) / 180
  const endRad = ((centerDeg + spanDeg / 2 - 90) * Math.PI) / 180
  const x1 = center + radius * Math.cos(startRad)
  const y1 = center + radius * Math.sin(startRad)
  const x2 = center + radius * Math.cos(endRad)
  const y2 = center + radius * Math.sin(endRad)
  return `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`
}
