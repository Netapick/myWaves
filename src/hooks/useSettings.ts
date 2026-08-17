import { useCallback, useEffect, useState } from 'react'
import { getSetting, setSetting, SETTINGS_KEYS } from '../db'
import { DEFAULT_SILL_HEIGHT_M } from '../domain/sillLevel'
import { DEFAULT_SLACK_THRESHOLD_KMH } from '../domain/slackWindows'

export interface AppSettings {
  sillHeightM: number
  sillAlertClearanceM: number
  slackThresholdKmh: number
  sillAlertsEnabled: boolean
}

const DEFAULTS: AppSettings = {
  sillHeightM: DEFAULT_SILL_HEIGHT_M,
  sillAlertClearanceM: 0.5,
  slackThresholdKmh: DEFAULT_SLACK_THRESHOLD_KMH,
  sillAlertsEnabled: false,
}

/** Réglages persistés (Dexie), avec valeurs par défaut sûres tant qu'ils ne sont pas chargés. */
export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [sillHeightM, sillAlertClearanceM, slackThresholdKmh, sillAlertsEnabled] = await Promise.all([
        getSetting(SETTINGS_KEYS.sillHeightM, DEFAULTS.sillHeightM),
        getSetting(SETTINGS_KEYS.sillAlertClearanceM, DEFAULTS.sillAlertClearanceM),
        getSetting(SETTINGS_KEYS.slackThresholdKmh, DEFAULTS.slackThresholdKmh),
        getSetting(SETTINGS_KEYS.sillAlertsEnabled, DEFAULTS.sillAlertsEnabled),
      ])
      if (!cancelled) {
        setSettings({ sillHeightM, sillAlertClearanceM, slackThresholdKmh, sillAlertsEnabled })
        setLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const update = useCallback(async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    await setSetting(SETTINGS_KEYS[key], value)
    setSettings((prev) => ({ ...prev, [key]: value }))
  }, [])

  return { settings, loaded, update }
}
