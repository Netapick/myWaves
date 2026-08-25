#!/usr/bin/env node
/**
 * Extrait, pour une liste de points côtiers, les composantes harmoniques de courant de
 * marée (vitesses U est-ouest et V nord-sud) ET de hauteur d'eau (XE) depuis l'atlas
 * Ifremer/MARC — résolution ~1-2,5 km, bien plus fine que la maille globale d'Open-Meteo
 * qui peut être à 15-20 km du site réel sur une côte découpée. Extraire aussi la hauteur
 * (pas seulement le courant) au même point de grille évite un décalage de phase entre les
 * deux courbes affichées dans l'app quand elles viendraient de deux modèles différents.
 *
 * Couvre toute la façade Manche/Atlantique française via 5 atlas régionaux (leurs
 * emprises se chevauchent légèrement, pas de trou de couverture) : la région est choisie
 * automatiquement pour chaque point selon ses coordonnées, voir REGIONS ci-dessous.
 *
 * Deux sources de points, combinées :
 *  - CURATED_POINTS ci-dessous : coordonnées vérifiées à la main (port/plage précis,
 *    jamais un centroïde de commune — voir domain/spot.ts) pour les spots où la précision
 *    compte le plus.
 *  - scripts/coastal-points.generated.json : ~570 ports/communes côtières généré via
 *    scripts/build-coastal-points.mjs (recherche OSM + filtre "proche d'un point de mer
 *    MARC valide"), pour une couverture automatique de tout le littoral — n'importe quel
 *    lieu trouvé par la recherche de l'app (Nominatim) retombera près d'un point déjà
 *    extrait, voir domain/marcCurrent.ts:findNearestMarcTable.
 *
 * Source : accès FTP obtenu sur demande auprès d'Ifremer (formulaire
 * forms.ifremer.fr/lops-oc/marc-atlas-harmo/, réponse reçue le 2026-08-25 — voir mémoire
 * du projet). Citation requise en cas d'exploitation :
 * Pineau-Guillou Lucia (2013). PREVIMER Validation des atlas de composantes harmoniques
 * de hauteurs et courants de marée. Rapport Ifremer, 89p.
 * http://archimer.ifremer.fr/doc/00157/26801/
 *
 * Les fichiers NetCDF (~114 par région — U/V/XE × 38 constituantes —, ~5-19 Mo chacun) sont
 * mis en cache localement dans .marc-cache/ (gitignored) — relancer ce script ne
 * re-télécharge que ce qui manque. Chaque fichier n'est lu qu'UNE FOIS par région (pas une
 * fois par point) : les points d'une région partagent la même lecture des 114 fichiers.
 *
 * Le parsing NetCDF (JS pur, non optimisé) domine largement le temps d'exécution — et son
 * coût est quasi indépendant du nombre de points (il faut lire les 114 fichiers de toute
 * façon). Les 5 régions sont donc traitées dans des PROCESS SÉPARÉS EN PARALLÈLE (voir
 * runOrchestrator ci-dessous) : sans ça, tout tournait sur un seul cœur alors que la
 * machine en a plusieurs, pour un script qui aurait pu utiliser un cœur par région.
 *
 * Usage :
 *   npm install --no-save netcdfjs
 *   MARC_FTP_USER=... MARC_FTP_PASS=... node scripts/extract-marc-harmonics.mjs
 * Résultat : src/domain/marcCurrentAtlas.generated.ts (committé — ce sont juste des
 * nombres, pas les fichiers NetCDF sources).
 *
 * (Usage interne : `node scripts/extract-marc-harmonics.mjs --region=MANE` traite une
 * seule région et écrit .marc-cache/partial-MANE.json — c'est ce que l'orchestrateur
 * lance en sous-process, pas un mode à utiliser directement.)
 */
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { NetCDFReader } from 'netcdfjs'

const FTP_HOST = 'ftp.ifremer.fr'
const FTP_USER = process.env.MARC_FTP_USER
const FTP_PASS = process.env.MARC_FTP_PASS
const FTP_ROOT = 'MARC_L1-ATLAS-AHRMONIQUES'
const CACHE_DIR = '.marc-cache'
const SCRIPT_PATH = fileURLToPath(import.meta.url)

