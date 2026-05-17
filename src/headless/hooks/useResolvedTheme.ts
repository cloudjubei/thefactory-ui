import { useEffect, useState } from 'react'

/**
 * Resolves the user-chosen theme (`'light' | 'dark' | 'system'`) into a
 * concrete `'light' | 'dark'` value, subscribing to OS-level changes when
 * the user picked `'system'`.
 *
 * Headless: no DOM, no `window.matchMedia` — the host injects how to read
 * the current system preference and how to subscribe to changes. Web wires
 * `matchMedia('(prefers-color-scheme: dark)')`; RN wires `Appearance.getColorScheme()`
 * + `Appearance.addChangeListener`.
 */

export type Theme = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export type SystemThemeSource = {
  /** Returns the current OS-level preference. */
  get: () => ResolvedTheme
  /** Subscribe to changes; returns an unsubscribe. */
  subscribe: (cb: () => void) => () => void
}

export type UseResolvedThemeOptions = {
  theme: Theme
  /** When the user picked `system`, this drives the resolved value. Pass
   *  `undefined` to treat `system` as `light`. */
  system?: SystemThemeSource
}

export function useResolvedTheme({ theme, system }: UseResolvedThemeOptions): ResolvedTheme {
  const [systemNow, setSystemNow] = useState<ResolvedTheme>(() =>
    system ? system.get() : 'light',
  )

  useEffect(() => {
    if (theme !== 'system' || !system) return
    setSystemNow(system.get())
    return system.subscribe(() => setSystemNow(system.get()))
  }, [theme, system])

  if (theme === 'system') return systemNow
  return theme
}
