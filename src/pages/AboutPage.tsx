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
          <li>
            Courant de marée : recalculé localement à partir de l'atlas de composantes harmoniques{' '}
            <strong>Ifremer/MARC</strong> (résolution ~1-2,5 km) pour tout point du littoral Manche/Atlantique
            proche d'un des ~570 points pré-extraits ; sinon Open-Meteo Marine — voir « Limites connues »
            ci-dessous.
          </li>
        </ul>
        <p className="mt-2 text-xs text-(--color-text-muted)">
          Attribution requise par la licence Open-Meteo : données DWD (Deutscher Wetterdienst) via Open-Meteo.com.
        </p>
        <p className="mt-1 text-xs text-(--color-text-muted)">
          Citation requise par Ifremer pour l'atlas MARC : Pineau-Guillou Lucia (2013). PREVIMER Validation des
          atlas de composantes harmoniques de hauteurs et courants de marée. Rapport Ifremer, 89p.{' '}
          <a
            href="http://archimer.ifremer.fr/doc/00157/26801/"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            archimer.ifremer.fr/doc/00157/26801
          </a>
          .
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
          <li>
            Les étales sont déduites d'un modèle numérique, pas d'observations directes. La plupart des spots du
            littoral Manche/Atlantique bénéficient de l'atlas harmonique Ifremer/MARC (point de calcul à quelques
            km du site, souvent moins d'1 km) ; au-delà d'~8 km de tout point pré-extrait, l'app retombe sur
            Open-Meteo Marine, dont la maille est large et le point de calcul utilisé peut se trouver à 15-20 km du
            site réel sur cette côte découpée — sous-estime nettement les courants près des pointes, chenaux et
            embouchures. Dans tous les cas, à recouper avec l'observation sur place ; aucun des deux modèles ne
            capture les effets du vent ou d'ouvrages artificiels (barrage de la Rance).
          </li>
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
