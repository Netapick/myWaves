#!/usr/bin/env node
/**
 * Régénère le SAINT_MALO_OFFICIAL_EXTREMES_SNAPSHOT de src/domain/officialTideExtremes.ts
 * (le filet de sécurité statique, utilisé seulement si le fetch live échoue sans cache —
 * voir hooks/useOfficialTideExtremes.ts) à partir du tableau HTML "MareeJours" copié
 * depuis https://maree.info/52.
 *
 * NE FAIT AUCUNE REQUÊTE RÉSEAU — ce script attend un fichier HTML déjà sauvegardé par
 * un humain, pas une URL : la consultation du site reste manuelle. (L'app elle-même
 * fait, séparément, un fetch live automatisé — voir api/mareeInfoTable.ts — mais ce
 * script-ci n'a jamais eu besoin d'en faire un.)
 *
 * Usage :
 *   1. Ouvrir https://maree.info/52 dans un navigateur.
 *   2. Dans les outils de dev, copier le HTML de l'élément #MareeJours_Content
 *      (ou de la page entière — le script cherche le tableau #MareeJours dedans).
 *   3. Coller dans un fichier, ex. maree.html.
 *   4. node scripts/refresh-official-tides.mjs maree.html 2026-08-04
 *      (le 2e argument est la date du premier jour du tableau — la ligne
 *      MareeJours_0, "aujourd'hui" au moment de la consultation)
 *   5. Vérifier le diff de src/domain/officialTideExtremes.ts avant de committer.
 *
 * La logique de parsing pure (`parseMareeInfoTable`/`formatExtremeArray`) vit dans
 * src/domain/parseMareeInfoTable.ts, partagée avec le fetch live de l'app — ce script
 * ne fait qu'importer ce module (Node 24 sait charger un .ts directement, types
 * effacés à la volée) et piloter la lecture/écriture de fichiers autour.
 */
import { parseMareeInfoTable, formatExtremeArray } from '../src/domain/parseMareeInfoTable.ts'
import { pathToFileURL } from 'node:url'

function addDaysIso(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// --- Pilotage CLI (fichiers réels, process.exit) — ignoré quand ce module est importé ---
// pathToFileURL (plutôt qu'un remplacement de chaîne à la main) gère correctement les
// chemins Windows (lettre de lecteur -> "file:///C:/..." avec 3 slashs, pas 2).
const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMainModule) {
  const { readFileSync, writeFileSync } = await import('node:fs')
  const { fileURLToPath } = await import('node:url')
  const { dirname, join } = await import('node:path')

  const __dirname = dirname(fileURLToPath(import.meta.url))
  const OUTPUT_PATH = join(__dirname, '..', 'src', 'domain', 'officialTideExtremes.ts')

  function fail(message) {
    console.error(`Erreur : ${message}`)
    process.exit(1)
  }

  const [, , htmlPath, startDateArg] = process.argv
  if (!htmlPath || !startDateArg) {
    fail('usage : node scripts/refresh-official-tides.mjs <fichier.html> <AAAA-MM-JJ>')
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDateArg)) {
    fail(`date invalide "${startDateArg}", attendu AAAA-MM-JJ`)
  }

  let html
  try {
    html = readFileSync(htmlPath, 'utf-8')
  } catch (e) {
    fail(`impossible de lire ${htmlPath} (${e.message})`)
  }

  let parsed
  try {
    parsed = parseMareeInfoTable(html, startDateArg)
  } catch (e) {
    fail(e.message)
  }

  let current
  try {
    current = readFileSync(OUTPUT_PATH, 'utf-8')
  } catch (e) {
    fail(`impossible de lire ${OUTPUT_PATH} (${e.message}) — le fichier doit déjà exister`)
  }

  const arrayRegex = /const SAINT_MALO_OFFICIAL_EXTREMES_SNAPSHOT: \{[^}]*\}\[\] = \[[\s\S]*?\n\]/
  if (!arrayRegex.test(current)) {
    fail('motif SAINT_MALO_OFFICIAL_EXTREMES_SNAPSHOT introuvable dans officialTideExtremes.ts — a-t-il été renommé ?')
  }

  const updated = current.replace(arrayRegex, formatExtremeArray(parsed.extrema))
  writeFileSync(OUTPUT_PATH, updated, 'utf-8')

  const endDate = addDaysIso(startDateArg, parsed.dayCount - 1)
  console.log(
    `✅ ${parsed.extrema.length} extrema (${parsed.dayCount} jours, ${startDateArg} → ${endDate}) écrits dans ${OUTPUT_PATH}`,
  )
  console.log('   Vérifiez le diff (git diff) avant de committer.')
}