// Emprises (lat/lon des points de mer valides, marge de sécurité incluse) des 5 atlas V1
// couvrant la Manche et l'Atlantique — mesurées directement sur les fichiers (constituante
// M2). Vérifiées sans trou de couverture entre régions adjacentes (légers chevauchements).
// Ordre nord → sud : utilisé tel quel pour départager les zones de chevauchement.
const REGIONS = [
  { code: 'MANE', dir: 'V1_MANE', latMin: 49.0, latMax: 51.4, lonMin: -1.2, lonMax: 2.8 }, // Manche Est
  { code: 'MANW', dir: 'V1_MANW', latMin: 48.4, latMax: 50.2, lonMin: -4.3, lonMax: -0.4 }, // Manche Ouest
  { code: 'FINIS', dir: 'V1_FINIS', latMin: 47.2, latMax: 49.1, lonMin: -5.7, lonMax: -3.6 }, // Finistère
  { code: 'SUDBZH', dir: 'V1_SUDBZH', latMin: 46.7, latMax: 48.0, lonMin: -4.3, lonMax: -1.9 }, // Sud Bretagne
  { code: 'AQUI', dir: 'V1_AQUI', latMin: 43.2, latMax: 46.9, lonMin: -2.3, lonMax: -0.6 }, // Aquitaine
]

function selectRegion(lat, lon) {
  const match = REGIONS.find((r) => lat >= r.latMin && lat <= r.latMax && lon >= r.lonMin && lon <= r.lonMax)
  if (!match) throw new Error(`Aucun atlas MARC ne couvre (${lat}, ${lon}) — hors façade Manche/Atlantique ?`)
  return match
}

// 38 constituantes présentes dans les atlas MARC, avec leur vitesse angulaire standard
// (degrés/heure) — constantes astronomiques immuables, croisées avec la table de
// référence de @neaps/tide-predictor (openwatersio/neaps, packages/tide-predictor/src/
// constituents/data.json) pour associer les noms abrégés Ifremer (ex: "La2", "Sig1") à
// leurs équivalents standards (Lambda2, Sigma1, ...).
export const CONSTITUENTS = [
  { marcName: '2N2', speed: 27.8953548 },
  { marcName: '2Q1', speed: 12.8542862 },
  { marcName: 'E2', speed: 27.4238338 },
  { marcName: 'J1', speed: 15.5854433 },
  { marcName: 'K1', speed: 15.0410686 },
  { marcName: 'K2', speed: 30.0821373 },
  { marcName: 'KJ2', speed: 30.626512 },
  { marcName: 'KQ1', speed: 16.6834764 },
  { marcName: 'Ki1', speed: 14.5695476 },
  { marcName: 'L2', speed: 29.5284789 },
  { marcName: 'La2', speed: 29.4556253 },
  { marcName: 'M1', speed: 14.4966939 },
  { marcName: 'M2', speed: 28.9841042 },
  { marcName: 'M4', speed: 57.9682085 },
  { marcName: 'M6', speed: 86.9523127 },
  { marcName: 'MK4', speed: 59.0662415 },
  { marcName: 'MN4', speed: 57.4238338 },
  { marcName: 'MP1', speed: 14.0251729 },
  { marcName: 'MS4', speed: 58.9841042 },
  { marcName: 'Mf', speed: 1.098033 },
  { marcName: 'Mm', speed: 0.5443747 },
  { marcName: 'Mu2', speed: 27.9682085 },
  { marcName: 'N2', speed: 28.4397295 },
  { marcName: 'Nu2', speed: 28.5125832 },
  { marcName: 'O1', speed: 13.9430356 },
  { marcName: 'OO1', speed: 16.1391017 },
  { marcName: 'P1', speed: 14.9589314 },
  { marcName: 'Phi1', speed: 15.123206 },
  { marcName: 'Pi1', speed: 14.9178647 },
  { marcName: 'Psi1', speed: 15.0821353 },
  { marcName: 'Q1', speed: 13.3986609 },
  { marcName: 'R2', speed: 30.0410667 },
  { marcName: 'Ro1', speed: 13.4715145 },
  { marcName: 'S2', speed: 30 },
  { marcName: 'Sig1', speed: 12.9271398 },
  { marcName: 'T2', speed: 29.9589333 },
  { marcName: 'Tta1', speed: 15.5125897 },
  { marcName: 'Z0', speed: 0 },
]

