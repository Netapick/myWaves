import { useMemo } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useSpotConditions } from '../hooks/useSpotConditions'
import { useShomGauge } from '../hooks/useSillGauge'
import { useBrestSeaLevelSeries } from '../hooks/useBrestCoefficient'
import { extractTideEvents } from '../domain/tideEvents'
import { extractSlackWindows } from '../domain/slackWindows'
import { computeDiveScore } from '../domain/diveScore'
import { applyObservedCorrection, calibrateForecastToGauge, mergeObservedWithForecast } from '../domain/sillLevel'
import { officialCoefficientNear, withOfficialTideWhereAvailable } from '../domain/officialTideExtremes'
import { useOfficialTideExtremes } from '../hooks/useOfficialTideExtremes'
import { coefficientNear, estimateTideCoefficientSeries } from '../domain/tideCoefficient'
import { valueNear, windowAround } from '../lib/timeseries'
import { SEED_SPOTS, type Spot } from '../domain/spot'
import { MARC_CURRENT_ATLAS } from '../domain/marcCurrentAtlas.generated'
import { predictMarcCurrentSeries, predictMarcTideHeightSeries } from '../domain/marcCurrent'
import { useFavoriteSpots, addFavoriteSpot, removeFavoriteSpot } from '../hooks/useFavoriteSpots'
import { NowPanel } from '../components/dashboard/NowPanel'
import { TideChart } from '../components/charts/TideChart'
import { SeaTempChart } from '../components/charts/SeaTempChart'
import { SlackWindowsList } from '../components/dashboard/SlackWindowsList'
import { WindCompass } from '../components/dashboard/WindCompass'
import { OfflineBanner } from '../components/common/OfflineBanner'
import { RanceWarning } from '../components/common/RanceWarning'
import { RefreshButton } from '../components/common/RefreshButton'
import type { TimeSeriesPoint } from '../api/types'

const EMPTY_SERIES: TimeSeriesPoint[] = []

