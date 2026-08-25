#!/usr/bin/env node
/**
 * Extrait, pour les spots listés ci-dessous, les composantes harmoniques de courant de
 * marée (amplitude + phase par constituante, pour les vitesses U est-ouest et V nord-sud)
 * depuis l'atlas Ifremer/MARC — résolution ~1-2,5 km, bien plus fine que la maille globale
 * d'Open-Meteo qui peut être à 15-20 km du site réel sur une côte découpée.
 *
 * Couvre toute la façade Manche/Atlantique française via 5 atlas régionaux (leurs
 * emprises se chevauchent légèrement, pas de trou de couverture) : la région est choisie
 * automatiquement pour chaque spot selon ses coordonnées, voir REGIONS ci-dessous.
 *
 * Source : accès FTP obtenu sur demande auprès d'Ifremer (formulaire
 * forms.ifremer.fr/lops-oc/marc-atlas-harmo/, réponse reçue le 2026-08-25 — voir mémoire
 * du projet). Citation requise en cas d'exploitation :
 * Pineau-Guillou Lucia (2013). PREVIMER Validation des atlas de composantes harmoniques
 * de hauteurs et courants de marée. Rapport Ifremer, 89p.
 * http://archimer.ifremer.fr/doc/00157/26801/
 *
 * Les fichiers NetCDF (~76 par région, ~5-12 Mo chacun) sont mis en cache localement dans
 * .marc-cache/ (gitignored) — relancer ce script ne re-télécharge que ce qui manque, et
 * ne télécharge que les régions réellement nécessaires pour les spots listés.
 *
 * Usage :
 *   npm install --no-save netcdfjs
 *   MARC_FTP_USER=... MARC_FTP_PASS=... node scripts/extract-marc-harmonics.mjs
 * Résultat : src/domain/marcCurrentAtlas.generated.ts (committé — ce sont juste des
 * nombres, pas les fichiers NetCDF sources).
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { NetCDFReader } from 'netcdfjs'

// Identifiants FTP Ifremer (obtenus sur demande, voir en-tête ci-dessus) — jamais en dur
// dans le code, ce dépôt est public. Définir MARC_FTP_USER / MARC_FTP_PASS avant de lancer.
const FTP_HOST = 'ftp.ifremer.fr'
const FTP_USER = process.env.MARC_FTP_USER
const FTP_PASS = process.env.MARC_FTP_PASS
const FTP_ROOT = 'MARC_L1-ATLAS-AHRMONIQUES'
const CACHE_DIR = '.marc-cache'

if (!FTP_USER || !FTP_PASS) {
  console.error('MARC_FTP_USER et MARC_FTP_PASS doivent être définis (identifiants reçus par email d’Ifremer).')
  process.exit(1)
}

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

// Spots pour lesquels on extrait un tableau harmonique local. Sablons n'y figure PAS
// délibérément : sous influence du barrage de la Rance, un atlas de marée océanique
// (naturelle) ne peut de toute façon pas représenter le rejet artificiel de l'usine
// marémotrice — voir RanceWarning.tsx. Pour ajouter un spot : lui donner ses coordonnées
// ici et relancer ce script (ne télécharge que la région manquante, le reste est en cache).
const SPOTS = [{ id: 'saint-cast-le-guildo', lat: 48.6241, lon: -2.2618 }]

async function downloadIfMissing(region, component) {
  for (const { marcName } of CONSTITUENTS) {
    const remote = `${FTP_ROOT}/${region.dir}/${marcName}-${component}-${region.code}-atlas.nc`
    const local = path.join(CACHE_DIR, `${marcName}-${component}-${region.code}-atlas.nc`)
    if (existsSync(local)) continue
    await mkdir(path.dirname(local), { recursive: true })
    const url = `ftp://${FTP_USER}:${FTP_PASS}@${FTP_HOST}/${remote}`
    console.log(`téléchargement ${remote}`)
    execFileSync('curl', ['-sf', '-o', local, url], { stdio: 'inherit' })
  }
}

function readNc(file) {
  return new NetCDFReader(readFileSync(file))
}

function attr(reader, varName, attrName) {
  const v = reader.variables.find((v) => v.name === varName)
  const a = v.attributes.find((a) => a.name === attrName)
  return a ? a.value : undefined
}

/** Trouve l'index du point de grille le plus proche d'une cible, en ignorant les points masqués (terre). */
function nearestIndex(reader, lonVar, latVar, ampVar, targetLat, targetLon) {
  const lonRaw = reader.getDataVariable(lonVar)
  const latRaw = reader.getDataVariable(latVar)
  const ampRaw = reader.getDataVariable(ampVar)
  const lonScale = attr(reader, lonVar, 'scale_factor')
  const lonOff = attr(reader, lonVar, 'add_offset')
  const latScale = attr(reader, latVar, 'scale_factor')
  const latOff = attr(reader, latVar, 'add_offset')
  const ampFill = attr(reader, ampVar, '_FillValue')

  let bestIdx = -1
  let bestDist = Infinity
  for (let i = 0; i < lonRaw.length; i++) {
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

function extractAt(reader, ampVar, phaseVar, index) {
  const ampRaw = reader.getDataVariable(ampVar)
  const phase = reader.getDataVariable(phaseVar)
  const ampScale = attr(reader, ampVar, 'scale_factor')
  return { amplitude: ampRaw[index] * ampScale, phase: phase[index] }
}

async function main() {
  const results = {}
  for (const spot of SPOTS) {
    const region = selectRegion(spot.lat, spot.lon)
    await downloadIfMissing(region, 'U')
    await downloadIfMissing(region, 'V')

    // Le point de grille le plus proche est le même pour toutes les constituantes (seule
    // la donnée harmonique change, pas la grille du modèle) — calculé une fois avec M2.
    const m2u = readNc(path.join(CACHE_DIR, `M2-U-${region.code}-atlas.nc`))
    const m2v = readNc(path.join(CACHE_DIR, `M2-V-${region.code}-atlas.nc`))
    const uGrid = nearestIndex(m2u, 'longitude_u', 'latitude_u', 'U_a', spot.lat, spot.lon)
    const vGrid = nearestIndex(m2v, 'longitude_v', 'latitude_v', 'V_a', spot.lat, spot.lon)
    console.log(`${spot.id}: région ${region.code}, grille U à ${uGrid.distanceKm.toFixed(2)} km, grille V à ${vGrid.distanceKm.toFixed(2)} km`)

    const constituents = []
    for (const { marcName, speed } of CONSTITUENTS) {
      const u = extractAt(readNc(path.join(CACHE_DIR, `${marcName}-U-${region.code}-atlas.nc`)), 'U_a', 'U_G', uGrid.index)
      const v = extractAt(readNc(path.join(CACHE_DIR, `${marcName}-V-${region.code}-atlas.nc`)), 'V_a', 'V_G', vGrid.index)
      constituents.push({ name: marcName, speed, uAmplitude: u.amplitude, uPhase: u.phase, vAmplitude: v.amplitude, vPhase: v.phase })
    }

    results[spot.id] = {
      gridPoint: { uLat: uGrid.lat, uLon: uGrid.lon, vLat: vGrid.lat, vLon: vGrid.lon, distanceKm: Math.max(uGrid.distanceKm, vGrid.distanceKm) },
      constituents,
    }
  }

  const header = `// Généré par scripts/extract-marc-harmonics.mjs — ne pas éditer à la main.
// Source : atlas de composantes harmoniques de courant de marée Ifremer/MARC.
// Citation requise : Pineau-Guillou Lucia (2013). PREVIMER Validation des atlas de
// composantes harmoniques de hauteurs et courants de marée. Rapport Ifremer, 89p.
// http://archimer.ifremer.fr/doc/00157/26801/
import type { MarcHarmonicTable } from './marcCurrent'

export const MARC_CURRENT_ATLAS: Record<string, MarcHarmonicTable> = ${JSON.stringify(results, null, 2)}
`
  await writeFile('src/domain/marcCurrentAtlas.generated.ts', header)
  console.log('écrit src/domain/marcCurrentAtlas.generated.ts')
}

main()
