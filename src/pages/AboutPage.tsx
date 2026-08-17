import { version } from '../../package.json'

export function AboutPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-4 text-sm">
      <h1 className="text-xl font-semibold">À propos</h1>

      <details className="rounded-md border p-3" style={{ borderColor: 'var(--color-bad)' }}>
        <summary className="cursor-pointer font-semibold">⚠️ Aide à la décision, pas une garantie de sécurité</summary>
        <p className="mt-1 text-(--color-text-muted)">
          myWaves affiche des estimations issues de modèles numériques (météo, houle, courants, marée). Ces valeurs
          peuvent s'écarter de la réalité, en particulier près des côtes découpées ou dans les zones à courants
          complexes. Ne vous fiez jamais uniquement à l'app pour décider de plonger : croisez toujours avec votre
          expérience, l'observation sur place et les sources officielles.
        </p>
      </details>

      <section>
        <h2 className="mb-1 font-semibold">Sources de données</h2>
        <ul className="list-disc pl-5 text-(--color-text-muted)">
          <li>
            Vagues, température de surface, courants et marée : <strong>Open-Meteo Marine API</strong>, modèles
            MeteoFrance/ECMWF.
          </li>
          <li>
            Vent : <strong>Open-Meteo Forecast API</strong>, modèles DWD/ECMWF.
          </li>
          <li>
            Niveau d'eau en temps réel à Saint-Malo : <strong>marégraphe SHOM</strong> (réseau REFMAR/RONIM,
            station 410).
          </li>
          <li>
            Carte (température de l'eau, radar, vagues) : <strong>Windy.com</strong>.
          </li>
        </ul>
        <p className="mt-2 text-xs text-(--color-text-muted)">
          Attribution requise par la licence Open-Meteo : données DWD (Deutscher Wetterdienst) via Open-Meteo.com.
        </p>
      </section>

      <details>
        <summary className="mb-1 cursor-pointer font-semibold">Limites connues</summary>
        <ul className="list-disc pl-5 text-(--color-text-muted)">
          <li>
            Le coefficient de marée affiché est le coefficient <strong>officiel</strong> (SHOM, via maree.info —
            voir ci-dessous) pour la journée en cours ; sinon une estimation dérivée de la hauteur d'eau à Brest,
            moins précise.
          </li>
          <li>Les courants ne sont pas affichés à proximité du barrage de la Rance : le modèle météo-marin ne représente pas l'ouvrage, les valeurs y seraient fausses.</li>
          <li>Les étales sont déduites d'un modèle numérique, pas d'observations directes.</li>
          <li>
            La carte Windy.com est intégrée en usage personnel uniquement : Windy réserve son widget aux médias et
            exclut explicitement les applications météo/marine de ce type. Ne pas publier cette app sur un store
            tant que cette carte y figure.
          </li>
        </ul>
      </details>

      <p className="text-xs text-(--color-text-muted)">
        © Julien Gataleta 2026 — Application propriétaire de l'association de plongée{' '}
        <strong className="underline">La Belle Otarie</strong>. · v{version}
      </p>
    </div>
  )
}
