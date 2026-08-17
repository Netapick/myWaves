import { NavLink } from 'react-router-dom'
import { ShipIcon } from '../common/ShipIcon'

const LINKS = [
  { to: '/', label: 'Spots', end: true },
  { to: '/sablons', label: 'Seuil Sablons' },
  { to: '/carte', label: 'Cartes' },
  { to: '/liens', label: 'Liens utiles' },
  { to: '/reglages', label: 'Réglages' },
  { to: '/a-propos', label: 'À propos' },
]

export function NavBar() {
  return (
    <nav
      className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b px-3 py-2"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
    >
      <span className="mr-3 flex items-center gap-1.5 font-semibold">
        <ShipIcon size={20} />
        myWaves
      </span>
      {LINKS.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.end}
          className={({ isActive }) =>
            `rounded-md px-2.5 py-1 text-sm ${isActive ? 'font-semibold' : 'text-(--color-text-muted)'}`
          }
          style={({ isActive }) => (isActive ? { background: 'color-mix(in srgb, var(--color-accent) 15%, transparent)' } : undefined)}
        >
          {l.label}
        </NavLink>
      ))}
    </nav>
  )
}
