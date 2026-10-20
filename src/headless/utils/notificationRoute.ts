import { resolveTriState } from './triState'
import type { NotificationRoute, NotificationRouteInput } from './notificationRouteTypes'

const DROPPED: NotificationRoute = { show: null, sound: false, closeAfterMs: null }

/**
 * Where one event's notification goes under the person's Notifications settings: its category
 * (with the active project's override), the OS toggle and permission, whether the app is in
 * front, the sounds toggle and the display duration. Shared by every client, so a setting
 * means the same thing on each.
 */
export function routeNotification(input: NotificationRouteInput): NotificationRoute {
  const { prefs, projectOverrides, category, permission, foreground, inAppWhenForeground } = input
  if (!resolveTriState(prefs.categories[category] ?? true, projectOverrides[category])) {
    return DROPPED
  }
  const show = foreground
    ? inAppWhenForeground
      ? 'in-app'
      : null
    : permission === 'granted' && prefs.osNotificationsEnabled
      ? 'os'
      : null
  if (!show) return DROPPED
  const seconds = prefs.displayDurationSeconds
  return { show, sound: prefs.soundsEnabled, closeAfterMs: seconds > 0 ? seconds * 1000 : null }
}
