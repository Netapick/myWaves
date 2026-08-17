/**
 * Parse le tableau HTML #MareeJours de maree.info (heures/hauteurs/coefficients de
 * marée pour un port) en une liste d'extrema exploitables par officialTideExtremes.ts.
 *
 * Partagé entre l'app (fetch live, voir api/mareeInfoTable.ts) et le script de
 * maintenance `scripts/refresh-official-tides.mjs` (repli statique regénéré à la
 * main) — même logique, deux façons d'obtenir le HTML en entrée.
 */

export interface ParsedTideExtreme {
  /** "AAAA-MM-JJTHH:mm:ss", heure légale française (Europe/Paris), naïve. */
  localTime: string
  height: number
  coefficient?: number
  isPM: boolean
}

/**
 * Découpe un <td>...</td> en entrées séparées par <br>, avec repérage du <b> (= PM).
 * NE FILTRE PAS les entrées vides ("&nbsp;", placeholder "pas de coefficient ici") :
 * la colonne coefficient DOIT rester alignée positionnellement avec les colonnes
 * heures/hauteurs, sinon les valeurs se décalent d'un cran (bug vécu et corrigé ici).
 */
function splitEntries(tdHtml: string): { isPM: boolean; text: string }[] {
  return tdHtml.split(/<br\s*\/?>/i).map((chunk) => {
    const isBold = /<b[\s>]/i.test(chunk)
    const text = chunk
      .replace(/<\/?b[^>]*>/gi, '')
      .replace(/&nbsp;/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim()
    return { isPM: isBold, text }
  })
}

function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function parseHeightM(text: string): number {
  // "11,06m" -> 11.06
  const n = Number.parseFloat(text.replace('m', '').replace(',', '.'))
  if (Number.isNaN(n)) throw new Error(`hauteur illisible : "${text}"`)
  return n
}

function parseTimeToHms(text: string): string {
  // "11h25" -> "11:25:00"
  const m = /^(\d{1,2})h(\d{2})$/.exec(text)
  if (!m) throw new Error(`heure illisible : "${text}"`)
  return `${m[1].padStart(2, '0')}:${m[2]}:00`
}

/**
 * Parse le tableau HTML #MareeJours (tel que servi par maree.info) en une liste
 * d'extrema {localTime, height, coefficient?, isPM}, triée chronologiquement.
 * `startDateIso` (AAAA-MM-JJ) est la date de la ligne MareeJours_0 ("aujourd'hui"
 * au moment de la génération de la page — toujours vrai pour un fetch live, puisque
 * c'est le serveur qui construit cette ligne au moment de la requête).
 */
export function parseMareeInfoTable(
  html: string,
  startDateIso: string,
): { extrema: ParsedTideExtreme[]; dayCount: number } {
  const rowRegex = /<tr[^>]*\bid="MareeJours_(\d+)"[^>]*>([\s\S]*?)<\/tr>/g
  const results: ParsedTideExtreme[] = []
  let match: RegExpExecArray | null
  let rowCount = 0

  while ((match = rowRegex.exec(html))) {
    const rowIndex = Number(match[1])
    const rowHtml = match[2]
    const tds = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1])
    if (tds.length < 2) continue // ligne d'en-tête ou inattendue, on l'ignore

    const [timesTd, heightsTd, coeffTd] = tds
    const times = splitEntries(timesTd)
    const heights = splitEntries(heightsTd)
    const coeffs = coeffTd ? splitEntries(coeffTd) : []
    if (times.length !== heights.length) {
      throw new Error(`ligne MareeJours_${rowIndex} : ${times.length} heures mais ${heights.length} hauteurs`)
    }

    const isoDate = addDaysIso(startDateIso, rowIndex)
    for (let i = 0; i < times.length; i++) {
      const localTime = `${isoDate}T${parseTimeToHms(times[i].text)}`
      const height = parseHeightM(heights[i].text)
      const coeffEntry = coeffs[i]
      const coefficient = coeffEntry && coeffEntry.text ? Number.parseInt(coeffEntry.text, 10) : undefined
      results.push({ localTime, height, coefficient, isPM: times[i].isPM })
    }
    rowCount++
  }

  if (results.length === 0) {
    throw new Error('aucune ligne "MareeJours_N" trouvée — le tableau a-t-il été copié/servi en entier ?')
  }

  results.sort((a, b) => a.localTime.localeCompare(b.localTime))
  return { extrema: results, dayCount: rowCount }
}

/**
 * Ne garde que les entrées dont la date locale (Europe/Paris) est `todayIso` ou plus
 * tard — élimine les jours déjà terminés d'un instantané de cache éventuellement vieux
 * de plusieurs jours (repli après un échec de fetch prolongé, voir
 * hooks/useOfficialTideExtremes.ts). Chaque jour "expire" ainsi 24h après son début,
 * remplacé par la mesure réelle du marégraphe une fois qu'il est passé (voir
 * domain/sillLevel.ts) — le conserver plus longtemps n'aurait aucune utilité.
 */
export function pruneToTodayAndFuture(extrema: ParsedTideExtreme[], todayIso: string): ParsedTideExtreme[] {
  return extrema.filter((e) => e.localTime.slice(0, 10) >= todayIso)
}

export function formatExtremeArray(extrema: ParsedTideExtreme[]): string {
  const lines = extrema.map((e) => {
    const coeffPart = e.coefficient !== undefined ? `, coefficient: ${e.coefficient}` : ''
    return `  { localTime: '${e.localTime}', height: ${e.height}${coeffPart} }, // ${e.isPM ? 'PM' : 'BM'}`
  })
  return [
    'const SAINT_MALO_OFFICIAL_EXTREMES_SNAPSHOT: { localTime: string; height: number; coefficient?: number }[] = [',
    ...lines,
    ']',
  ].join('\n')
}
