// Shared `mergeSettings` helper used by `AppSettingsContext` on web,
// desktop, and mobile. Defends against missing nested fields after a
// rolling upgrade — older persisted blobs are merged onto the current
// `DEFAULT_APP_SETTINGS` so newly-added keys appear with their defaults
// instead of `undefined`.
//
// When a client adds a nested field to `AppSettings`, extend both the
// type in `./types/settings.ts` AND the merge below — the helper is the
// one place that enumerates every nested object that needs deep merging.

import { DEFAULT_APP_SETTINGS, type AppSettings } from '../types/settings'

export function mergeSettings(parsed: Partial<AppSettings>): AppSettings {
  return {
    ...DEFAULT_APP_SETTINGS,
    ...parsed,
    userPreferences: {
      ...DEFAULT_APP_SETTINGS.userPreferences,
      ...(parsed.userPreferences ?? {}),
      shortcuts: {
        ...DEFAULT_APP_SETTINGS.userPreferences.shortcuts,
        ...(parsed.userPreferences?.shortcuts ?? {}),
      },
    },
    notifications: {
      ...DEFAULT_APP_SETTINGS.notifications,
      ...(parsed.notifications ?? {}),
      categories: {
        ...DEFAULT_APP_SETTINGS.notifications.categories,
        ...(parsed.notifications?.categories ?? {}),
      },
      badgesEnabled: {
        ...DEFAULT_APP_SETTINGS.notifications.badgesEnabled,
        ...(parsed.notifications?.badgesEnabled ?? {}),
      },
      badgeColors: {
        ...DEFAULT_APP_SETTINGS.notifications.badgeColors,
        ...(parsed.notifications?.badgeColors ?? {}),
      },
      gitBadgeSubToggles: {
        ...DEFAULT_APP_SETTINGS.notifications.gitBadgeSubToggles,
        ...(parsed.notifications?.gitBadgeSubToggles ?? {}),
      },
    },
  }
}
