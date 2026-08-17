import { useEffect, useMemo, useState } from 'react'
import { useSillGauge } from '../hooks/useSillGauge'
import { useSpotConditions } from '../hooks/useSpotConditions'
import { useBrestSeaLevelSeries } from '../hooks/useBrestCoefficient'
import { useSettings } from '../hooks/useSettings'
import { SEED_SPOTS } from '../domain/spot'
import {
  applyObservedCorrection,
  calibrateForecastToGauge,
  findAllThresholdCrossings,
  findNextThresholdCrossing,
  getCurrentSillStatus,
  mergeObservedWithForecast,
  SILL_CLEARANCE_UNCERTAINTY_M,
} from '../domain/sillLevel'
import { officialCoefficientNear, withOfficialTideWhereAvailable } from '../domain/officialTideExtremes'
import { useOfficialTideExtremes } from '../hooks/useOfficialTideExtremes'
import { estimateTideCoefficientAt, estimateTideCoefficientSeries } from '../domain/tideCoefficient'
import { cancelAllSillAlerts, requestNotificationPermission, scheduleSillAlerts } from '../notifications/sillAlerts'
import { formatDateTimeParis, formatRelativeAge } from '../lib/format'
import { windowAround } from '../lib/timeseries'
import { GaugeChart } from '../components/charts/GaugeChart'
import { CoefficientChart, type CoefficientPoint } from '../components/charts/CoefficientChart'
import { OfflineBanner } from '../components/common/OfflineBanner'
import { RefreshButton } from '../components/common/RefreshButton'
import type { TimeSeriesPoint } from '../api/types'

const SABLONS_SPOT = SEED_SPOTS.find((s) => s.id === 'saint-malo-sablons')!
const EMPTY_SERIES: TimeSeriesPoint[] = []

const TREND_LABEL: Record<'rising' | 'falling' | 'stable', string> = {
  rising: '↗ montante',
  falling: '↘ descendante',
  stable: '→ stable',
}

