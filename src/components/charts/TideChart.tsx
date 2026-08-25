import ReactECharts from 'echarts-for-react'
import type { TimeSeriesPoint } from '../../api/types'
import type { EtaleEvent, TideEvent } from '../../domain/types'
import { coefficientNear, type TideCoefficientEstimate } from '../../domain/tideCoefficient'
import { formatDateTimeParis, formatTimeParis } from '../../lib/format'
import { valueNear } from '../../lib/timeseries'
import { CHART_CALLOUT_BG, CHART_CALLOUT_TEXT } from '../../lib/chartTheme'

interface TideChartProps {
  seaLevelSeries: TimeSeriesPoint[]
  tideEvents: TideEvent[]
  etaleEvents: EtaleEvent[]
  currentVelocitySeries?: TimeSeriesPoint[]
  /** Coefficients estimés à Brest (voir domain/tideCoefficient.ts) — annote chaque PM/BM
   * du coefficient national en vigueur à cet instant. Omis si non fourni. */
  tideCoefficients?: TideCoefficientEstimate[]
  height?: number
}

/**
 * Courbe de hauteur d'eau avec pleines/basses mers annotées et fenêtres d'étale
 * surlignées — la fonctionnalité centrale de l'app pour la plongée.
 */
export function TideChart({
  seaLevelSeries,
  tideEvents,
  etaleEvents,
  currentVelocitySeries,
  tideCoefficients,
  height = 320,
}: TideChartProps) {
  const levelData = seaLevelSeries.filter((p) => p.value !== null).map((p) => [p.time.getTime(), p.value])

  const currentData = (currentVelocitySeries ?? [])
    .filter((p) => p.value !== null)
    .map((p) => [p.time.getTime(), p.value])

  const now = Date.now()
  const nowValueM = valueNear(seaLevelSeries, new Date(now))

  // Marge verticale explicite au-delà des données : sans elle, les labels PM/BM (poussés
  // top/bottom, voir plus bas) se font rogner par le bord du graphique dès qu'un extremum
  // est proche du minimum/maximum affiché.
  const heights = levelData.map((d) => d[1] as number)
  const yPaddingM = 1
  const yMin = heights.length ? Math.floor(Math.min(...heights) - yPaddingM) : undefined
  const yMax = heights.length ? Math.ceil(Math.max(...heights) + yPaddingM) : undefined

  // ECharts peint sur canvas (zrender) : il ne résout PAS les variables CSS (`var(--...)`),
  // contrairement au SVG/DOM (cf. WindCompass). D'où des couleurs littérales ici, jamais var(--...).
  //
  // Les labels PM sont poussés AU-DESSUS de leur point et les BM EN DESSOUS (plutôt que
  // centrés dessus) : ça les éloigne systématiquement de la courbe et les uns des autres,
  // qui alternent naturellement toutes les ~6h12. Sans ce décalage, un PM et un BM proches
  // en hauteur (ex. juste avant/après "maintenant") peuvent se chevaucher.
  const markPoints: Record<string, unknown>[] = tideEvents.map((e) => {
    const coef = tideCoefficients ? coefficientNear(tideCoefficients, e.time) : null
    const phaseLabel = e.phase === 'high' ? 'PM' : 'BM'
    return {
      coord: [e.time.getTime(), e.height],
      value: coef !== null ? `${phaseLabel} ${coef}` : phaseLabel,
      itemStyle: { color: e.phase === 'high' ? '#023e8a' : '#0077b6' },
      label: {
        formatter: (p: { value: string }) => `${p.value}\n${formatTimeParis(e.time)}`,
        position: e.phase === 'high' ? 'top' : 'bottom',
        distance: 6,
        fontSize: 10,
        fontWeight: 600,
        color: CHART_CALLOUT_TEXT,
        backgroundColor: CHART_CALLOUT_BG,
        padding: [4, 6],
        borderRadius: 4,
        lineHeight: 14,
      },
    }
  })

  // Point marqué sur la courbe à "maintenant", avec un encart temps + valeur — ancré sur
  // SON point de la courbe (symbole visible, contrairement aux PM/BM ci-dessus qui sont
  // à symbolSize 0), plutôt qu'affiché à côté dans un widget séparé.
  if (nowValueM !== null) {
    markPoints.push({
      coord: [now, nowValueM],
      value: '',
      symbol: 'circle',
      symbolSize: 8,
      itemStyle: { color: '#d84343', borderColor: '#fff', borderWidth: 1.5 },
      label: {
        formatter: () => `Maintenant — ${formatTimeParis(new Date(now))}\n${nowValueM.toFixed(2)} m`,
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

  // Une étale par pleine mer et une par basse mer, TOUJOURS (voir extractEtaleEvents) —
  // repère vertical à l'instant précis, avec la durée du passage sous le seuil en label
  // quand elle est connue (courte par construction, voir MAX_PLAUSIBLE_WINDOW_MIN — jamais
  // la bande de plusieurs heures de l'ancienne implémentation).
  const slackLines = etaleEvents.map((e) => ({
    xAxis: e.time.getTime(),
    lineStyle: { color: '#2a9d8f', type: 'dashed' as const, width: 1.5 },
    label: {
      show: true,
      formatter: () =>
        `Étale\n${formatTimeParis(e.time)}${e.durationMin !== null ? ` (~${Math.round(e.durationMin)} min)` : ''}`,
      position: 'insideEndTop' as const,
      fontSize: 10,
      color: '#2a9d8f',
      lineHeight: 12,
    },
  }))

  const option = {
    animation: false,
    grid: { left: 48, right: currentData.length ? 48 : 16, top: 24, bottom: 32 },
    tooltip: {
      trigger: 'axis',
      confine: true,
      formatter: (params: { axisValue: number; value: [number, number]; seriesName: string }[]) => {
        const t = formatDateTimeParis(new Date(params[0].axisValue))
        const lines = params.map((p) => `${p.seriesName} : ${p.value[1].toFixed(2)}`)
        return [t, ...lines].join('<br/>')
      },
    },
    xAxis: {
      type: 'time',
      axisLabel: { formatter: (v: number) => formatTimeParis(new Date(v)) },
    },
    yAxis: [
      { type: 'value', name: 'Hauteur (m)', position: 'left', min: yMin, max: yMax },
      ...(currentData.length ? [{ type: 'value', name: 'Courant (km/h)', position: 'right' }] : []),
    ],
    series: [
      {
        name: 'Hauteur d’eau',
        type: 'line',
        showSymbol: false,
        data: levelData,
        lineStyle: { color: '#0077b6', width: 2 },
        markPoint: { data: markPoints, symbolSize: 0 },
        // Ligne "maintenant" sans étiquette (le texte est porté par le point marqué
        // ci-dessus, pour ne pas dupliquer l'info) + un repère par étale (voir slackLines).
        markLine: {
          symbol: 'none',
          silent: true,
          label: { show: false },
          data: [{ xAxis: now, lineStyle: { color: '#d84343', type: 'solid', width: 1.5 } }, ...slackLines],
        },
      },
      ...(currentData.length
        ? [
            {
              name: 'Courant',
              type: 'line' as const,
              yAxisIndex: 1,
              showSymbol: false,
              data: currentData,
              lineStyle: { color: '#e9a02c', width: 1.5, type: 'dashed' as const },
            },
          ]
        : []),
    ],
  }

  return <ReactECharts option={option} style={{ height }} notMerge />
}
