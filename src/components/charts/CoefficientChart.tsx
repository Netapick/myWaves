import ReactECharts from 'echarts-for-react'
import { formatDateTimeParis, formatDayParis, formatTimeParis } from '../../lib/format'
import { CHART_CALLOUT_BG, CHART_CALLOUT_TEXT } from '../../lib/chartTheme'

export interface CoefficientPoint {
  time: Date
  coefficient: number
  /** true si la valeur vient du coefficient officiel (maree.info/SHOM), pas de l'estimation Brest. */
  official: boolean
}

interface CoefficientChartProps {
  points: CoefficientPoint[]
  /** Coefficient affiché "maintenant" (même valeur que la carte de statut au-dessus —
   * passé en prop plutôt que recalculé ici, pour ne jamais afficher deux chiffres
   * différents pour le même instant). Omis si `null`. */
  nowCoefficient?: number | null
  height?: number
}

/** Tick d'axe sur plusieurs jours : l'heure, ou le jour à minuit (repère de journée). */
function formatAxisTick(date: Date): string {
  const time = formatTimeParis(date)
  return time === '00:00' ? formatDayParis(date) : time
}

/**
 * Courbe du coefficient de marée (20-120) sur toute la période disponible — un point
 * par demi-marée (voir domain/tideCoefficient.ts). Les points issus du coefficient
 * OFFICIEL (maree.info, quand disponible) sont marqués distinctement des points
 * estimés depuis la hauteur d'eau à Brest, moins précis.
 */
export function CoefficientChart({ points, nowCoefficient, height = 220 }: CoefficientChartProps) {
  const data = points.map((p) => [p.time.getTime(), p.coefficient])
  const officialMarks = points
    .filter((p) => p.official)
    .map((p) => ({
      coord: [p.time.getTime(), p.coefficient],
      symbol: 'circle',
      symbolSize: 7,
      itemStyle: { color: '#2a9d8f', borderColor: '#fff', borderWidth: 1 },
    }))

  const now = Date.now()
  const markPoints: Record<string, unknown>[] = [...officialMarks]
  if (nowCoefficient !== undefined && nowCoefficient !== null) {
    markPoints.push({
      coord: [now, nowCoefficient],
      value: '',
      symbol: 'circle',
      symbolSize: 8,
      itemStyle: { color: '#d84343', borderColor: '#fff', borderWidth: 1.5 },
      label: {
        formatter: () => `Maintenant — ${nowCoefficient} (${nowCoefficient >= 70 ? 'vive-eau' : 'morte-eau'})`,
        position: 'top',
        distance: 10,
        fontSize: 10,
        fontWeight: 600,
        color: CHART_CALLOUT_TEXT,
        backgroundColor: CHART_CALLOUT_BG,
        padding: [4, 6],
        borderRadius: 4,
        lineHeight: 14,
      },
    })
  }

  const option = {
    animation: false,
    grid: { left: 40, right: 16, top: 24, bottom: 32 },
    tooltip: {
      trigger: 'axis',
      confine: true,
      formatter: (params: { axisValue: number; value: [number, number] }[]) => {
        const t = formatDateTimeParis(new Date(params[0].axisValue))
        return `${t}<br/>Coefficient ${params[0].value[1]}`
      },
    },
    xAxis: {
      type: 'time',
      axisLabel: { formatter: (v: number) => formatAxisTick(new Date(v)) },
    },
    yAxis: { type: 'value', name: 'Coefficient', min: 20, max: 120 },
    series: [
      {
        name: 'Coefficient',
        type: 'line',
        step: 'middle',
        showSymbol: true,
        symbolSize: 4,
        data,
        lineStyle: { color: '#7209b7', width: 2 },
        markPoint: { data: markPoints, symbolSize: 7 },
        markLine: {
          symbol: 'none',
          silent: true,
          label: { formatter: 'vive-eau (70)', fontSize: 9, position: 'insideEndTop' },
          data: [
            { yAxis: 70, lineStyle: { color: '#e9a02c', type: 'dashed', width: 1 } },
            { xAxis: now, label: { show: false }, lineStyle: { color: '#d84343', type: 'solid', width: 1.5 } },
          ],
        },
      },
    ],
  }

  return <ReactECharts option={option} style={{ height }} notMerge />
}