export function SillPage() {
  const gaugeQuery = useSillGauge()
  const forecastQuery = useSpotConditions(SABLONS_SPOT)
  const brestQuery = useBrestSeaLevelSeries()
  const officialTideQuery = useOfficialTideExtremes()
  const { settings, loaded, update } = useSettings()
  const [alertError, setAlertError] = useState<string | null>(null)
  const [alertBusy, setAlertBusy] = useState(false)

  const observedRaw = gaugeQuery.data?.data ?? EMPTY_SERIES
  const forecastRaw =
    forecastQuery.data?.data.marine.fine?.seaLevelHeightMsl ?? forecastQuery.data?.data.marine.seaLevelHeightMsl ?? EMPTY_SERIES

  // Calibration physique sur la mesure BRUTE (non corrigée) — la correction empirique
  // du réel ci-dessous s'applique séparément, pour ne jamais faire dériver les deux
  // ajustements l'un dans l'autre (voir domain/sillLevel.ts pour le détail).
  const calibratedForecast = useMemo(() => calibrateForecastToGauge(observedRaw, forecastRaw), [observedRaw, forecastRaw])
  const observed = useMemo(() => applyObservedCorrection(observedRaw), [observedRaw])
  // Remplace, quand elle est disponible, la prévision Open-Meteo calibrée par la hauteur
  // OFFICIELLE (fetch live maree.info — voir api/mareeInfoTable.ts) : plus fiable qu'une
  // correction empirique constante, dont l'erreur s'est révélée trop variable dans le
  // temps (jusqu'à 1,3 m d'écart à certains horaires, quasi nulle à d'autres — voir
  // « À propos »). Hors de la plage couverte, repli sur le calibré brut, SANS correction
  // constante (elle a fait plus de mal que de bien lors des tests).
  const officialExtrema = officialTideQuery.data?.extrema ?? []
  const futureSeries = useMemo(
    () => withOfficialTideWhereAvailable(officialExtrema, calibratedForecast),
    [officialExtrema, calibratedForecast],
  )

  const status = useMemo(() => getCurrentSillStatus(observed, settings.sillHeightM), [observed, settings.sillHeightM])

  const brestSeaLevel =
    brestQuery.data?.data.fine?.seaLevelHeightMsl ?? brestQuery.data?.data.seaLevelHeightMsl ?? EMPTY_SERIES
  const coefficientEstimate = useMemo(
    () => estimateTideCoefficientAt(brestSeaLevel, status?.measuredAt),
    [brestSeaLevel, status],
  )
  // Le coefficient OFFICIEL (fetch live) prime sur l'estimation dérivée de Brest quand
  // il couvre cet instant — plus exact, plus besoin de dériver quoi que ce soit.
  const displayedCoefficient = status
    ? (officialCoefficientNear(officialExtrema, status.measuredAt) ?? coefficientEstimate?.coefficient ?? null)
    : null

  // Courbe du coefficient national (dérivé de Brest, national — s'applique tel quel à
  // Saint-Malo, voir domain/tideCoefficient.ts), un point par demi-marée. Le coefficient
  // OFFICIEL remplace l'estimation quand une pleine mer officielle tombe à moins de 3h
  // du point estimé (même marée), même logique de priorité que displayedCoefficient.
  const coefficientSeries = useMemo(() => estimateTideCoefficientSeries(brestSeaLevel), [brestSeaLevel])
  const coefficientPoints = useMemo<CoefficientPoint[]>(() => {
    const officialWithCoeff = officialExtrema.filter((e) => e.coefficient !== undefined)
    return coefficientSeries.map((estimate) => {
      const official = officialWithCoeff.find((e) => Math.abs(e.time.getTime() - estimate.to.time.getTime()) < 3 * 3600_000)
      return {
        time: estimate.to.time,
        coefficient: official?.coefficient ?? estimate.coefficient,
        official: official !== undefined,
      }
    })
  }, [coefficientSeries, officialExtrema])

  // Passé = mesure réelle du marégraphe (corrigée) ; futur = donnée officielle si
  // disponible, sinon prévision calibrée. Fenêtre ±12h centrée sur "maintenant".
  const chartSeries = useMemo(
    () => windowAround(mergeObservedWithForecast(observed, futureSeries), new Date(), 12),
    [observed, futureSeries],
  )

  const nextCrossing = useMemo(
    () => findNextThresholdCrossing(futureSeries, settings.sillAlertClearanceM, settings.sillHeightM),
    [futureSeries, settings.sillAlertClearanceM, settings.sillHeightM],
  )
  const upcomingCrossings = useMemo(
    () => findAllThresholdCrossings(futureSeries, settings.sillAlertClearanceM, settings.sillHeightM),
    [futureSeries, settings.sillAlertClearanceM, settings.sillHeightM],
  )

  // Recale la fenêtre glissante de notifications à chaque changement de prévision ou de
  // réglage — Android tue les tâches de fond, donc on programme à l'avance plutôt que
  // de sonder le marégraphe en continu (voir notifications/sillAlerts.ts).
  useEffect(() => {
    if (!settings.sillAlertsEnabled || upcomingCrossings.length === 0) return
    scheduleSillAlerts(upcomingCrossings, settings.sillAlertClearanceM).catch((e) => setAlertError((e as Error).message))
  }, [settings.sillAlertsEnabled, upcomingCrossings, settings.sillAlertClearanceM])

  if (gaugeQuery.isPending || !loaded) {
    return <p className="text-sm text-(--color-text-muted)">Chargement du marégraphe de Saint-Malo…</p>
  }

  if (gaugeQuery.isError && observed.length === 0) {
    return (
      <div className="rounded-md border p-3 text-sm" style={{ borderColor: 'var(--color-bad)' }}>
        Marégraphe SHOM indisponible ({(gaugeQuery.error as Error).message}) et aucune donnée en cache.
      </div>
    )
  }

  const handleToggleAlerts = async () => {
    setAlertBusy(true)
    setAlertError(null)
    try {
      if (!settings.sillAlertsEnabled) {
        const granted = await requestNotificationPermission()
        if (!granted) {
          setAlertError('Permission de notification refusée.')
          return
        }
        await update('sillAlertsEnabled', true)
      } else {
        await cancelAllSillAlerts()
        await update('sillAlertsEnabled', false)
      }
    } catch (e) {
      setAlertError((e as Error).message)
    } finally {
      setAlertBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Seuil du Port des Sablons — Saint-Malo</h1>
          <p className="text-xs text-(--color-text-muted)">
            Marégraphe SHOM du terminal de la Naye (station 410), à quelques centaines de mètres de l'Anse des Sablons.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <button
            type="button"
            disabled={alertBusy}
            onClick={handleToggleAlerts}
            className="whitespace-nowrap rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {settings.sillAlertsEnabled ? '🔔 Alertes activées' : '🔕 Activer les alertes'}
          </button>
          <RefreshButton
            onRefresh={() => {
              gaugeQuery.refetch()
              officialTideQuery.refetch()
            }}
            isRefreshing={gaugeQuery.isFetching || officialTideQuery.isFetching}
          />
        </div>
      </div>

      {alertError && (
        <div className="rounded-md border p-2 text-xs" style={{ borderColor: 'var(--color-bad)' }}>
          {alertError}
        </div>
      )}

      {gaugeQuery.data?.stale && <OfflineBanner fetchedAt={gaugeQuery.data.fetchedAt} />}

      {status && (
        <div className="rounded-lg border p-4 text-center" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
          <div className="text-4xl font-bold" style={{ color: status.clearanceM < settings.sillAlertClearanceM ? 'var(--color-bad)' : 'var(--color-good)' }}>
            {status.clearanceM >= 0 ? '+' : ''}
            {status.clearanceM.toFixed(2)} m
            <span className="ml-1 text-base font-normal text-(--color-text-muted)">
              ± {(SILL_CLEARANCE_UNCERTAINTY_M * 100).toFixed(0)} cm
            </span>
          </div>
          <div className="text-sm text-(--color-text-muted)">
            au-dessus du seuil ({settings.sillHeightM.toFixed(2)} m) · tendance {TREND_LABEL[status.trend]}
          </div>
          <div className="mt-1 text-xs text-(--color-text-muted)">
            mesuré {formatRelativeAge(status.measuredAt.getTime())} ({formatDateTimeParis(status.measuredAt)})
          </div>
          {displayedCoefficient !== null && (
            <div className="mt-1 text-xs text-(--color-text-muted)">
              Coefficient : {displayedCoefficient} ({displayedCoefficient >= 70 ? 'vive-eau' : 'morte-eau'})
            </div>
          )}
        </div>
      )}

      {nextCrossing && (
        <div className="rounded-md border p-3 text-sm" style={{ borderColor: 'var(--color-warn)' }}>
          Prochain passage {nextCrossing.direction === 'falling' ? 'sous' : 'au-dessus de'} votre seuil d'alerte (
          {settings.sillAlertClearanceM.toFixed(2)} m) : <strong>{formatDateTimeParis(nextCrossing.time)}</strong>
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-(--color-text-muted)">Marégraphe (-12 h à +12 h)</h2>
        <GaugeChart series={chartSeries} sillHeightM={settings.sillHeightM} alertClearanceM={settings.sillAlertClearanceM} />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-(--color-text-muted)">Coefficient de marée (-12 h à +12 h)</h2>
        <CoefficientChart points={windowAround(coefficientPoints, new Date(), 12)} nowCoefficient={displayedCoefficient} />
      </div>

      <div className="rounded-md border p-3 text-xs text-(--color-text-muted)" style={{ borderColor: 'var(--color-border)' }}>
        ⚠️ Valeurs indicatives. Le panneau lumineux en bout de digue reste la référence sur place — l'envasement
        fait que la hauteur du seuil n'est pas garantie partout dans le chenal. La hauteur du seuil et le seuil
        d'alerte se règlent dans « Réglages ». Les notifications programmées ne fonctionnent que dans l'app
        Android installée (pas dans un navigateur web).
      </div>
    </div>
  )
}
