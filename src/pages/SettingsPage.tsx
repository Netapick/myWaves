import { useSettings } from '../hooks/useSettings'

export function SettingsPage() {
  const { settings, loaded, update } = useSettings()

  if (!loaded) return <p className="text-sm text-(--color-text-muted)">Chargement des réglages…</p>

  return (
    <div className="flex max-w-md flex-col gap-6">
      <h1 className="text-xl font-semibold">Réglages</h1>

      <Field
        label="Hauteur du seuil du Port des Sablons"
        help="Au-dessus du zéro hydrographique. L'envasement fait varier cette valeur — ajustez-la si le panneau lumineux du port diverge de l'app."
        value={settings.sillHeightM}
        step={0.05}
        unit="m"
        onChange={(v) => update('sillHeightM', v)}
      />

      <Field
        label="Seuil d'alerte"
        help="L'app signale les passages sous cette hauteur au-dessus du seuil."
        value={settings.sillAlertClearanceM}
        step={0.1}
        unit="m"
        onChange={(v) => update('sillAlertClearanceM', v)}
      />
    </div>
  )
}

function Field({
  label,
  help,
  value,
  step,
  unit,
  onChange,
}: {
  label: string
  help: string
  value: number
  step: number
  unit: string
  onChange: (v: number) => void
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-28 rounded-md border px-2 py-1.5 text-sm"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
        />
        <span className="text-sm text-(--color-text-muted)">{unit}</span>
      </div>
      <span className="text-xs text-(--color-text-muted)">{help}</span>
    </label>
  )
}
