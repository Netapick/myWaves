interface RefreshButtonProps {
  onRefresh: () => void
  isRefreshing?: boolean
  label?: string
}

/** Bouton d'actualisation manuelle — complète le rafraîchissement automatique périodique
 * pour les cas où l'utilisateur veut une donnée à jour immédiatement (ex. avant de partir). */
export function RefreshButton({ onRefresh, isRefreshing = false, label = 'Actualiser' }: RefreshButtonProps) {
  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={isRefreshing}
      aria-label={label}
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-1 text-xs disabled:opacity-50"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <span className={isRefreshing ? 'inline-block animate-spin' : 'inline-block'}>↻</span>
      {label}
    </button>
  )
}
