import { useState } from 'react'
import { DEFAULT_SPOT_ID, SEED_SPOTS } from '../domain/spot'
import { RefreshButton } from '../components/common/RefreshButton'

const DEFAULT_SPOT = SEED_SPOTS.find((s) => s.id === DEFAULT_SPOT_ID)!

const LAYERS = [
  { id: 'sst', label: '🌡️ Température de l’eau', overlay: 'sst' },
  { id: 'radar', label: '📡 Radar (précipitations)', overlay: 'radar' },
  { id: 'waves', label: '🌊 Vagues', overlay: 'waves' },
] as const

type LayerId = (typeof LAYERS)[number]['id']

/**
 * Widget Windy — usage privé uniquement, jamais dans une version publiée sur un store :
 * Windy réserve son widget gratuit et son API aux médias, en excluant explicitement les
 * "weather apps" (confirmé par leur équipe sur leur forum communautaire). myWaves en est
 * une par nature. Choix assumé par l'utilisateur pour un usage personnel — voir « À propos ».
 */
function buildWindyEmbedUrl(overlay: string, lat: number, lon: number, zoom = 8): string {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    detailLat: String(lat),
    detailLon: String(lon),
    zoom: String(zoom),
    level: 'surface',
    overlay,
    menu: '',
    message: 'true',
    marker: 'true',
    calendar: 'now',
    pressure: '',
    type: 'map',
    location: 'coordinates',
    detail: '',
    metricWind: 'default',
    metricTemp: 'default',
    radarRange: '-1',
  })
  return `https://embed.windy.com/embed2.html?${params.toString()}`
}

export function MapPage() {
  const [layer, setLayer] = useState<LayerId>('waves')
  // Bug documenté côté Windy (leur forum communautaire) : au tout premier chargement du
  // widget embarqué, la couche demandée dans l'URL est parfois ignorée au profit du vent
  // — vérifié en pratique, l'URL générée est pourtant correcte. Changer la clé force un
  // remontage complet de l'iframe, qui résout le problème (vérifié aussi). Ce bouton donne
  // à l'utilisateur un moyen immédiat de s'en sortir sans avoir à changer de couche puis revenir.
  const [reloadKey, setReloadKey] = useState(0)
  const activeLayer = LAYERS.find((l) => l.id === layer)!

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Carte</h1>
          <p className="text-xs text-(--color-text-muted)">
            Widget Windy.com, en usage privé — déplaçable et zoomable directement dans la carte.
          </p>
        </div>
        <RefreshButton label="Recharger" onRefresh={() => setReloadKey((k) => k + 1)} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {LAYERS.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => setLayer(l.id)}
            className="whitespace-nowrap rounded-md border px-2.5 py-1 text-sm"
            style={{
              borderColor: 'var(--color-border)',
              background: l.id === layer ? 'color-mix(in srgb, var(--color-accent) 15%, transparent)' : undefined,
              fontWeight: l.id === layer ? 600 : 400,
            }}
          >
            {l.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-(--color-text-muted)">
        La couche affichée ne correspond pas au bouton sélectionné ? C'est un bug connu du widget Windy au premier
        chargement — touchez « Recharger ».
      </p>

      <iframe
        key={`${activeLayer.id}-${reloadKey}`}
        title={`Carte Windy — ${activeLayer.label}`}
        src={buildWindyEmbedUrl(activeLayer.overlay, DEFAULT_SPOT.latitude, DEFAULT_SPOT.longitude)}
        className="w-full rounded-md border"
        style={{ borderColor: 'var(--color-border)', height: '70vh' }}
        loading="lazy"
      />
    </div>
  )
}
