#!/usr/bin/env node
/**
 * Régénère les sources d'icône de l'app (assets/icon*.png) à partir du logo bateau
 * (Lucide "ship", voir components/common/ShipIcon.tsx et public/favicon.svg — les 3
 * doivent rester visuellement cohérents) — fond bleu #0077b6, icône blanche.
 *
 * `sharp` n'est PAS une dépendance permanente du projet (juste utile pour rasteriser du
 * SVG en PNG) : installer avec `npm install --no-save sharp` avant de lancer ce script.
 *
 * Usage :
 *   npm install --no-save sharp
 *   node scripts/generate-app-icons.mjs
 *   npx @capacitor/assets generate --android \
 *     --iconBackgroundColor '#0077b6' --iconBackgroundColorDark '#0077b6' \
 *     --splashBackgroundColor '#0077b6' --splashBackgroundColorDark '#0d1b2a'
 *   npx cap sync android
 */
import sharp from 'sharp'
import { writeFileSync } from 'node:fs'

const SHIP_PATHS = `
<path d="M12 10.189V14"/>
<path d="M12 2v3"/>
<path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/>
<path d="M19.38 20A11.6 11.6 0 0 0 21 14l-8.188-3.639a2 2 0 0 0-1.624 0L3 14a11.6 11.6 0 0 0 2.81 7.76"/>
<path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
`

const BG = '#0077b6'

function iconSvg({ background, scale, includeBg }) {
  const bgRect = includeBg ? `<rect width="1024" height="1024" rx="${background.rx}" fill="${BG}"/>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
${bgRect}
<g transform="translate(512,512) scale(${scale}) translate(-12,-12)" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
${SHIP_PATHS}
</g>
</svg>`
}

const legacy = iconSvg({ background: { rx: 220 }, scale: 20, includeBg: true })
const foreground = iconSvg({ background: { rx: 0 }, scale: 14, includeBg: false })

writeFileSync('assets/icon.svg', legacy)
writeFileSync('assets/icon-foreground.svg', foreground)

await sharp(Buffer.from(legacy)).png().resize(1024, 1024).toFile('assets/icon.png')
await sharp(Buffer.from(foreground)).png().resize(1024, 1024).toFile('assets/icon-foreground.png')
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: BG } }).png().toFile('assets/icon-background.png')
await sharp(Buffer.from(legacy)).png().resize(1024, 1024).toFile('assets/splash.png')
await sharp({ create: { width: 2732, height: 2732, channels: 4, background: BG } }).png().toFile('assets/splash-dark.png')

console.log('done')
