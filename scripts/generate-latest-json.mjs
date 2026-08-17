#!/usr/bin/env node
/**
 * Génère releases/desktop/latest.json, le manifeste que le plugin updater Tauri
 * interroge sur GitHub Releases (voir tauri.conf.json > plugins.updater.endpoints)
 * pour savoir si une nouvelle version desktop est disponible.
 *
 * Doit être relancé à CHAQUE nouvelle release Tauri, après `npm run tauri:build`
 * (avec TAURI_SIGNING_PRIVATE_KEY[_PATH] défini pour produire le .sig) et après
 * avoir copié/renommé l'installeur NSIS dans releases/desktop/ — voir
 * mywaves-versioning dans la mémoire du projet pour la procédure complète.
 *
 * Usage : node scripts/generate-latest-json.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'

const GITHUB_REPO = 'Netapick/myWaves'
const { version } = JSON.parse(readFileSync('package.json', 'utf8'))

const sigPath = `src-tauri/target/release/bundle/nsis/myWaves_${version}_x64-setup.exe.sig`
const signature = readFileSync(sigPath, 'utf8').trim()

const manifest = {
  version,
  notes: `Voir CHANGELOG.md — https://github.com/${GITHUB_REPO}/releases/tag/v${version}`,
  pub_date: new Date().toISOString(),
  platforms: {
    'windows-x86_64': {
      signature,
      url: `https://github.com/${GITHUB_REPO}/releases/download/v${version}/myWaves_${version}_tauri_setup.exe`,
    },
  },
}

writeFileSync('releases/desktop/latest.json', JSON.stringify(manifest, null, 2) + '\n')
console.log(`releases/desktop/latest.json généré pour la version ${version}`)
