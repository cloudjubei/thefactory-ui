import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'

/**
 * Number value persisted to `window.localStorage` under `key`, with a
 * `fallback` returned when no value is stored, the stored value isn't
 * parseable, or the parsed number isn't positive-finite. Writes round
 * to the nearest integer (consumers are widths / heights in pixels,
 * which never benefit from subpixel persistence). Returns the standard
 * React `[value, setValue]` tuple so consumers can use either the value
 * form (`setX(n)`) or the function form (`setX(prev => prev + 1)`).
 * SSR-safe via the `typeof window === 'undefined'` guards.
 */
export function useLocalStorageNumber(
  key: string,
  fallback: number,
): [number, Dispatch<SetStateAction<number>>] {
  const [value, setValue] = useState<number>(() => {
    if (typeof window === 'undefined') return fallback
    try {
      const v = window.localStorage.getItem(key)
      if (v === null) return fallback
      const n = parseInt(v, 10)
      return Number.isFinite(n) && n > 0 ? n : fallback
    } catch {
      return fallback
    }
  })
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(key, String(Math.round(value)))
    } catch {
      // best-effort — private mode / quota / etc.
    }
  }, [key, value])
  return [value, setValue]
}

/**
 * Boolean value persisted to `window.localStorage` under `key` as `'1'` /
 * `'0'`, with `fallback` returned when no value is stored or storage
 * access throws. Returns the standard React `[value, setValue]` tuple so
 * consumers can use either the value form (`setX(true)`) or the function
 * form (`setX(prev => !prev)`). SSR-safe.
 */
export function useLocalStorageBool(
  key: string,
  fallback: boolean,
): [boolean, Dispatch<SetStateAction<boolean>>] {
  const [value, setValue] = useState<boolean>(() => {
    if (typeof window === 'undefined') return fallback
    try {
      const v = window.localStorage.getItem(key)
      if (v === null) return fallback
      return v === '1'
    } catch {
      return fallback
    }
  })
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(key, value ? '1' : '0')
    } catch {
      // best-effort
    }
  }, [key, value])
  return [value, setValue]
}