// Points à coordonnées vérifiées à la main (port/plage précis, pas un centroïde de commune
// — voir domain/spot.ts). Prioritaires sur les points auto-générés à proximité : gardés
// même s'ils tombent à < MIN_SEPARATION_KM d'un point de scripts/coastal-points.generated.json.
const CURATED_POINTS = [{ name: 'saint-cast-le-guildo', lat: 48.6408354, lon: -2.2449483 }]

const MIN_SEPARATION_KM = 1.5

async function downloadIfMissing(region, component, constituents = CONSTITUENTS) {
  for (const { marcName } of constituents) {
    const remote = `${FTP_ROOT}/${region.dir}/${marcName}-${component}-${region.code}-atlas.nc`
    const local = path.join(CACHE_DIR, `${marcName}-${component}-${region.code}-atlas.nc`)
    if (existsSync(local)) continue
    if (!FTP_USER || !FTP_PASS) {
      throw new Error(`${local} manquant en cache et MARC_FTP_USER/MARC_FTP_PASS non définis pour le télécharger.`)
    }
    await mkdir(path.dirname(local), { recursive: true })
    const url = `ftp://${FTP_USER}:${FTP_PASS}@${FTP_HOST}/${remote}`
    console.log(`téléchargement ${remote}`)
    execFileSync('curl', ['-sf', '-o', local, url], { stdio: 'inherit' })
  }
}

// Z0 (terme moyen/résiduel) n'existe qu'en U/V — la hauteur d'eau est déjà exprimée par
// rapport au niveau moyen local, il n'y a pas d'équivalent "élévation moyenne" publié.
const ELEVATION_CONSTITUENTS = CONSTITUENTS.filter((c) => c.marcName !== 'Z0')

function readNc(file) {
  return new NetCDFReader(readFileSync(file))
}

function attr(reader, varName, attrName) {
  const v = reader.variables.find((v) => v.name === varName)
  const a = v.attributes.find((a) => a.name === attrName)
  return a ? a.value : undefined
}

/**
 * Trouve l'index du point de grille le plus proche d'une cible, en ignorant les points
 * masqués (terre). Les grilles U/V sont stockées en int16 (scale_factor/add_offset) ; la
 * grille T (élévation) est stockée en double brut, sans scale_factor — d'où le `?? 1`/`?? 0`.
 *
 * Borné par la longueur du tableau de DONNÉES (amplitude), pas seulement lon/lat : sur
 * certains fichiers, les tableaux de coordonnées ont un élément de plus que le tableau
 * d'amplitude (décalage constaté sur l'atlas MANE) — sans cette borne, le point le plus
 * proche pouvait tomber sur cet index surnuméraire, valide pour lon/lat mais hors bornes
 * pour l'amplitude (→ NaN, sérialisé en `null` dans le JSON généré).
 */
function nearestIndex(lonRaw, latRaw, ampRaw, lonScale, lonOff, latScale, latOff, ampFill, targetLat, targetLon) {
  const n = Math.min(lonRaw.length, latRaw.length, ampRaw.length)
  let bestIdx = -1
  let bestDist = Infinity
  for (let i = 0; i < n; i++) {
    if (ampRaw[i] === ampFill) continue
    const lon = lonRaw[i] * lonScale + lonOff
    const lat = latRaw[i] * latScale + latOff
    const dLat = lat - targetLat
    const dLon = (lon - targetLon) * Math.cos((targetLat * Math.PI) / 180)
    const dist = dLat * dLat + dLon * dLon
    if (dist < bestDist) {
      bestDist = dist
      bestIdx = i
    }
  }
  return { index: bestIdx, distanceKm: Math.sqrt(bestDist) * 111, lat: latRaw[bestIdx] * latScale + latOff, lon: lonRaw[bestIdx] * lonScale + lonOff }
}

