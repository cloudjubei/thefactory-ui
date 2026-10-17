import { describe, expect, it } from 'vitest'

import { brand, gold, orange, sky } from './colors'
import {
  nativeAlpha,
  nativeDarkStatus,
  nativeDarkTheme,
  nativeLightStatus,
  nativeLightTheme,
  type NativeStatusTokens,
} from './native'
import { lightTheme } from './semantic'

type Rgba = [number, number, number, number]

function rgba(color: string): Rgba {
  if (color.startsWith('#')) {
    const n = parseInt(color.slice(1, 7), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1]
  }
  const [r, g, b, a] = color
    .replace(/rgba?\(|\)/g, '')
    .split(',')
    .map(Number)
  return [r, g, b, a ?? 1]
}

function over(top: string, under: string): Rgba {
  const [r, g, b, a] = rgba(top)
  const [ur, ug, ub] = rgba(under)
  return [r * a + ur * (1 - a), g * a + ug * (1 - a), b * a + ub * (1 - a), 1]
}

function luminance([r, g, b]: Rgba): number {
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function contrast(fg: Rgba, bg: Rgba): number {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

function hue(color: string): number {
  const [r, g, b] = rgba(color).map((c) => c / 255)
  const max = Math.max(r, g, b)
  const d = max - Math.min(r, g, b)
  if (d === 0) return 0
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return (h * 60 + 360) % 360
}

const THEMES = [
  ['light', nativeLightStatus, nativeLightTheme],
  ['dark', nativeDarkStatus, nativeDarkTheme],
] as const

describe('nativeAlpha', () => {
  it('turns a hex colour at an opacity into rgba', () => {
    expect(nativeAlpha('#0284c7', 0.14)).toBe('rgba(2, 132, 199, 0.14)')
    expect(nativeAlpha('#ffffff', 1)).toBe('rgba(255, 255, 255, 1)')
  })
})

describe('native status tokens', () => {
  it.each(THEMES)('carries the same statuses as the web tokens in the %s theme', (_, status) => {
    expect(Object.keys(status).sort()).toEqual(Object.keys(lightTheme.status).sort())
  })

  it('draws running in flat sky values, matching the web tints', () => {
    expect(nativeLightStatus.running).toEqual({
      bg: sky[700],
      fg: '#ffffff',
      softBg: nativeAlpha(sky[600], 0.14),
      softFg: sky[700],
      softBorder: sky[400],
    })
    expect(nativeDarkStatus.running).toEqual({
      bg: sky[500],
      fg: '#04202e',
      softBg: nativeAlpha(sky[500], 0.18),
      softFg: sky[200],
      softBorder: nativeAlpha(sky[500], 0.6),
    })
  })

  it('draws the sign-off in flat gold values, matching the web tints', () => {
    expect(nativeLightStatus.review).toEqual({
      bg: gold[500],
      fg: '#2b2200',
      softBg: nativeAlpha(gold[500], 0.18),
      softFg: gold[800],
      softBorder: gold[400],
    })
    expect(nativeDarkStatus.review).toEqual({
      bg: gold[600],
      fg: '#1f1800',
      softBg: nativeAlpha(gold[500], 0.18),
      softFg: gold[200],
      softBorder: nativeAlpha(gold[500], 0.6),
    })
  })

  it.each<[string, NativeStatusTokens]>([
    ['light', nativeLightStatus],
    ['dark', nativeDarkStatus],
  ])('never shares a bold or soft colour between running and done or review (%s)', (_, status) => {
    for (const other of [status.done, status.review]) {
      expect(status.running.bg).not.toBe(other.bg)
      expect(status.running.softBg).not.toBe(other.softBg)
      expect(status.running.softFg).not.toBe(other.softFg)
      expect(status.running.softBorder).not.toBe(other.softBorder)
    }
  })

  it.each<[string, NativeStatusTokens]>([
    ['light', nativeLightStatus],
    ['dark', nativeDarkStatus],
  ])(
    'never shares a bold or soft colour between the sign-off and working, running, done or on hold (%s)',
    (_, status) => {
      for (const other of [status.working, status.running, status.done, status.on_hold]) {
        expect(status.review.bg).not.toBe(other.bg)
        expect(status.review.softBg).not.toBe(other.softBg)
        expect(status.review.softFg).not.toBe(other.softFg)
        expect(status.review.softBorder).not.toBe(other.softBorder)
      }
    },
  )

  it('makes the sign-off gold clearly yellower than the working orange beside it', () => {
    expect(hue(orange[650])).toBeLessThan(38)
    for (const status of [nativeLightStatus, nativeDarkStatus]) {
      expect(hue(status.review.bg) - hue(status.working.bg)).toBeGreaterThanOrEqual(10)
      expect(hue(status.review.softFg)).toBeGreaterThanOrEqual(44)
    }
  })

  it.each(THEMES)(
    'keeps sign-off and running text readable in the %s theme',
    (_, status, theme) => {
      for (const key of ['review', 'running'] as const) {
        const v = status[key]
        const pill = over(v.softBg, theme.surface.raised)
        expect(contrast(rgba(v.softFg), pill), `${key} soft`).toBeGreaterThanOrEqual(4.5)
        expect(contrast(rgba(v.fg), rgba(v.bg)), `${key} bold`).toBeGreaterThanOrEqual(4.5)
      }
    },
  )

  it('never puts a color-mix where React Native cannot read it', () => {
    for (const status of [nativeLightStatus, nativeDarkStatus]) {
      for (const variant of Object.values(status)) {
        for (const value of Object.values(variant)) expect(value).not.toContain('color-mix')
      }
    }
  })
})

describe('native accent soft', () => {
  it('tints selections and notes in the brand blue, never the sign-off gold', () => {
    expect(nativeLightTheme.accent).toMatchObject({
      softBg: nativeAlpha(brand[600], 0.1),
      softFg: brand[700],
      softBorder: brand[300],
    })
    expect(nativeDarkTheme.accent).toMatchObject({
      softBg: nativeAlpha(brand[500], 0.18),
      softFg: brand[200],
      softBorder: nativeAlpha(brand[500], 0.55),
    })
  })

  it.each(THEMES)('keeps accent-soft text readable in the %s theme', (_, status, theme) => {
    const pill = over(theme.accent.softBg, theme.surface.raised)
    expect(contrast(rgba(theme.accent.softFg), pill)).toBeGreaterThanOrEqual(4.5)
    expect(theme.accent.softFg).not.toBe(status.review.softFg)
  })
})
