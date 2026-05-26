import { createContext, useCallback, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useStorageBackedState, type SyncKVStorage } from '../hooks/useStorageBackedState'
import { mergeSettings } from '../utils/settings'
import {
  DEFAULT_APP_SETTINGS as PACKAGE_DEFAULTS,
  type AppSettings,
  type NotificationPrefs,
  type Theme,
  type UserPreferences,
} from '../types/settings'

const STORAGE_KEY = 'thefactory.appSettings'

export type AppSettingsContextValue = {
  settings: AppSettings
  setTheme: (theme: Theme) => void
  setUserPreferences: (patch: Partial<UserPreferences>) => void
  setNotifications: (patch: Partial<NotificationPrefs>) => void
}

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null)

export type AppSettingsProviderProps = {
  /** Storage adapter (web: localStorage; native: MMKV; tests: in-memory). */
  storage: SyncKVStorage
  /**
   * Default settings for first-launch hydration. Apps pass the platform-aware
   * `DEFAULT_APP_SETTINGS` from their settings module (e.g. the mac-aware
   * `Mod` key sniff). Defaults to the package's `DEFAULT_APP_SETTINGS`.
   */
  defaults?: AppSettings
  children: ReactNode
}

export function AppSettingsProvider({
  storage,
  defaults = PACKAGE_DEFAULTS,
  children,
}: AppSettingsProviderProps) {
  const readSettings = useCallback(
    (raw: string | null): AppSettings => {
      if (!raw) return defaults
      try {
        return mergeSettings(JSON.parse(raw) as Partial<AppSettings>)
      } catch {
        return defaults
      }
    },
    [defaults],
  )

  const [settings, setSettings] = useStorageBackedState(
    storage,
    STORAGE_KEY,
    readSettings,
    writeSettings,
  )

  const setTheme = useCallback(
    (theme: Theme) => setSettings((current) => ({ ...current, theme })),
    [setSettings],
  )

  const setUserPreferences = useCallback(
    (patch: Partial<UserPreferences>) =>
      setSettings((current) => ({
        ...current,
        userPreferences: { ...current.userPreferences, ...patch },
      })),
    [setSettings],
  )

  const setNotifications = useCallback(
    (patch: Partial<NotificationPrefs>) =>
      setSettings((current) => ({
        ...current,
        notifications: {
          ...current.notifications,
          ...patch,
          categories: {
            ...current.notifications.categories,
            ...(patch.categories ?? {}),
          },
          badgesEnabled: {
            ...current.notifications.badgesEnabled,
            ...(patch.badgesEnabled ?? {}),
          },
          badgeColors: {
            ...current.notifications.badgeColors,
            ...(patch.badgeColors ?? {}),
          },
          gitBadgeSubToggles: {
            ...current.notifications.gitBadgeSubToggles,
            ...(patch.gitBadgeSubToggles ?? {}),
          },
        },
      })),
    [setSettings],
  )

  const value = useMemo<AppSettingsContextValue>(
    () => ({ settings, setTheme, setUserPreferences, setNotifications }),
    [settings, setTheme, setUserPreferences, setNotifications],
  )

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>
}

function writeSettings(next: AppSettings): string {
  return JSON.stringify(next)
}

export function useAppSettings(): AppSettingsContextValue {
  const ctx = useContext(AppSettingsContext)
  if (!ctx) throw new Error('useAppSettings must be used within AppSettingsProvider')
  return ctx
}
