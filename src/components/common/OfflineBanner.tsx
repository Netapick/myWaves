import { formatRelativeAge } from '../../lib/format'

interface OfflineBannerProps {
  fetchedAt: number
}

/**
 * Bandeau de fraîcheur des données — affiché uniquement quand la donnée vient du
 * cache (réseau indisponible). Ne jamais présenter une donnée périmée comme fraîche.
 */
export function OfflineBanner({ fetchedAt }: OfflineBannerProps) {
  return (
    <div
      className="rounded-md border px-3 py-2 text-sm"
      style={{ borderColor: 'var(--color-warn)', background: 'color-mix(in srgb, var(--color-warn) 12%, transparent)' }}
    >
      📡 Hors-ligne — données du {formatRelativeAge(fetchedAt)}
    </div>
  )
}
