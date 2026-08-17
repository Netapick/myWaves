import ReactECharts from 'echarts-for-react'
import type { TimeSeriesPoint } from '../../api/types'
import { formatDateTimeParis, formatDayParis, formatTimeParis } from '../../lib/format'
import { valueNear } from '../../lib/timeseries'
import { CHART_CALLOUT_BG, CHART_CALLOUT_TEXT } from '../../lib/chartTheme'

interface SeaTempChartProps {
  series: TimeSeriesPoint[]
  height?: number
}

/** Tick d'axe sur plusieurs jours : l'heure, ou le jour à minuit (repère de journée). */
function formatAxisTick(date: Date): string {
  const time = formatTimeParis(date)
  return time === '00:00' ? formatDayParis(date) : time
}

/**
 * Courbe de température de l'eau en surface sur toute la période récupérée (7 jours) —
 * contrairement à la courbe de marée, pas de fenêtre ±12h : la température varie
 * lentement, une vue large est plus utile pour planifier une sortie à l'avance.
 */
export function SeaTempChart({ series, height = 130 }: SeaTempChartProps) {
  const data = series.filter((p) => p.value !== null).map((p) => [p.time.getTime(), p.value])

  const now = Date.now()
  const nowValueC = valueNear(series, new Date(now))

  // La température de l'eau varie peu sur 7 jours (souvent <1°C) : un axe 0-25°C par
  // défaut écraserait la courbe en une ligne quasi plate. On borne l'axe à l'amplitude
  // réelle des données (+ petite marge), comme TideChart le fait pour la hauteur d'eau.
  const temps = data.map((d) => d[1] as number)
  const yPaddingC = 0.5
  const yMin = temps.length ? Math.floor((Math.min(...temps) - yPaddingC) * 2) / 2 : undefined
  const yMax = temps.length ? Math.ceil((Math.max(...temps) + yPaddingC) * 2) / 2 : undefined

  const markPoints: Record<string, unknown>[] = []
  if (nowValueC !== null) {
    markPoints.push({
      coord: [now, nowValueC],
      value: '',
      symbol: 'circle',
      symbolSize: 8,
      itemStyle: { color: '#d84343', borderColor: '#fff', borderWidth: 1.5 },
      label: {
        formatter: () => `Maintenant — ${nowValueC.toFixed(1)} °C`,
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
    grid: { left: 44, right: 16, top: 24, bottom: 32 },
    tooltip: {
      trigger: 'axis',
      confine: true,
      formatter: (params: { axisValue: number; value: [number, number] }[]) => {
        const t = formatDateTimeParis(new Date(params[0].axisValue))
        return `${t}<br/>${params[0].value[1].toFixed(1)} °C`
      },
    },
    xAxis: {
      type: 'time',
      axisLabel: { formatter: (v: number) => formatAxisTick(new Date(v)) },
    },
    yAxis: { type: 'value', name: '°C', min: yMin, max: yMax },
    series: [
      {
        name: 'Température de l’eau',
        type: 'line',
        showSymbol: false,
        data,
        lineStyle: { color: '#e76f51', width: 2 },
        areaStyle: { color: 'rgba(231, 111, 81, 0.12)' },
        markPoint: { data: markPoints, symbolSize: 0 },
        markLine: {
          symbol: 'none',
          silent: true,
          label: { show: false },
          data: [{ xAxis: now, lineStyle: { color: '#d84343', type: 'solid', width: 1.5 } }],
        },
      },
    ],
  }

  return <ReactECharts option={option} style={{ height }} notMerge />
}
