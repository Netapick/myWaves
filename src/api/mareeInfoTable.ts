import { CapacitorHttp } from '@capacitor/core'
import { formatInTimeZone } from 'date-fns-tz'
import { parseMareeInfoTable, pruneToTodayAndFuture, type ParsedTideExtreme } from '../domain/parseMareeInfoTable'

/**
 * ⚠️ CONTOURNEMENT DÉLIBÉRÉ DES CGU DE maree.info — voir le commentaire détaillé en
 * tête de domain/officialTideExtremes.ts pour le contexte complet et la décision
 * explicite de l'utilisateur. Résumé : maree.info interdit explicitement l'extraction
 * automatisée ("Le site web n'est pas une API pour en extraire les données de manière
 * automatique") ; ce module le fait quand même, pour un usage strictement personnel,
 * jamais publié. Empreinte volontairement minimisée côté FRÉQUENCE : 1 seul appel/24h
 * (voir hooks/useOfficialTideExtremes.ts) — la page renvoie ~7 jours à chaque fois
 * (impossible d'en demander moins au site), sans requête supplémentaire pour ça. Toute
 * la semaine renvoyée est conservée en cache (pas seulement le jour courant, voir
 * historique) : chaque jour y reste jusqu'à ce qu'il soit terminé, puis est purgé — voir
 * `pruneToTodayAndFuture` et la purge quotidienne dans useOfficialTideExtremes.ts.
 *
 * On utilise CapacitorHttp (le pont réseau natif de Capacitor) plutôt que `fetch` :
 * maree.info ne renvoie pas d'en-tête Access-Control-Allow-Origin (vérifié en
 * pratique), donc un `fetch` classique depuis le navigateur serait bloqué par CORS.
 * CapacitorHttp contourne cette limite CÔTÉ NATIF (Android/iOS) en passant par la
 * couche HTTP du système — mais PAS en mode web (le serveur de dev `npm run dev`
 * dans un navigateur), où il retombe sur un `fetch` classique et échoue donc de la
 * même façon. C'est attendu : le hook appelant (useOfficialTideExtremes) gère cet
 * échec comme n'importe quelle autre panne réseau, avec repli sur le cache puis sur
 * l'instantané statique. Seul un test sur l'app Android réelle (build + install)
 * vérifie effectivement le contournement CORS.
 */
const MAREE_INFO_URL = 'https://maree.info/52'

/** Date du jour en heure légale française — correspond toujours à la ligne "MareeJours_0" de la page au moment du fetch. */
export function todayIsoInParis(): string {
  return formatInTimeZone(new Date(), 'Europe/Paris', 'yyyy-MM-dd')
}

export async function fetchMareeInfoExtremes(): Promise<ParsedTideExtreme[]> {
  const response = await CapacitorHttp.get({
    url: MAREE_INFO_URL,
    responseType: 'text',
    headers: { Accept: 'text/html' },
    connectTimeout: 15_000,
    readTimeout: 15_000,
  })
  if (response.status !== 200) {
    throw new Error(`Réponse HTTP ${response.status} pour ${MAREE_INFO_URL}`)
  }
  const html: string = typeof response.data === 'string' ? response.data : String(response.data)
  const todayIso = todayIsoInParis()
  const { extrema } = parseMareeInfoTable(html, todayIso)
  // MareeJours_0 est toujours "aujourd'hui" par construction (c'est le serveur qui la
  // génère au moment de la requête) : ce filtre est donc surtout défensif ici (le vrai
  // usage utile est la purge des jours déjà écoulés d'un cache repris tel quel, voir
  // useOfficialTideExtremes.ts).
  return pruneToTodayAndFuture(extrema, todayIso)
}