export function SpotPage() {
  const { spotId } = useParams<{ spotId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const favorites = useFavoriteSpots()

  // "Ma position" (SpotsListPage) navigue ici sans enregistrer de favori — le spot est
  // passé par l'état de navigation plutôt que Dexie, pour un simple aperçu tant que
  // l'utilisateur n'a pas cliqué "☆ Ajouter aux favoris" lui-même.
  const previewSpot = (location.state as { previewSpot?: Spot } | null)?.previewSpot

  // Tous les hooks doivent s'exécuter dans le même ordre à chaque rendu : les cas
  // "spot introuvable" / "en chargement" / "en erreur" sont gérés APRÈS ce bloc,
  // jamais par un retour anticipé entre deux hooks.
  const spot = useMemo(() => {
    return (
      SEED_SPOTS.find((s) => s.id === spotId) ??
      favorites?.find((s) => s.id === spotId) ??
      (previewSpot?.id === spotId ? previewSpot : undefined)
    )
  }, [spotId, favorites, previewSpot])

  const query = useSpotConditions(spot)
  const gaugeQuery = useShomGauge(spot?.shomStationId)
  const brestQuery = useBrestSeaLevelSeries()
  const officialTideQuery = useOfficialTideExtremes()

  const rawSeaLevelSeries =
    query.data?.data.marine.fine?.seaLevelHeightMsl ?? query.data?.data.marine.seaLevelHeightMsl ?? EMPTY_SERIES
  const openMeteoCurrentSeries =
    query.data?.data.marine.fine?.oceanCurrentVelocity ?? query.data?.data.marine.oceanCurrentVelocity ?? EMPTY_SERIES

  // Quand un point de grille MARC/Ifremer a été extrait pour ce spot (voir
  // scripts/extract-marc-harmonics.mjs), on lui préfère le courant recalculé
  // localement par synthèse harmonique : résolution ~1 km contre 15-20 km pour le
  // modèle global Open-Meteo sur cette côte découpée (voir domain/marcCurrent.ts).
  const marcTable = spot ? MARC_CURRENT_ATLAS[spot.id] : undefined
  const currentSeries = useMemo(() => {
    if (!marcTable) return openMeteoCurrentSeries
    const start = new Date(Date.now() - 24 * 3_600_000)
    const end = new Date(Date.now() + 7 * 24 * 3_600_000)
    return predictMarcCurrentSeries(marcTable, start, end)
  }, [marcTable, openMeteoCurrentSeries])

  // Même point de grille, même modèle que le courant ci-dessus : évite un décalage de
  // phase entre la hauteur et le courant affichés (constaté à Saint-Cast avec la hauteur
  // Open-Meteo — plus d'1h d'écart sur l'heure de pleine mer face au courant MARC).
  const marcHeightSeries = useMemo(() => {
    if (!marcTable?.elevation) return null
    const start = new Date(Date.now() - 24 * 3_600_000)
    const end = new Date(Date.now() + 7 * 24 * 3_600_000)
    return predictMarcTideHeightSeries(marcTable.elevation, start, end)
  }, [marcTable])

  // Quand un marégraphe SHOM existe à proximité (Saint-Malo), on ancre la courbe sur
  // la vraie mesure plutôt que sur le seul modèle global Open-Meteo : le référentiel
  // vertical diffère (niveau moyen vs zéro hydrographique) et l'amplitude d'un modèle à
  // ~9 km de résolution peut s'écarter de plusieurs % du marnage réel — sensible à
  // Saint-Malo, l'un des plus grands d'Europe. Passé = observations réelles ; futur =
  // prévision recalée sur ce même référentiel (voir domain/sillLevel.ts). Retombe
  // silencieusement sur la série brute Open-Meteo si aucun marégraphe n'est configuré
  // pour ce spot, ou si le marégraphe est indisponible.
  const observedRaw = gaugeQuery.data?.data ?? EMPTY_SERIES
  // Correction empirique sur le réel (écart constaté face aux tables officielles) —
  // voir domain/sillLevel.ts. Le futur préfère la hauteur OFFICIELLE (fetch live
  // maree.info — voir api/mareeInfoTable.ts) quand elle couvre la date ; une correction
  // empirique constante sur la prévision a été essayée et abandonnée, son erreur variant
  // trop selon l'heure (jusqu'à 1,3 m à certains horaires, quasi nulle à d'autres) pour
  // qu'une simple constante l'améliore de façon fiable.
  const observed = useMemo(() => applyObservedCorrection(observedRaw), [observedRaw])
  const officialExtrema = officialTideQuery.data?.extrema ?? []
  const seaLevelSeries = useMemo(() => {
    if (observedRaw.length === 0) return marcHeightSeries ?? rawSeaLevelSeries
    const calibrated = calibrateForecastToGauge(observedRaw, rawSeaLevelSeries)
    return mergeObservedWithForecast(observed, withOfficialTideWhereAvailable(officialExtrema, calibrated))
  }, [observedRaw, observed, rawSeaLevelSeries, officialExtrema, marcHeightSeries])

  // Seuil de bruit uniquement quand la série contient de la vraie mesure (marégraphe) —
  // voir le commentaire de extractTideEvents : les courbes 100% modélisées n'en ont pas besoin.
  const tideEvents = useMemo(
    () => extractTideEvents(seaLevelSeries, observed.length > 0 ? 0.15 : 0),
    [seaLevelSeries, observed.length],
  )
  const slackWindows = useMemo(() => extractSlackWindows(currentSeries), [currentSeries])

  // Le coefficient est national (calculé à Brest) : il s'applique tel quel à n'importe
  // quel spot de la façade Manche/Atlantique, pas seulement à Brest lui-même.
  const brestSeaLevel =
    brestQuery.data?.data.fine?.seaLevelHeightMsl ?? brestQuery.data?.data.seaLevelHeightMsl ?? EMPTY_SERIES
  const tideCoefficients = useMemo(() => estimateTideCoefficientSeries(brestSeaLevel), [brestSeaLevel])

  if (!spot) {
    return <p className="text-sm text-(--color-text-muted)">Spot introuvable.</p>
  }

  if (query.isPending) {
    return <p className="text-sm text-(--color-text-muted)">Chargement des conditions pour {spot.name}…</p>
  }

  if (query.isError) {
    return (
      <div className="rounded-md border p-3 text-sm" style={{ borderColor: 'var(--color-bad)' }}>
        Impossible de charger les conditions ({(query.error as Error).message}) et aucune donnée en cache.
      </div>
    )
  }

  const { data, stale, fetchedAt } = query.data
  const { marine, wind } = data

  const windSpeedSeries = wind.fine?.windSpeed10m ?? wind.windSpeed10m
  const windDirSeries = wind.fine?.windDirection10m ?? wind.windDirection10m

  const now = new Date()
  const nearestSlackMinutes = (() => {
    if (slackWindows.length === 0) return null
    let best = Infinity
    for (const w of slackWindows) {
      const d =
        now >= w.start && now <= w.end
          ? 0
          : Math.min(Math.abs(now.getTime() - w.start.getTime()), Math.abs(now.getTime() - w.end.getTime()))
      if (d < best) best = d
    }
    return best / 60_000
  })()

  const waveHeightNow = valueNear(marine.waveHeight, now)
  const wavePeriodNow = valueNear(marine.wavePeriod, now)
  const windSpeedNow = valueNear(windSpeedSeries, now)
  const windDirNow = valueNear(windDirSeries, now)
  const currentNow = valueNear(currentSeries, now)
  const waveDirNow = valueNear(marine.waveDirection, now)
  const seaTempNow = valueNear(marine.seaSurfaceTemperature, now)
  // Le coefficient OFFICIEL (relevé manuel, voir officialTideExtremes.ts) prime sur
  // l'estimation dérivée de Brest quand il couvre cet instant.
  const coefficientNow = officialCoefficientNear(officialExtrema, now) ?? coefficientNear(tideCoefficients, now)

  const tideTrend = (() => {
    const before = valueNear(seaLevelSeries, new Date(now.getTime() - 10 * 60_000))
    const after = valueNear(seaLevelSeries, now)
    if (before === null || after === null) return null
    const delta = after - before
    if (Math.abs(delta) < 0.01) return 'stable' as const
    return delta > 0 ? ('rising' as const) : ('falling' as const)
  })()

  const score = computeDiveScore({
    waveHeightM: waveHeightNow,
    wavePeriodS: wavePeriodNow,
    windSpeedKmh: windSpeedNow,
    currentVelocityKmh: spot.underRanceInfluence ? null : currentNow,
    minutesToNearestSlack: spot.underRanceInfluence ? null : nearestSlackMinutes,
  })

  const isFavorite = favorites?.some((f) => f.id === spot.id) ?? false

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label="Retour aux spots"
            title="Retour aux spots"
            className="rounded-md border px-2 py-1.5 text-sm"
            style={{ borderColor: 'var(--color-border)' }}
          >
            ← Spots
          </button>
          <div>
            <h1 className="text-xl font-semibold">{spot.name}</h1>
            <p className="text-xs text-(--color-text-muted)">{spot.region}</p>
          </div>
        </div>
        <button
          type="button"
          className="rounded-md border px-3 py-1.5 text-sm"
          style={{ borderColor: 'var(--color-border)' }}
          onClick={() => (isFavorite ? removeFavoriteSpot(spot.id) : addFavoriteSpot(spot))}
        >
          {isFavorite ? '★ Favori' : '☆ Ajouter aux favoris'}
        </button>
      </div>

      {stale && <OfflineBanner fetchedAt={fetchedAt} />}
      {spot.underRanceInfluence && <RanceWarning />}

      <NowPanel
        data={{
          waveHeightM: waveHeightNow,
          wavePeriodS: wavePeriodNow,
          seaSurfaceTempC: seaTempNow,
          windSpeedKmh: windSpeedNow,
          windDirectionDeg: windDirNow,
          currentVelocityKmh: spot.underRanceInfluence ? null : currentNow,
          tideTrend,
          tideCoefficient: coefficientNow,
        }}
        score={score}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-(--color-text-muted)">Courbe de marée (24 h)</h2>
            <RefreshButton
              onRefresh={() => {
                query.refetch()
                gaugeQuery.refetch()
                officialTideQuery.refetch()
              }}
              isRefreshing={query.isFetching || gaugeQuery.isFetching || officialTideQuery.isFetching}
            />
          </div>
          <TideChart
            seaLevelSeries={windowAround(seaLevelSeries, now, 12)}
            tideEvents={tideEvents}
            tideCoefficients={tideCoefficients}
            slackWindows={spot.underRanceInfluence ? [] : slackWindows}
            currentVelocitySeries={spot.underRanceInfluence ? undefined : windowAround(currentSeries, now, 12)}
          />
          <h2 className="mt-4 mb-2 text-sm font-semibold text-(--color-text-muted)">Température de l'eau (7 jours)</h2>
          <SeaTempChart series={marine.seaSurfaceTemperature} height={320} />
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="mb-2 text-sm font-semibold text-(--color-text-muted)">Vent &amp; houle</h2>
            <WindCompass
              windSpeedKmh={windSpeedNow}
              windDirectionDeg={windDirNow}
              waveDirectionDeg={waveDirNow}
              facingDegrees={spot.facingDegrees}
            />
          </div>
          <div>
            <h2 className="mb-2 text-sm font-semibold text-(--color-text-muted)">Prochaines étales</h2>
            {spot.underRanceInfluence ? (
              <p className="text-sm text-(--color-text-muted)">
                Non affiché sur ce spot — courants non modélisés (voir avertissement ci-dessus).
              </p>
            ) : (
              <>
                <p className="mb-2 text-xs text-(--color-text-muted)">
                  {marcTable
                    ? `✓ Courant recalculé à partir de l'atlas de marée Ifremer/MARC (point à ${marcTable.gridPoint.distanceKm.toFixed(1)} km du site) — nettement plus précis qu'un modèle global, mais reste une donnée de marée pure (vent et autres effets non modélisés).`
                    : "⚠️ Courant issu d'un modèle océanique global (maille large, point de calcul parfois à 15-20 km du site) — peu fiable près des pointes, chenaux et zones à courants forts. À recouper avec l'observation sur place."}
                </p>
                <SlackWindowsList windows={slackWindows} now={now} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
