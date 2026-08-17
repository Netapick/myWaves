import { useState } from 'react'
import { useAppUpdate } from '../../hooks/useAppUpdate'

export function UpdateBanner() {
  const update = useAppUpdate()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || (update.status !== 'available' && update.status !== 'installing')) return null

  return (
    <div
      className="mb-4 flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
      style={{ borderColor: 'var(--color-accent)', background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)' }}
    >
      <span>
        {update.status === 'installing' ? 'Installation de la mise à jour…' : `Nouvelle version disponible (v${update.version})`}
      </span>
      {update.status === 'available' && (
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-md px-2 py-1 text-sm text-(--color-text-muted)"
          >
            Plus tard
          </button>
          <button
            type="button"
            onClick={update.install}
            className="rounded-md border px-3 py-1 text-sm font-semibold"
            style={{ borderColor: 'var(--color-accent)' }}
          >
            Mettre à jour
          </button>
        </div>
      )}
    </div>
  )
}
