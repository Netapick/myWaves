import { afterEach, describe, expect, it, vi } from 'vitest'
import { CapacitorHttp } from '@capacitor/core'

vi.mock('@capacitor/core', () => ({ CapacitorHttp: { get: vi.fn() } }))

// Deux jours dans la page (comme le sert vraiment maree.info) : le jour courant
// (MareeJours_0) et le lendemain (MareeJours_1).
const SAMPLE_HTML = `
<table id="MareeJours"><tbody>
<tr class="MJE"><th>Date</th><th>Heure</th><th>Hauteur</th><th>Coeff.</th></tr>
<tr class="MJ MJ0 Selected" id="MareeJours_0"><th><a>Mar.<br><b>04</b></a></th><td>06h00<br><b>11h25</b><br>18h11<br><b>23h40</b></td><td>2,36m<br><b>11,06m</b><br>2,80m<br><b>11,01m</b></td><td>&nbsp;<br><b>74</b><br>&nbsp;<br><b>70</b></td></tr>
<tr class="MJ MJ1" id="MareeJours_1"><th><a>Mer.<br><b>05</b></a></th><td>06h33<br><b>12h00</b><br>18h47</td><td>2,82m<br><b>10,62m</b><br>3,29m</td><td>&nbsp;<br><b>66</b><br>&nbsp;</td></tr>
</tbody></table>
`

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('fetchMareeInfoExtremes', () => {
  it('garde tous les jours renvoyés (aujourd’hui et les suivants), pas seulement le jour courant', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-04T10:00:00Z')) // 12h locale (Europe/Paris, UTC+2 en août)
    vi.mocked(CapacitorHttp.get).mockResolvedValue({ status: 200, data: SAMPLE_HTML } as never)

    const { fetchMareeInfoExtremes } = await import('./mareeInfoTable')
    const extrema = await fetchMareeInfoExtremes()

    expect(extrema).toHaveLength(7)
    expect(extrema.filter((e) => e.localTime.startsWith('2026-08-04'))).toHaveLength(4)
    expect(extrema.filter((e) => e.localTime.startsWith('2026-08-05'))).toHaveLength(3)
  })

  it('rejette si la réponse HTTP n’est pas 200', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-04T10:00:00Z'))
    vi.mocked(CapacitorHttp.get).mockResolvedValue({ status: 503, data: '' } as never)

    const { fetchMareeInfoExtremes } = await import('./mareeInfoTable')
    await expect(fetchMareeInfoExtremes()).rejects.toThrow('503')
  })
})
