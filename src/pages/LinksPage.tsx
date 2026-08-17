import { RanceWarning } from '../components/common/RanceWarning'

const LINKS = [
  {
    category: 'Vent & météo marine',
    items: [
      { name: 'Windguru — Saint-Malo', url: 'https://www.windguru.cz/112' },
      { name: 'Météo-France — Bulletin marine', url: 'https://meteofrance.com/meteo-marine' },
    ],
  },
  {
    category: 'Saint-Malo',
    items: [
      { name: 'Webcams de la Ville de Saint-Malo', url: 'https://www.ville-saint-malo.fr/webcams/' },
      { name: 'Guide du Port de Saint-Malo 2026 (guide-du-port.com)', url: 'https://issuu.com/editionsarmoric/docs/port_saint-malo_2026_web_70480fae445b0c' },
      { name: 'Écluses & Port Vauban (saintmalo-cancale.port.bzh)', url: 'https://saintmalo-cancale.port.bzh' },
    ],
  },
  {
    category: 'Saint-Cast-le-Guildo',
    items: [{ name: 'Guide du Port de Saint-Cast 2026 (guide-du-port.com)', url: 'https://issuu.com/editionsarmoric/docs/gport_saint_cast_2026_2a4453d370f31f' }],
  },
  {
    category: 'Barrage de la Rance (EDF)',
    items: [
      { name: 'Niveaux & horaires d’éclusage de la Rance (mis à jour le jeudi soir)', url: 'https://www.edf.fr/usine-maremotrice-rance/marees-en-rance' },
    ],
  },
  {
    category: 'Navigation & sécurité',
    items: [
      { name: 'MarineTraffic — trafic maritime', url: 'https://www.marinetraffic.com' },
      { name: 'Affaires maritimes — Bretagne', url: 'https://www.bretagne-info-nautisme.fr' },
    ],
  },
]

export function LinksPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Liens utiles</h1>
      <p className="text-sm text-(--color-text-muted)">
        Les outils réellement utilisés par les navigateurs de la baie de Saint-Malo — utile en complément de l'app,
        en particulier pour tout ce que myWaves ne modélise pas (voir avertissement ci-dessous).
      </p>

      <RanceWarning />

      {LINKS.map((section) => (
        <div key={section.category}>
          <h2 className="mb-2 text-sm font-semibold text-(--color-text-muted)">{section.category}</h2>
          <ul className="flex flex-col gap-1.5">
            {section.items.map((item) => (
              <li key={item.url}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm underline"
                  style={{ color: 'var(--color-accent)' }}
                >
                  {item.name} ↗
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
