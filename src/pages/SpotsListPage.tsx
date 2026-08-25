import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { Geolocation } from '@capacitor/geolocation'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { SEED_SPOTS, type Spot } from '../domain/spot'
import { useFavoriteSpots } from '../hooks/useFavoriteSpots'
import { reverseGeocode, searchPlaces, type GeocodeResult } from '../api/geocode'

// react-leaflet ne résout pas les icônes par défaut via le bundler sans ce correctif.
const defaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})
L.Marker.prototype.options.icon = defaultIcon

function spotFromGeocodeResult(result: GeocodeResult): Spot {
  return {
    id: `custom-${result.placeId}`,
    name: result.name,
    latitude: result.latitude,
    longitude: result.longitude,
    // Le nom du lieu est déjà le 1er segment de displayName ; on garde les 2 suivants
    // (typiquement département + région) comme sous-titre, sans l'adresse complète.
    region: result.displayName.split(',').slice(1, 3).join(',').trim(),
  }
}

interface PendingPoint {
  lat: number
  lon: number
  name: string
  region: string
}

/** Capture les clics sur la carte pour placer un point personnalisé — doit être monté À
 * L'INTÉRIEUR de <MapContainer> (useMapEvents a besoin du contexte carte de react-leaflet).
 * Ne rend rien lui-même : le marqueur temporaire est géré par le parent (SpotsListPage),
 * pour partager son état avec le formulaire de nommage dans la Popup. */
