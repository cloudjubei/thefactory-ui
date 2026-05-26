import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { comboMatches, prettyCombo as pretty } from '../../../headless'
import type { ShortcutsModifier } from '../../../headless/types/settings'

export type ShortcutHandler = (e: KeyboardEvent) => boolean | void

export type Shortcut = {
  id: string
  comboKeys: string
  handler: ShortcutHandler
  description?: string
  scope?: 'global' | 'list' | 'panel' | 'modal'
}

export type ShortcutsApi = {
  register: (sc: Shortcut) => () => void
  list: () => Shortcut[]
  prettyCombo: (combo: string) => string
}

const ShortcutsCtx = createContext<ShortcutsApi | null>(null)

export type ShortcutsProviderProps = {
  /** Which key acts as `Mod` in registered combos — `meta` (⌘) or `ctrl`. */
  modifier: ShortcutsModifier
  children: ReactNode
}

export function ShortcutsProvider({ modifier, children }: ShortcutsProviderProps) {
  const mapRef = useRef<Map<string, Shortcut>>(new Map())

  const register = useCallback((sc: Shortcut) => {
    mapRef.current.set(sc.id, sc)
    return () => {
      mapRef.current.delete(sc.id)
    }
  }, [])

  const list = useCallback(() => Array.from(mapRef.current.values()), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const tag = (target?.tagName || '').toLowerCase()
      const isEditable =
        (target && target.isContentEditable) ||
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select'

      for (const sc of mapRef.current.values()) {
        try {
          if (isEditable && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) continue
          if (comboMatches(sc.comboKeys, e, modifier)) {
            const res = sc.handler(e)
            if (res !== false) {
              e.preventDefault()
              e.stopPropagation()
              return
            }
          }
        } catch {
          /* a misbehaving handler must not lock the keyboard */
        }
      }
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [modifier])

  const prettyCombo = useCallback((combo: string) => pretty(combo, modifier), [modifier])

  const api = useMemo<ShortcutsApi>(
    () => ({ register, list, prettyCombo }),
    [register, list, prettyCombo],
  )
  return <ShortcutsCtx.Provider value={api}>{children}</ShortcutsCtx.Provider>
}

export function useShortcuts(): ShortcutsApi {
  const ctx = useContext(ShortcutsCtx)
  if (!ctx) {
    return {
      register: () => () => {},
      list: () => [],
      prettyCombo: (combo) => combo,
    }
  }
  return ctx
}
