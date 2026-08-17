#!/usr/bin/env node
/**
 * Génère l'icône de la barre de statut Android pour les notifications myWaves — un
 * silhouette blanc du logo bateau (voir components/common/ShipIcon.tsx) SANS fond :
 * Android impose ce style (silhouette blanche sur transparent, retintée par le
 * système) pour les icônes de notification, contrairement à l'icône de lancement qui,
 * elle, garde son fond bleu (voir scripts/generate-app-icons.mjs).
 *
 * `sharp` n'est pas une dépendance permanente : `npm install --no-save sharp` avant de
 * lancer ce script. Usage : `node scripts/generate-notification-icon.mjs`, puis
 * `npx cap sync android`.
 */
import sharp from 'sharp'

const SHIP_PATHS = `
<path d="M12 10.189V14"/>
<path d="M12 2v3"/>
<path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/>
<path d="M19.38 20A11.6 11.6 0 0 0 21 14l-8.188-3.639a2 2 0 0 0-1.624 0L3 14a11.6 11.6 0 0 0 2.81 7.76"/>
<path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
`

function svg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
${SHIP_PATHS}
</svg>`
}

// Tailles recommandées Android pour une icône de notification (24dp de base).
const DENSITIES = {
  mdpi: 24,
  hdpi: 36,
  xhdpi: 48,
  xxhdpi: 72,
  xxxhdpi: 96,
}

for (const [density, size] of Object.entries(DENSITIES)) {
  const outPath = `android/app/src/main/res/drawable-${density}/ic_stat_ship.png`
  await sharp(Buffer.from(svg(size))).png().resize(size, size).toFile(outPath)
  console.log(`wrote ${outPath} (${size}x${size})`)
}
