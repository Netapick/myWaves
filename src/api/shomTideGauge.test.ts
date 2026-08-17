import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchShomObservations, fetchShomRecent } from './shomTideGauge'

function mockFetchOnce(body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => body,
  } as Response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchShomObservations — borne dtEnd', () => {
  // Vérifié en direct contre l'API réelle : dtEnd est une borne EXCLUSIVE (minuit UTC
  // de cette date), pas inclusive. Une requête `dtEnd=<date de fin>` sans décalage
  // exclurait donc systématiquement toute la journée en cours — c'est le bug qui faisait
  // paraître le marégraphe "figé à minuit" quelle que soit l'heure réelle de consultation.
  it("demande le lendemain de `end` comme dtEnd, pour ne jamais exclure la journée en cours", async () => {
    const fetchMock = mockFetchOnce({ data: [] })
    const start = new Date('2026-08-03T00:00:00Z')
    const end = new Date('2026-08-04T09:31:14Z') // milieu de journée, pas minuit

    await fetchShomObservations(410, start, end)

    const requestedUrl = fetchMock.mock.calls[0][0] as string
    const params = new URL(requestedUrl).searchParams
    expect(params.get('dtStart')).toBe('2026-08-03')
    expect(params.get('dtEnd')).toBe('2026-08-05') // lendemain de `end`, pas la date de `end`
  })

  it('fetchShomRecent construit sa fenêtre autour de "maintenant" avec le même décalage', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-04T09:31:14Z'))
    const fetchMock = mockFetchOnce({ data: [] })

    await fetchShomRecent(410, 30)

    const requestedUrl = fetchMock.mock.calls[0][0] as string
    const params = new URL(requestedUrl).searchParams
    expect(params.get('dtEnd')).toBe('2026-08-05')
    vi.useRealTimers()
  })
})
