/**
 * ECharts peint sur canvas (zrender) et ne résout pas les variables CSS (`var(--...)`),
 * contrairement au SVG/DOM (cf. WindCompass). On lit donc le thème une seule fois via
 * `prefers-color-scheme`, pour les rares endroits qui ont besoin d'un fond opaque —
 * ex. le callout "maintenant" superposé à la courbe, pour rester lisible dessus.
 * Partagé entre TideChart et GaugeChart plutôt que dupliqué dans chaque fichier.
 */
export const prefersDarkScheme = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches

export const CHART_CALLOUT_BG = prefersDarkScheme ? 'rgba(18, 34, 44, 0.92)' : 'rgba(255, 255, 255, 0.92)'
export const CHART_CALLOUT_TEXT = prefersDarkScheme ? '#e7f1f5' : '#12232e'
