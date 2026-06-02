import type { ReactNode } from 'react'
import {
  AppSettingsProvider as HeadlessAppSettingsProvider,
  DEFAULT_APP_SETTINGS as HEADLESS_DEFAULTS,
  type AppSettings,
} from '../../../headless'
import { localStorageAdapter } from '../storage/localStorageAdapter'

function isMacPlatform(): boolean {
  try {
    return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform || '')
  } catch {
    return false
  }
}

/**
 * Browser-platform defaults: the headless defaults patched with the mac-aware
 * `Mod` key the headless layer can't sniff. Private to this binding — the
 * provider bundles it so apps don't have to.
 */
const DEFAULT_APP_SETTINGS: AppSettings = {
  ...HEADLESS_DEFAULTS,
  userPreferences: {
    ...HEADLESS_DEFAULTS.userPreferences,
    shortcutsModifier: isMacPlatform() ? 'meta' : 'ctrl',
  },
}

/**
 * Connected `AppSettingsProvider` for browser clients (web + Electron
 * renderer): feeds the `localStorage`-backed adapter and the platform-aware
 * defaults into the headless provider. Read state via `useAppSettings` from
 * `thefactory-ui/headless`.
 */
export function AppSettingsProviderConnected({ children }: { children: ReactNode }) {
  return (
    <HeadlessAppSettingsProvider storage={localStorageAdapter} defaults={DEFAULT_APP_SETTINGS}>
      {children}
    </HeadlessAppSettingsProvider>
  )
}
