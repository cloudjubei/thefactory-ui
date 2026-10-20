import type { NotificationCategory, NotificationPrefs } from '../types/settings'

/** Where the platform's notification permission stands; `unsupported` when it has none. */
export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported'

export type NotificationRouteInput = {
  prefs: NotificationPrefs
  /** The active project's per-category overrides; a missing one follows the global toggle. */
  projectOverrides: Partial<Record<NotificationCategory, boolean>>
  category: NotificationCategory
  permission: NotificationPermissionState
  /** Whether the person is looking at the app right now. */
  foreground: boolean
  /** Whether the app shows its own notice while it is in front, rather than nothing. */
  inAppWhenForeground: boolean
}

export type NotificationRoute = {
  /** `os` posts a system notification, `in-app` shows the app's own notice, `null` drops it. */
  show: 'os' | 'in-app' | null
  sound: boolean
  /** When the notice closes by itself; `null` keeps it until dismissed. */
  closeAfterMs: number | null
}