function MapClickCapture({ onPick }: { onPick: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

/** Traduit les erreurs de géolocalisation natives (souvent en anglais) en français. */
function translateGeoError(e: unknown): string {
  const message = e instanceof Error ? e.message : String(e)
  const lower = message.toLowerCase()
  if (lower.includes('disabled') || lower.includes('not enabled') || lower.includes('location services')) {
    return 'La localisation est désactivée sur ce téléphone — active-la dans les réglages du système.'
  }
  if (lower.includes('denied') || lower.includes('permission')) {
    return 'Permission de localisation refusée.'
  }
  if (lower.includes('timeout')) {
    return "La localisation a pris trop de temps — réessaie."
  }
  if (lower.includes('unavailable') || lower.includes('not available')) {
    return 'Localisation indisponible sur cet appareil.'
  }
  return "Impossible d'obtenir ta position."
}

export function SpotsListPage() {
  const favorites = useFavoriteSpots()
  const [search, setSearch] = useState('')
  const [placeQuery, setPlaceQuery] = useState('')
  const [placeResults, setPlaceResults] = useState<GeocodeResult[]>([])
  const [placeBusy, setPlaceBusy] = useState(false)
  const [placeError, setPlaceError] = useState<string | null>(null)
  const [myPositionBusy, setMyPositionBusy] = useState(false)
  const [pendingPoint, setPendingPoint] = useState<PendingPoint | null>(null)
  const navigate = useNavigate()

  const allSpots = useMemo<Spot[]>(() => {
    const favIds = new Set((favorites ?? []).map((f) => f.id))
    return [...(favorites ?? []), ...SEED_SPOTS.filter((s) => !favIds.has(s.id))]
  }, [favorites])

  const filtered = allSpots.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))

  // Recherche à la demande (bouton), jamais à chaque frappe — voir api/geocode.ts pour
  // la politique d'usage Nominatim que ça respecte.
  const handleSearchPlace = async (e: FormEvent) => {
    e.preventDefault()
    if (!placeQuery.trim()) return
    setPlaceBusy(true)
    setPlaceError(null)
    try {
      const results = await searchPlaces(placeQuery)
      setPlaceResults(results)
      if (results.length === 0) setPlaceError('Aucun lieu trouvé.')
    } catch (e) {
      setPlaceError((e as Error).message)
    } finally {
      setPlaceBusy(false)
    }
  }

  // Consulte le spot SANS l'enregistrer comme favori (même logique que "Ma position" plus
  // bas) : l'utilisateur décide lui-même via l'étoile sur la page du spot s'il veut le
  // garder — une recherche ne doit pas remplir la liste de favoris toute seule.
  const handleViewPlace = (result: GeocodeResult) => {
    const spot = spotFromGeocodeResult(result)
    setPlaceResults([])
    setPlaceQuery('')
    navigate(`/spots/${spot.id}`, { state: { previewSpot: spot } })
  }

  // Géolocalise puis identifie le nom du lieu (reverse geocoding) pour afficher direct-
  // ement les conditions à cet endroit — SANS l'enregistrer comme favori (l'utilisateur
  // le fait lui-même via l'étoile sur la page du spot s'il veut le garder). Le spot est
  // passé par l'état de navigation (pas Dexie) : voir SpotPage.tsx pour la lecture.
  const handleUseMyPosition = async () => {
    setMyPositionBusy(true)
    setPlaceError(null)
    try {
      const permission = await Geolocation.requestPermissions()
      if (permission.location !== 'granted' && permission.coarseLocation !== 'granted') {
        setPlaceError('Permission de localisation refusée.')
        return
      }
      // Le défaut du plugin (timeout 10 s) est souvent trop court à l'intérieur ou au
      // premier lancement du GPS ; on cherche juste "dans quelle ville/plage on est",
      // pas une position précise au mètre, donc une position légèrement en cache convient.
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 20_000,
        maximumAge: 60_000,
      })
      const result = await reverseGeocode(position.coords.latitude, position.coords.longitude)
      const spot = spotFromGeocodeResult(result)
      navigate(`/spots/${spot.id}`, { state: { previewSpot: spot } })
    } catch (e) {
      setPlaceError(translateGeoError(e))
    } finally {
      setMyPositionBusy(false)
    }
  }

  // Clic sur la carte : place un point provisoire tout de suite (retour visuel immédiat),
  // puis tente un reverse geocoding pour suggérer un nom — best-effort, l'utilisateur peut
  // de toute façon corriger le nom avant de confirmer (voir la Popup du marqueur provisoire).
  const handleMapPick = async (lat: number, lon: number) => {
    setPendingPoint({ lat, lon, name: '', region: '' })
    try {
      const result = await reverseGeocode(lat, lon)
      setPendingPoint({ lat, lon, name: result.name, region: result.displayName.split(',').slice(1, 3).join(',').trim() })
    } catch {
      // Nom laissé vide : l'utilisateur le saisit lui-même dans la Popup.
    }
  }

  // Consulte le point cliqué SANS l'enregistrer comme favori (même logique que la recherche
  // de lieu et que "Ma position") — seule l'étoile sur la page du spot l'ajoute pour de bon.
  const handleConfirmPendingPoint = () => {
    if (!pendingPoint) return
    const spot: Spot = {
      id: `custom-${Date.now()}`,
      name: pendingPoint.name.trim() || 'Nouveau spot',
      latitude: pendingPoint.lat,
      longitude: pendingPoint.lon,
      region: pendingPoint.region,
    }
    setPendingPoint(null)
    navigate(`/spots/${spot.id}`, { state: { previewSpot: spot } })
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Mes spots</h1>

      <form onSubmit={handleSearchPlace} className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-(--color-text-muted)">Chercher un lieu ou site de plongée</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="search"
            placeholder="Ville, plage, port…"
            value={placeQuery}
            onChange={(e) => setPlaceQuery(e.target.value)}
            className="min-w-0 flex-1 rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={placeBusy || !placeQuery.trim()}
              className="flex-1 whitespace-nowrap rounded-md border px-3 py-2 text-sm disabled:opacity-50 sm:flex-none"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {placeBusy ? 'Recherche…' : 'Rechercher'}
            </button>
            <button
              type="button"
              disabled={myPositionBusy}
              onClick={handleUseMyPosition}
              className="flex-1 whitespace-nowrap rounded-md border px-3 py-2 text-sm disabled:opacity-50 sm:flex-none"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {myPositionBusy ? 'Localisation…' : '📍 Ma position'}
            </button>
          </div>
        </div>
      </form>

      {placeError && (
        <div className="rounded-md border p-2 text-xs" style={{ borderColor: 'var(--color-bad)' }}>
          {placeError}
        </div>
      )}

      {placeResults.length > 0 && (
        <ul className="flex flex-col gap-2">
          {placeResults.map((r) => (
            <li
              key={r.placeId}
              className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
            >
              <div className="min-w-0">
                <div className="font-medium">{r.name}</div>
                <div className="truncate text-xs text-(--color-text-muted)">{r.displayName}</div>
              </div>
              <button
                type="button"
                onClick={() => handleViewPlace(r)}
                className="whitespace-nowrap rounded-md border px-2 py-1 text-xs"
                style={{ borderColor: 'var(--color-border)' }}
              >
                Consulter
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        type="search"
        placeholder="Filtrer mes spots…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="rounded-md border px-3 py-2 text-sm"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      />

      <p className="text-xs text-(--color-text-muted)">
        Clique sur la carte pour consulter les conditions à cet endroit précis (étoile sur la page du spot pour le
        garder en favori).
      </p>
      <div className="h-80 overflow-hidden rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
        <MapContainer center={[47.5, -2.5]} zoom={6} scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickCapture onPick={handleMapPick} />
          {filtered.map((spot) => (
            <Marker key={spot.id} position={[spot.latitude, spot.longitude]}>
              <Popup>
                <Link to={`/spots/${spot.id}`}>{spot.name}</Link>
              </Popup>
            </Marker>
          ))}
          {pendingPoint && (
            // La Popup d'un Marker ne s'ouvre pas seule (comportement Leaflet standard, il
            // faut cliquer le marqueur) — on force l'ouverture via la ref dès le montage,
            // pour que le formulaire de nommage apparaisse tout de suite après le clic.
            <Marker
              position={[pendingPoint.lat, pendingPoint.lon]}
              ref={(marker) => {
                marker?.openPopup()
              }}
            >
              <Popup autoClose={false} closeOnClick={false}>
                {/* Sans stopPropagation, un clic sur les boutons ci-dessous remonte jusqu'à
                    la carte (Leaflet ne désactive pas la propagation pour les événements
                    synthétiques React) : ça rouvre un nouveau point pile là où on vient de
                    cliquer "Annuler", qui semble alors ne rien faire. */}
                <form
                  onClick={(e) => e.stopPropagation()}
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleConfirmPendingPoint()
                  }}
                  className="flex flex-col gap-1"
                >
                  <input
                    autoFocus
                    placeholder={pendingPoint.name ? undefined : 'Recherche du nom…'}
                    value={pendingPoint.name}
                    onChange={(e) => setPendingPoint({ ...pendingPoint, name: e.target.value })}
                    className="rounded border px-1.5 py-1 text-sm"
                    style={{ borderColor: 'var(--color-border)' }}
                  />
                  <div className="flex gap-1">
                    <button type="submit" className="flex-1 rounded border px-2 py-1 text-xs" style={{ borderColor: 'var(--color-border)' }}>
                      Consulter ce point
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingPoint(null)}
                      className="rounded border px-2 py-1 text-xs"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      <ul className="flex flex-col gap-2">
        {filtered.map((spot) => (
          <li key={spot.id}>
            <Link
              to={`/spots/${spot.id}`}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:opacity-80"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
            >
              <span>
                {spot.name}
                {spot.underRanceInfluence && <span className="ml-2 text-xs" title="Courants non modélisés">⚠️</span>}
              </span>
              <span className="text-xs text-(--color-text-muted)">{spot.region}</span>
            </Link>
          </li>
        ))}
        {filtered.length === 0 && <p className="text-sm text-(--color-text-muted)">Aucun spot ne correspond à « {search} ».</p>}
      </ul>
    </div>
  )
}
