import ReactECharts from 'echarts-for-react'
import type { TimeSeriesPoint } from '../../api/types'
import { formatTimeParis } from '../../lib/format'
import { pointNear } from '../../lib/timeseries'
import { CHART_CALLOUT_BG, CHART_CALLOUT_TEXT } from '../../lib/chartTheme'

interface GaugeChartProps {
  /** Hauteur d'eau brute du marégraphe, en m au-dessus du zéro hydrographique. */
  series: TimeSeriesPoint[]
  sillHeightM: number
  alertClearanceM: number
  height?: number
}

/**
 * Hauteur d'eau brute (référentiel zéro hydrographique — même échelle que les
 * annuaires de marée officiels), avec le seuil et le seuil d'alerte tracés à leur
 * vraie position sur cette échelle plutôt que dans un référentiel "clearance"
 * séparé : évite de devoir mentalement additionner 2 m pour comparer à une autre
 * source (annuaire SHOM, maree.info…).
 */
export function GaugeChart({ series, sillHeightM, alertClearanceM, height = 220 }: GaugeChartProps) {
  const data = series.filter((p) => p.value !== null).map((p) => [p.time.getTime(), p.value])
  const alertHeightM = sillHeightM + alertClearanceM

  // Ancré sur le point RÉEL le plus proche de "maintenant", jamais sur l'horloge murale
  // brute : plotter au littéral Date.now() peut tomber légèrement hors de la plage de
  // données (le marégraphe a quelques minutes de retard), ce qui écarte le marqueur en
  // silence côté ECharts. pointNear renvoie toujours un point qui appartient réellement
  // à la série, donc toujours dans sa plage — quelle que soit la composition de `series`
  // (observations seules, ou observations + prévision, voir SillPage).
  const nowPoint = pointNear(series, new Date())
  const nowValueM = nowPoint?.value ?? null
  const nowTime = nowPoint?.time ?? new Date()

  // Marge verticale explicite au-delà des données (même raison que TideChart) : sans
  // elle, l'encart "Maintenant" (3 lignes, poussé au-dessus de son point) se fait rogner
  // par le bord du graphique dès que le niveau d'eau courant est proche d'une pleine mer.
  const heights = data.map((d) => d[1] as number)
  const yMax = heights.length ? Math.ceil(Math.max(...heights) + 1.5) : undefined

  const option = {
    animation: false,
    grid: { left: 48, right: 16, top: 24, bottom: 32 },
    tooltip: {
      trigger: 'axis',
      confine: true,
      formatter: (params: { axisValue: number; value: [number, number] }[]) => {
        const heightM = params[0].value[1]
        return `${formatTimeParis(new Date(params[0].axisValue))} : ${heightM.toFixed(2)} m (${(heightM - sillHeightM >= 0 ? '+' : '')}${(heightM - sillHeightM).toFixed(2)} m au-dessus du seuil)`
      },
    },
    xAxis: {
      type: 'time',
      axisLabel: { formatter: (v: number) => formatTimeParis(new Date(v)), hideOverlap: true },
    },
    yAxis: { type: 'value', name: 'Hauteur (m)', min: 0, max: yMax },
    series: [
      {
        type: 'line',
        showSymbol: false,
        data,
        lineStyle: { color: '#0077b6', width: 2 },
        // Point marqué sur la courbe à "maintenant", avec un encart temps + valeur —
        // demandé explicitement à la place d'une carte séparée : la donnée doit être
        // ancrée sur SON point de la courbe, pas affichée à côté dans un autre widget.
        markPoint:
          nowValueM !== null
            ? {
                symbol: 'circle',
                symbolSize: 8,
                itemStyle: { color: '#d84343', borderColor: '#fff', borderWidth: 1.5 },
                data: [{ coord: [nowTime.getTime(), nowValueM] }],
                label: {
                  formatter: () => `Maintenant\n${formatTimeParis(nowTime)}\n${nowValueM.toFixed(2)} m`,
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
              }
            : undefined,
        markLine: {
          symbol: 'none',
          // position: 'insideStartTop' place le label près du bord GAUCHE de la zone de
          // tracé (l'axe des ordonnées) : la position par défaut ('end', à droite) sort
          // du cadre et se fait couper par les marges du graphique.
          data: [
            {
              // Label poussé EN DESSOUS de sa ligne : le seuil d'alerte est toujours
              // au-dessus du seuil (alertClearanceM >= 0), donc pousser chaque label à
              // l'opposé de l'autre ligne les empêche de se chevaucher même quand les
              // deux lignes sont proches (petit seuil d'alerte).
              yAxis: sillHeightM,
              lineStyle: { color: '#d84343', type: 'solid' },
              label: {
                formatter: `Seuil (${sillHeightM.toFixed(2)} m)`,
                position: 'insideStartBottom',
                align: 'left',
                fontSize: 10,
              },
            },
            {
              yAxis: alertHeightM,
              lineStyle: { color: '#e9a02c', type: 'dashed' },
              label: {
                formatter: `Seuil d'alerte (${alertHeightM.toFixed(2)} m)`,
                position: 'insideStartTop',
                align: 'left',
                fontSize: 10,
              },
            },
          ],
        },
      },
    ],
  }

  return <ReactECharts option={option} style={{ height }} notMerge />
}