function gridArrays(reader, lonVar, latVar, ampVar) {
  return {
    lonRaw: reader.getDataVariable(lonVar),
    latRaw: reader.getDataVariable(latVar),
    ampRaw: reader.getDataVariable(ampVar),
    lonScale: attr(reader, lonVar, 'scale_factor') ?? 1,
    lonOff: attr(reader, lonVar, 'add_offset') ?? 0,
    latScale: attr(reader, latVar, 'scale_factor') ?? 1,
    latOff: attr(reader, latVar, 'add_offset') ?? 0,
    ampFill: attr(reader, ampVar, '_FillValue'),
  }
}

function findNearest(g, targetLat, targetLon) {
  return nearestIndex(g.lonRaw, g.latRaw, g.ampRaw, g.lonScale, g.lonOff, g.latScale, g.latOff, g.ampFill, targetLat, targetLon)
}

function extractAt(reader, ampVar, phaseVar, index) {
  const ampRaw = reader.getDataVariable(ampVar)
  const phase = reader.getDataVariable(phaseVar)
  const ampScale = attr(reader, ampVar, 'scale_factor') ?? 1
  return { amplitude: ampRaw[index] * ampScale, phase: phase[index] }
}

function haversineKm(a, b) {
  const dLat = a.lat - b.lat
  const dLon = (a.lon - b.lon) * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180))
  return Math.sqrt(dLat * dLat + dLon * dLon) * 111
}

function loadPoints() {
  const auto = JSON.parse(readFileSync('scripts/coastal-points.generated.json', 'utf8'))
  const points = [...CURATED_POINTS]
  for (const a of auto) {
    if (points.some((p) => haversineKm(p, a) < MIN_SEPARATION_KM)) continue // un point vérifié à la main est déjà là
    points.push(a)
  }
  return points
}

/** Traite UNE région (appelé dans un sous-process dédié, voir runOrchestrator) et écrit son
 * résultat partiel — jamais appelé directement pour plusieurs régions dans le même process. */
async function processRegion(region, regionPoints) {
  console.log(`[${region.code}] ${regionPoints.length} points`)
  await downloadIfMissing(region, 'U')
  await downloadIfMissing(region, 'V')
  await downloadIfMissing(region, 'XE', ELEVATION_CONSTITUENTS)

  // Grille identique pour toutes les constituantes (seule la donnée harmonique change) —
  // calculée une fois avec M2, puis réutilisée pour situer chaque point de la région.
  const m2u = gridArrays(readNc(path.join(CACHE_DIR, `M2-U-${region.code}-atlas.nc`)), 'longitude_u', 'latitude_u', 'U_a')
  const m2v = gridArrays(readNc(path.join(CACHE_DIR, `M2-V-${region.code}-atlas.nc`)), 'longitude_v', 'latitude_v', 'V_a')
  const m2xe = gridArrays(readNc(path.join(CACHE_DIR, `M2-XE-${region.code}-atlas.nc`)), 'longitude', 'latitude', 'XE_a')

  const located = regionPoints.map((p) => ({
    point: p,
    uGrid: findNearest(m2u, p.lat, p.lon),
    vGrid: findNearest(m2v, p.lat, p.lon),
    tGrid: findNearest(m2xe, p.lat, p.lon),
    constituents: [],
    elevationConstituents: [],
  }))

  // Un seul passage par fichier de constituante (114 au total pour la région), partagé par
  // tous les points de la région — c'est ce qui rend l'extraction de ~150 points aussi
  // rapide que celle d'un seul point à l'ancienne (relire un fichier de 5-19 Mo par point et
  // par constituante n'aurait pas tenu à cette échelle).
  for (const { marcName, speed } of CONSTITUENTS) {
    const uReader = readNc(path.join(CACHE_DIR, `${marcName}-U-${region.code}-atlas.nc`))
    const vReader = readNc(path.join(CACHE_DIR, `${marcName}-V-${region.code}-atlas.nc`))
    const xeReader = marcName === 'Z0' ? null : readNc(path.join(CACHE_DIR, `${marcName}-XE-${region.code}-atlas.nc`))

    for (const loc of located) {
      const u = extractAt(uReader, 'U_a', 'U_G', loc.uGrid.index)
      const v = extractAt(vReader, 'V_a', 'V_G', loc.vGrid.index)
      loc.constituents.push({ name: marcName, speed, uAmplitude: u.amplitude, uPhase: u.phase, vAmplitude: v.amplitude, vPhase: v.phase })
      if (xeReader) {
        const xe = extractAt(xeReader, 'XE_a', 'XE_G', loc.tGrid.index)
        loc.elevationConstituents.push({ name: marcName, speed, amplitude: xe.amplitude, phase: xe.phase })
      }
    }
  }

  const results = located.map((loc) => ({
    lat: loc.point.lat,
    lon: loc.point.lon,
    gridPoint: {
      uLat: loc.uGrid.lat,
      uLon: loc.uGrid.lon,
      vLat: loc.vGrid.lat,
      vLon: loc.vGrid.lon,
      distanceKm: Math.max(loc.uGrid.distanceKm, loc.vGrid.distanceKm),
    },
    constituents: loc.constituents,
    elevation: {
      gridPoint: { tLat: loc.tGrid.lat, tLon: loc.tGrid.lon, distanceKm: loc.tGrid.distanceKm },
      constituents: loc.elevationConstituents,
    },
  }))

  const invalid = results.filter((r) => r.constituents.some((c) => !Number.isFinite(c.uAmplitude) || !Number.isFinite(c.vAmplitude)))
  if (invalid.length > 0) {
    throw new Error(`[${region.code}] ${invalid.length} point(s) avec une amplitude non finie (NaN) après extraction — bug de correspondance d'index.`)
  }

  console.log(`[${region.code}] terminé (${located.length} points)`)
  return results
}

