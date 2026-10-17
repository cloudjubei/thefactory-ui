import { describe, expect, it } from 'vitest'

import { brand, gold, sky } from './colors'
import { darkTheme, lightTheme, type StatusTokens } from './semantic'

const KEYS: (keyof StatusTokens)[] = [
  'empty',
  'done',
  'running',
  'working',
  'stuck',
  'on_hold',
  'review',
  'queued',
  'blocked',
]

describe('status tokens', () => {
  it.each([
    ['light', lightTheme],
    ['dark', darkTheme],
  ])('gives every status all five values in the %s theme', (_, theme) => {
    expect(Object.keys(theme.status).sort()).toEqual([...KEYS].sort())
    for (const key of KEYS) {
      const variant = theme.status[key]
      expect(Object.keys(variant).sort(), key).toEqual(
        ['bg', 'fg', 'softBg', 'softBorder', 'softFg'].sort(),
      )
      for (const value of Object.values(variant)) expect(value, key).not.toBe('')
    }
  })

  it('draws running in the sky ramp, its own blue, in the light theme', () => {
    expect(lightTheme.status.running).toEqual({
      bg: sky[700],
      fg: '#ffffff',
      softBg: 'color-mix(in srgb, var(--color-sky-600) 14%, transparent)',
      softFg: sky[700],
      softBorder: sky[400],
    })
  })

  it('draws running from the sky ramp in the dark theme too', () => {
    for (const value of [
      darkTheme.status.running.bg,
      darkTheme.status.running.softBg,
      darkTheme.status.running.softBorder,
    ]) {
      expect(value).toContain('var(--color-sky-500)')
    }
  })

  it.each([
    ['light', lightTheme],
    ['dark', darkTheme],
  ])('never shares a hue-carrying value with done or review in the %s theme', (_, theme) => {
    const { bg, softBg, softFg, softBorder } = theme.status.running
    for (const other of [theme.status.done, theme.status.review]) {
      for (const value of [other.bg, other.softBg, other.softFg, other.softBorder]) {
        expect([bg, softBg, softFg, softBorder]).not.toContain(value)
      }
    }
  })

  it('draws the sign-off in the gold ramp in the light theme', () => {
    expect(lightTheme.status.review).toEqual({
      bg: gold[500],
      fg: '#2b2200',
      softBg: 'color-mix(in srgb, var(--color-gold-500) 18%, transparent)',
      softFg: gold[800],
      softBorder: gold[400],
    })
  })

  it('draws the sign-off from the gold ramp in the dark theme too', () => {
    const { bg, softBg, softBorder } = darkTheme.status.review
    for (const value of [bg, softBg, softBorder]) expect(value).toContain('var(--color-gold-500)')
    expect(darkTheme.status.review.softFg).toBe(gold[200])
  })

  it.each([
    ['light', lightTheme],
    ['dark', darkTheme],
  ])(
    'never shares a hue-carrying value between the sign-off and working, running, done or on hold in the %s theme',
    (_, theme) => {
      const { bg, softBg, softFg, softBorder } = theme.status.review
      for (const key of ['working', 'running', 'done', 'on_hold'] as const) {
        const other = theme.status[key]
        for (const value of [other.bg, other.softBg, other.softFg, other.softBorder]) {
          expect([bg, softBg, softFg, softBorder], key).not.toContain(value)
        }
      }
    },
  )
})

describe('accent soft tokens', () => {
  it('tints selections and notes in the brand blue in both themes', () => {
    expect(lightTheme.accent).toMatchObject({
      softBg: 'color-mix(in srgb, var(--color-brand-600) 10%, transparent)',
      softFg: brand[700],
      softBorder: brand[300],
    })
    expect(darkTheme.accent).toMatchObject({
      softBg: 'color-mix(in srgb, var(--color-brand-500) 18%, transparent)',
      softFg: brand[200],
      softBorder: 'color-mix(in srgb, var(--color-brand-500) 55%, transparent)',
    })
  })
})
