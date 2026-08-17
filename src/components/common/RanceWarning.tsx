/**
 * Avertissement affiché sur les spots proches de l'embouchure de la Rance.
 * L'usine marémotrice génère de très forts courants (jusqu'à 9 600 m³/s aux vannes)
 * que le modèle océanique global (maille ~9 km) ne représente pas du tout — les
 * courants qu'il annoncerait y seraient structurellement faux, pas juste imprécis.
 * On préfère ne rien afficher plutôt qu'un chiffre trompeur.
 */
export function RanceWarning() {
  return (
    <div
      className="rounded-md border p-3 text-sm"
      style={{ borderColor: 'var(--color-bad)', background: 'color-mix(in srgb, var(--color-bad) 10%, transparent)' }}
    >
      <p className="font-semibold">⚠️ Secteur sous influence du barrage de la Rance</p>
    </div>
  )
}
