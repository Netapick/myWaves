import { describe, expect, it } from 'vitest'
import { parseMareeInfoTable, formatExtremeArray } from '../src/domain/parseMareeInfoTable.ts'

// Fixture réelle : extrait du HTML #MareeJours copié depuis maree.info/52 le
// 04/08/2026 (fourni par l'utilisateur) — sert de test de non-régression contre le
// bug de décalage d'index découvert en pratique : les "&nbsp;" de la colonne
// coefficient se faisaient filtrer, décalant chaque coefficient d'une case (une BM
// récupérait le coefficient de la PM suivante, et la dernière PM du jour perdait le
// sien).
const SAMPLE_HTML = `
<table id="MareeJours"><tbody>
<tr class="MJE"><th>Date</th><th>Heure</th><th>Hauteur</th><th>Coeff.</th></tr>
<tr class="MJ MJ0 Selected" id="MareeJours_0"><th><a>Mar.<br><b>04</b></a></th><td>06h00<br><b>11h25</b><br>18h11<br><b>23h40</b></td><td>2,36m<br><b>11,06m</b><br>2,80m<br><b>11,01m</b></td><td>&nbsp;<br><b>74</b><br>&nbsp;<br><b>70</b></td></tr>
<tr class="MJ MJ1" id="MareeJours_1"><th><a>Mer.<br><b>05</b></a></th><td>06h33<br><b>12h00</b><br>18h47</td><td>2,82m<br><b>10,62m</b><br>3,29m</td><td>&nbsp;<br><b>66</b><br>&nbsp;</td></tr>
</tbody></table>
`

describe('parseMareeInfoTable', () => {
  it('aligne chaque coefficient sur la bonne pleine mer, pas décalé d’une case', () => {
    const { extrema, dayCount } = parseMareeInfoTable(SAMPLE_HTML, '2026-08-04')
    expect(dayCount).toBe(2)
    expect(extrema).toEqual([
      { localTime: '2026-08-04T06:00:00', height: 2.36, coefficient: undefined, isPM: false },
      { localTime: '2026-08-04T11:25:00', height: 11.06, coefficient: 74, isPM: true },
      { localTime: '2026-08-04T18:11:00', height: 2.8, coefficient: undefined, isPM: false },
      { localTime: '2026-08-04T23:40:00', height: 11.01, coefficient: 70, isPM: true },
      { localTime: '2026-08-05T06:33:00', height: 2.82, coefficient: undefined, isPM: false },
      { localTime: '2026-08-05T12:00:00', height: 10.62, coefficient: 66, isPM: true },
      { localTime: '2026-08-05T18:47:00', height: 3.29, coefficient: undefined, isPM: false },
    ])
  })

  it('assigne les dates par décalage depuis startDateIso, pas par lecture du texte "Mar. 04"', () => {
    const { extrema } = parseMareeInfoTable(SAMPLE_HTML, '2026-12-30')
    expect(extrema[0].localTime.startsWith('2026-12-30')).toBe(true)
    expect(extrema[4].localTime.startsWith('2026-12-31')).toBe(true)
  })

  it('lève une erreur si aucune ligne MareeJours_N n’est trouvée', () => {
    expect(() => parseMareeInfoTable('<div>pas le bon tableau</div>', '2026-08-04')).toThrow()
  })
})

describe('formatExtremeArray', () => {
  it('produit du TypeScript valide, une entrée par ligne, coefficient seulement si défini', () => {
    const { extrema } = parseMareeInfoTable(SAMPLE_HTML, '2026-08-04')
    const source = formatExtremeArray(extrema)
    expect(source).toContain("{ localTime: '2026-08-04T06:00:00', height: 2.36 }, // BM")
    expect(source).toContain("{ localTime: '2026-08-04T11:25:00', height: 11.06, coefficient: 74 }, // PM")
    expect(source.startsWith('const SAINT_MALO_OFFICIAL_EXTREMES_SNAPSHOT:')).toBe(true)
    expect(source.trim().endsWith(']')).toBe(true)
  })
})