/** Mode sous-process : traite une seule région et écrit son résultat partiel sur disque. */
async function runRegionWorker(regionCode) {
  const region = REGIONS.find((r) => r.code === regionCode)
  if (!region) throw new Error(`Région inconnue : ${regionCode}`)
  const points = loadPoints().filter((p) => selectRegion(p.lat, p.lon).code === regionCode)
  const results = await processRegion(region, points)
  await writeFile(path.join(CACHE_DIR, `partial-${regionCode}.json`), JSON.stringify(results))
}

/** Mode orchestrateur (défaut) : un sous-process par région, en parallèle — le parsing
 * NetCDF est CPU-bound et mono-thread par nature (netcdfjs), le paralléliser par région est
 * la façon la plus simple d'utiliser plusieurs cœurs sans réécrire le parseur lui-même. */
async function runOrchestrator() {
  const points = loadPoints()
  console.log(`${points.length} points à extraire (${CURATED_POINTS.length} vérifiés à la main + auto-générés)`)

  const regionCodes = [...new Set(points.map((p) => selectRegion(p.lat, p.lon).code))]
  console.log(`${regionCodes.length} régions à traiter en parallèle : ${regionCodes.join(', ')}`)

  await mkdir(CACHE_DIR, { recursive: true })

  await Promise.all(
    regionCodes.map(
      (code) =>
        new Promise((resolve, reject) => {
          const child = spawn(process.execPath, [SCRIPT_PATH, `--region=${code}`], { stdio: 'inherit' })
          child.on('exit', (exitCode) => (exitCode === 0 ? resolve() : reject(new Error(`région ${code} : sous-process en échec (code ${exitCode})`))))
          child.on('error', reject)
        }),
    ),
  )

  const results = regionCodes.flatMap((code) => JSON.parse(readFileSync(path.join(CACHE_DIR, `partial-${code}.json`), 'utf8')))

  const header = `// Généré par scripts/extract-marc-harmonics.mjs — ne pas éditer à la main.
// Source : atlas de composantes harmoniques de courant de marée Ifremer/MARC.
// Citation requise : Pineau-Guillou Lucia (2013). PREVIMER Validation des atlas de
// composantes harmoniques de hauteurs et courants de marée. Rapport Ifremer, 89p.
// http://archimer.ifremer.fr/doc/00157/26801/
import type { MarcAtlasEntry } from './marcCurrent'

export const MARC_CURRENT_ATLAS: MarcAtlasEntry[] = ${JSON.stringify(results)}
`
  await writeFile('src/domain/marcCurrentAtlas.generated.ts', header)
  console.log(`\nécrit src/domain/marcCurrentAtlas.generated.ts (${results.length} points)`)
}

const regionArg = process.argv.find((a) => a.startsWith('--region='))
if (regionArg) {
  await runRegionWorker(regionArg.slice('--region='.length))
} else {
  await runOrchestrator()
}
