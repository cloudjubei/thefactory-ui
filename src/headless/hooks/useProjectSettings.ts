import { useCallback, useEffect, useState } from 'react'

import {
  DEFAULT_PROJECT_SETTINGS,
  type NotificationPrefs,
  type ProjectSettings,
} from '../types/settings'
import type { SyncKVStorage } from './useStorageBackedState'

const STORAGE_PREFIX = 'thefactory.projectSettings.'

function storageKey(projectId: string): string {
  return `${STORAGE_PREFIX}${projectId}`
}

function readSettings(storage: SyncKVStorage, projectId: string | undefined): ProjectSettings {
  if (!projectId) return DEFAULT_PROJECT_SETTINGS
  try {
    const raw = storage.get(storageKey(projectId))
    if (!raw) return DEFAULT_PROJECT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<ProjectSettings>
    return {
      notifications: {
        categories: { ...(parsed.notifications?.categories ?? {}) },
      },
    }
  } catch {
    return DEFAULT_PROJECT_SETTINGS
  }
}

function writeSettings(storage: SyncKVStorage, projectId: string, next: ProjectSettings): void {
  try {
    storage.set(storageKey(projectId), JSON.stringify(next))
  } catch {
    /* storage unavailable / quota exceeded */
  }
}

export type ProjectSettingsApi = {
  settings: ProjectSettings
  setNotificationCategory: (
    category: keyof NotificationPrefs['categories'],
    enabled: boolean | undefined,
  ) => void
}

/**
 * Per-project UI preferences keyed by `projectId`. Cross-platform — the
 * consumer supplies the `SyncKVStorage` (web wraps `localStorage`, mobile
 * wraps MMKV, desktop wraps Electron `safeStorage`). When the optional
 * `subscribe` slot is implemented, the hook also reacts to out-of-band
 * writes (web's `storage` event for cross-tab updates).
 *
 * Pass `projectId === undefined` to surface defaults — `setNotificationCategory`
 * becomes a no-op until a real project id arrives.
 * Pass `enabled === undefined` to clear a category override (the row falls
 * back to the global `AppSettings.notifications` toggle).
 */
export function useProjectSettings(
  storage: SyncKVStorage,
  projectId: string | undefined,
): ProjectSettingsApi {
  const [settings, setSettings] = useState<ProjectSettings>(() => readSettings(storage, projectId))

  // Re-read whenever the active project changes.
  useEffect(() => {
    setSettings(readSettings(storage, projectId))
  }, [storage, projectId])

  // Cross-context updates (web's `storage` event covers cross-tab edits to
  // the same project's key). MMKV / safeStorage callers can omit
  // `subscribe` and the listener no-ops.
  useEffect(() => {
    if (!projectId || !storage.subscribe) return
    return storage.subscribe(storageKey(projectId), () => {
      setSettings(readSettings(storage, projectId))
    })
  }, [storage, projectId])

  const setNotificationCategory = useCallback<ProjectSettingsApi['setNotificationCategory']>(
    (category, enabled) => {
      if (!projectId) return
      setSettings((current) => {
        const categories = { ...current.notifications.categories }
        if (enabled === undefined) delete categories[category]
        else categories[category] = enabled
        const next: ProjectSettings = { notifications: { categories } }
        writeSettings(storage, projectId, next)
        return next
      })
    },
    [storage, projectId],
  )

  return { settings, setNotificationCategory }
}
