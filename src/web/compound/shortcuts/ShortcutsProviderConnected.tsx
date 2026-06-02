import type { ReactNode } from 'react'
import { useAppSettings } from '../../../headless'
import { ShortcutsProvider } from './ShortcutsContext'

/**
 * Connected `ShortcutsProvider` for browser clients: reads the user's selected
 * modifier from `useAppSettings` and feeds it into the base `ShortcutsProvider`,
 * so call sites stay `<ShortcutsProviderConnected>…</ShortcutsProviderConnected>`
 * without prop wiring. Must be mounted inside `AppSettingsProviderConnected`.
 */
export function ShortcutsProviderConnected({ children }: { children: ReactNode }) {
  const { settings } = useAppSettings()
  return (
    <ShortcutsProvider modifier={settings.userPreferences.shortcutsModifier}>
      {children}
    </ShortcutsProvider>
  )
}
