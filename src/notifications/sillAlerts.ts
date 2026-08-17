import { LocalNotifications } from '@capacitor/local-notifications'
import type { findAllThresholdCrossings } from '../domain/sillLevel'

/**
 * Programme les alertes de seuil du Port des Sablons via les notifications locales
 * natives (AlarmManager Android), PAS via une tâche de fond qui sonderait le
 * marégraphe en continu — Android tue ce genre de tâche, ce qui rendrait l'alerte
 * peu fiable. On programme donc à l'avance toute la fenêtre glissante de 7 jours,
 * et on rappelle cette fonction à chaque ouverture de l'app pour la recaler sur la
 * dernière prévision (voir domain/sillLevel.ts `calibrateForecastToGauge`).
 */

/** Plage d'identifiants réservée aux alertes de seuil, pour pouvoir toutes les annuler proprement. */
const SILL_ALERT_ID_BASE = 100_000
const SILL_ALERT_ID_RANGE = 10_000 // couvre largement 7 jours de franchissements possibles

export async function requestNotificationPermission(): Promise<boolean> {
  const result = await LocalNotifications.requestPermissions()
  return result.display === 'granted'
}

function idForCrossingTime(time: Date): number {
  // Minutes depuis epoch, repliées dans la plage réservée : suffisamment stable et
  // unique sur une fenêtre de quelques jours pour servir d'identifiant Android (int32).
  const minutesSinceEpoch = Math.floor(time.getTime() / 60_000)
  return SILL_ALERT_ID_BASE + (minutesSinceEpoch % SILL_ALERT_ID_RANGE)
}

/** Annule toutes les alertes de seuil précédemment programmées (avant d'en reprogrammer de fraîches). */
export async function cancelAllSillAlerts(): Promise<void> {
  const pending = await LocalNotifications.getPending()
  const ours = pending.notifications.filter(
    (n) => n.id >= SILL_ALERT_ID_BASE && n.id < SILL_ALERT_ID_BASE + SILL_ALERT_ID_RANGE,
  )
  if (ours.length > 0) {
    await LocalNotifications.cancel({ notifications: ours.map((n) => ({ id: n.id })) })
  }
}

type Crossing = ReturnType<typeof findAllThresholdCrossings>[number]

/**
 * Reprogramme la fenêtre d'alertes à partir des franchissements calculés par
 * `findAllThresholdCrossings`. Ne notifie que les passages en DESCENTE sous le seuil
 * d'alerte (le cas qui compte pour la sécurité) ; les instants passés sont ignorés.
 */
export async function scheduleSillAlerts(crossings: Crossing[], alertClearanceM: number): Promise<void> {
  await cancelAllSillAlerts()

  const now = Date.now()
  const upcoming = crossings.filter((c) => c.direction === 'falling' && c.time.getTime() > now)
  if (upcoming.length === 0) return

  await LocalNotifications.schedule({
    notifications: upcoming.map((c) => ({
      id: idForCrossingTime(c.time),
      title: '⚠️ ALERTE SEUIL',
      body: `Seuil des Sablons — passage sous ${alertClearanceM.toFixed(2)} m au-dessus du seuil prévu à ${formatHm(c.time)}.`,
      schedule: { at: c.time, allowWhileIdle: true },
    })),
  })
}

function formatHm(d: Date): string {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })
}
