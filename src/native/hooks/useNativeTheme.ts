import { useColorScheme } from 'nativewind'

import {
  nativeDarkStatus,
  nativeDarkTheme,
  nativeLightStatus,
  nativeLightTheme,
  type NativeSemanticTheme,
  type NativeStatusTokens,
} from '../../tokens/native'

/**
 * Returns the active native theme palette (semantic colours + status
 * tokens) for the current colour scheme. NativeWind's `setColorScheme()` is
 * the single source of truth — apps wire it once via their `useApplyTheme`
 * hook (which reads `settings.theme`), and every native component that
 * needs a runtime colour swap reads through this hook.
 *
 * Why a hook and not a static export: `nativeLightTheme` / `nativeDarkTheme`
 * are still re-exported from `tokens/native` for tree-shake-friendly
 * compile-time use (the bottom-sheet drag threshold, etc. that never
 * change with the scheme), but everywhere a component sets a
 * `backgroundColor` / `color` from a semantic token, switching to the hook
 * makes that surface reactive to theme changes without prop-drilling.
 */
export type NativeThemeValue = {
  theme: NativeSemanticTheme
  status: NativeStatusTokens
  /** Resolved scheme — `'light'` / `'dark'`. Convenient for branching when
   *  the theme tokens alone don't cover the case (e.g. a logo asset). */
  colorScheme: 'light' | 'dark'
}

export function useNativeTheme(): NativeThemeValue {
  const { colorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'
  return {
    theme: isDark ? nativeDarkTheme : nativeLightTheme,
    status: isDark ? nativeDarkStatus : nativeLightStatus,
    colorScheme: isDark ? 'dark' : 'light',
  }
}
