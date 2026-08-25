#!/usr/bin/env node
/**
 * Filtre et déduplique les candidats OSM (marinas/ports, voir .tmp-marc/marinas-fr.json,
 * obtenu via une requête Overpass sur toute la France) pour ne garder que ceux qui tombent
 * vraiment sur un point de mer valide de l'atlas MARC — élimine d'un coup les ports fluviaux
 * (Paris, Toulouse...), la Méditerranée et l'outre-mer (hors des 5 emprises MARC) sans avoir
 * besoin d'une vraie géométrie de côte : un point loin de tout point de mer MARC n'est de
 * toute façon pas exploitable pour le courant.
 *
 * Usage : node scripts/build-coastal-points.mjs
 * Résultat : scripts/coastal-points.generated.json (committé, entrée de extract-marc-harmonics.mjs)
 */
import { readFileSync, existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { NetCDFReader } from 'netcdfjs'

const CACHE_DIR = '.marc-cache'
const MAX_DISTANCE_KM = 4 // au-delà, considéré hors couverture réelle (ports fluviaux, etc.)
const MIN_SEPARATION_KM = 3 // fusionne les candidats trop proches (même port, plusieurs tags)

const REGIONS = [
  { code: 'MANE', latMin: 49.0, latMax: 51.4, lonMin: -1.2, lonMax: 2.8 },
  { code: 'MANW', latMin: 48.4, latMax: 50.2, lonMin: -4.3, lonMax: -0.4 },
  { code: 'FINIS', latMin: 47.2, latMax: 49.1, lonMin: -5.7, lonMax: -3.6 },
  { code: 'SUDBZH', latMin: 46.7, latMax: 48.0, lonMin: -4.3, lonMax: -1.9 },
  { code: 'AQUI', latMin: 43.2, latMax: 46.9, lonMin: -2.3, lonMax: -0.6 },
]

function candidateRegions(lat, lon) {
  return REGIONS.filter((r) => lat >= r.latMin && lat <= r.latMax && lon >= r.lonMin && lon <= r.lonMax)
}

function attr(reader, varName, attrName) {
  const v = reader.variables.find((v) => v.name === varName)
  const a = v.attributes.find((a) => a.name === attrName)
  return a ? a.value : undefined
}

function loadGrid(region) {
  const file = path.join(CACHE_DIR, `M2-U-${region.code}-atlas.nc`)
  if (!existsSync(file)) throw new Error(`Manquant en cache : ${file} (lancer d'abord le téléchargement complet)`)
  const reader = new NetCDFReader(readFileSync(file))
  const lonRaw = reader.getDataVariable('longitude_u')
  const latRaw = reader.getDataVariable('latitude_u')
  const ampRaw = reader.getDataVariable('U_a')
  const lonScale = attr(reader, 'longitude_u', 'scale_factor') ?? 1
  const lonOff = attr(reader, 'longitude_u', 'add_offset') ?? 0
  const latScale = attr(reader, 'latitude_u', 'scale_factor') ?? 1
  const latOff = attr(reader, 'latitude_u', 'add_offset') ?? 0
  const fill = attr(reader, 'U_a', '_FillValue')

  const points = []
  for (let i = 0; i < lonRaw.length; i++) {
    if (ampRaw[i] === fill) continue
    points.push({ lat: latRaw[i] * latScale + latOff, lon: lonRaw[i] * lonScale + lonOff })
  }
  return points
}

function nearestDistanceKm(grid, lat, lon) {
  let best = Infinity
  for (const p of grid) {
    const dLat = p.lat - lat
    const dLon = (p.lon - lon) * Math.cos((lat * Math.PI) / 180)
    const d = dLat * dLat + dLon * dLon
    if (d < best) best = d
  }
  return Math.sqrt(best) * 111
}

function haversineKm(a, b) {
  const dLat = a.lat - b.lat
  const dLon = (a.lon - b.lon) * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180))
  return Math.sqrt(dLat * dLat + dLon * dLon) * 111
}

async function main() {
  // Deux sources OSM combinées : les ports/marinas nommés (précis, mais ne couvrent pas
  // tous les noms de lieux qu'on tape dans la recherche — ex. "Pornic" lui-même n'a pas de
  // nœud marina/harbour distinct) et les communes (ville/village), qui correspondent à ce
  // que Nominatim renvoie pour une recherche par simple nom de lieu (voir api/geocode.ts).
  const marinas = JSON.parse(readFileSync('.tmp-marc/marinas-fr.json', 'utf8')).elements
  const places = JSON.parse(readFileSync('.tmp-marc/places-fr.json', 'utf8')).elements
  console.log(`${marinas.length} candidats port/marina + ${places.length} communes (bruts)`)

  const gridCache = {}
  const kept = []
  let rejected = 0

  for (const el of [...marinas, ...places]) {
    const name = el.tags?.name
    if (!name || el.lat === undefined || el.lon === undefined) continue

    const candidates = candidateRegions(el.lat, el.lon)
    if (candidates.length === 0) {
      rejected++
      continue
    }

    let best = null
    for (const region of candidates) {
      gridCache[region.code] ??= loadGrid(region)
      const distanceKm = nearestDistanceKm(gridCache[region.code], el.lat, el.lon)
      if (!best || distanceKm < best.distanceKm) best = { region: region.code, distanceKm }
    }

    if (best.distanceKm > MAX_DISTANCE_KM) {
      rejected++
      continue
    }

    kept.push({ name, lat: el.lat, lon: el.lon, region: best.region, distanceKm: best.distanceKm })
  }

  console.log(`${kept.length} retenus (proches d'un point de mer MARC), ${rejected} rejetés (hors couverture)`)

  // Fusionne les candidats trop proches (même port taggué plusieurs fois) — garde celui
  // dont le point de mer MARC le plus proche est le plus précis.
  kept.sort((a, b) => a.distanceKm - b.distanceKm)
  const deduped = []
  for (const c of kept) {
    if (deduped.some((d) => haversineKm(d, c) < MIN_SEPARATION_KM)) continue
    deduped.push(c)
  }
  deduped.sort((a, b) => a.region.localeCompare(b.region) || a.name.localeCompare(b.name))

  console.log(`${deduped.length} points côtiers uniques après fusion (< ${MIN_SEPARATION_KM} km)`)
  const byRegion = {}
  for (const d of deduped) byRegion[d.region] = (byRegion[d.region] ?? 0) + 1
  console.log('par région :', byRegion)

  await writeFile('scripts/coastal-points.generated.json', JSON.stringify(deduped, null, 2))
  console.log('écrit scripts/coastal-points.generated.json')
}

main()
