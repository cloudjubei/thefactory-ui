// RN-friendly mirror of the design tokens. The web tokens are CSS-shaped
// (`'8px'`, hex with `color-mix()`); RN needs numeric dp values and flat hex.
// Source of truth stays in `./colors` + `./metrics` + `./semantic`; this
// module just re-shapes them.

import { brand, gray, green, orange, red, purple, blue, palette } from './colors'
import {
  controls,
  fontSizes,
  lineHeights,
  motion,
  radii,
  space,
  zIndex,
} from './metrics'

export { palette as nativePalette } from './colors'

// Strings already without a unit (line-height ratios like '1.45') pass
// through as parsed floats so an RN `lineHeight` consumer can apply them.
function px(value: string): number {
  const trimmed = value.trim()
  if (trimmed.endsWith('px')) return Number(trimmed.slice(0, -2))
  return Number(trimmed)
}

export const nativeSpace = {
  0: 0,
  1: px(space[1]),
  2: px(space[2]),
  3: px(space[3]),
  4: px(space[4]),
  5: px(space[5]),
  6: px(space[6]),
  7: px(space[7]),
  8: px(space[8]),
  10: px(space[10]),
  12: px(space[12]),
  16: px(space[16]),
  20: px(space[20]),
  24: px(space[24]),
  32: px(space[32]),
} as const

export const nativeRadii = {
  1: px(radii[1]),
  2: px(radii[2]),
  3: px(radii[3]),
  4: px(radii[4]),
  5: px(radii[5]),
  // RN doesn't honour percentage radii on every platform; a large numeric
  // value covers the typical "fully rounded chip" case without surprises.
  round: 9999,
} as const

export const nativeFontSizes = {
  xxs: px(fontSizes.xxs),
  xs: px(fontSizes.xs),
  sm: px(fontSizes.sm),
  md: px(fontSizes.md),
  lg: px(fontSizes.lg),
  xl: px(fontSizes.xl),
  '2xl': px(fontSizes['2xl']),
  '3xl': px(fontSizes['3xl']),
} as const

export const nativeLineHeightRatios = {
  tight: Number(lineHeights.tight),
  snug: Number(lineHeights.snug),
  normal: Number(lineHeights.normal),
  relaxed: Number(lineHeights.relaxed),
} as const

export const nativeFontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
}

// `undefined` picks the platform's system font (SF on iOS, Roboto on Android),
// which is the most reliable cross-platform default for body text.
export const nativeFontFamilies = {
  sans: undefined,
  mono: 'Menlo',
} as const

export const nativeControls = {
  height: {
    sm: px(controls.height.sm),
    md: px(controls.height.md),
    lg: px(controls.height.lg),
  },
  paddingX: px(controls.paddingX),
  focusRingWidth: px(controls.focusRingWidth),
} as const

export const nativeZIndex = { ...zIndex }

// RN doesn't read CSS easing curves; ship the durations only. Animation
// libraries (Reanimated, RN Animated) bring their own easing functions.
export const nativeMotion = {
  fast: parseInt(motion.fast, 10),
  normal: parseInt(motion.normal, 10),
  slow: parseInt(motion.slow, 10),
} as const

// RN's shadow API splits across `shadowColor` / `shadowOffset` /
// `shadowOpacity` / `shadowRadius` (iOS) and `elevation` (Android). The web
// tokens are multi-shadow CSS strings; we expose a parallel elevation bank.
export interface NativeShadow {
  shadowColor: string
  shadowOffset: { width: number; height: number }
  shadowOpacity: number
  shadowRadius: number
  elevation: number
}

export const nativeShadows: Record<0 | 1 | 2 | 3 | 4, NativeShadow> = {
  0: { shadowColor: '#000', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  1: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
  2: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  3: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 6 },
  4: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.14, shadowRadius: 30, elevation: 10 },
}

export interface NativeSemanticTheme {
  colorScheme: 'light' | 'dark'
  surface: { base: string; raised: string; overlay: string; muted: string; hover: string }
  text: { primary: string; secondary: string; muted: string; inverted: string }
  border: { subtle: string; default: string; strong: string; focus: string }
  accent: { primary: string; primaryHover: string; primaryActive: string }
  focusRing: string
}

export const nativeLightTheme: NativeSemanticTheme = {
  colorScheme: 'light',
  surface: {
    base: gray[50],
    raised: '#ffffff',
    overlay: '#ffffff',
    muted: gray[100],
    // Precomputed `color-mix(in srgb, var(--border-default) 20%, transparent)`
    // for the light theme's `--border-default` (gray[300]).
    hover: 'rgba(209, 213, 219, 0.2)',
  },
  text: {
    primary: gray[900],
    secondary: gray[700],
    muted: gray[600],
    inverted: '#ffffff',
  },
  border: {
    subtle: gray[200],
    default: gray[300],
    strong: gray[400],
    focus: brand[500],
  },
  accent: {
    primary: brand[600],
    primaryHover: brand[700],
    primaryActive: brand[800],
  },
  focusRing: brand[400],
}

export const nativeDarkTheme: NativeSemanticTheme = {
  colorScheme: 'dark',
  surface: {
    base: '#0b0f14',
    raised: '#121821',
    overlay: '#1a2230',
    muted: '#0e141d',
    // Precomputed `color-mix(in srgb, #ffffff 8%, transparent)`.
    hover: 'rgba(255, 255, 255, 0.08)',
  },
  text: {
    primary: '#f5f7fa',
    secondary: '#c8d0da',
    muted: '#96a1ae',
    inverted: '#0b0f14',
  },
  border: {
    subtle: '#202937',
    default: '#2a3444',
    strong: '#3a475c',
    focus: brand[400],
  },
  accent: {
    primary: brand[500],
    primaryHover: brand[400],
    primaryActive: brand[600],
  },
  focusRing: brand[400],
}

// Soft variants from the web theme use `color-mix()`; we omit them on RN and
// let consumers layer `opacity` on the bold colour when they need a tint.
export interface NativeStatusVariant {
  bg: string
  fg: string
}

export interface NativeStatusTokens {
  empty: NativeStatusVariant
  done: NativeStatusVariant
  working: NativeStatusVariant
  stuck: NativeStatusVariant
  on_hold: NativeStatusVariant
  review: NativeStatusVariant
  queued: NativeStatusVariant
  blocked: NativeStatusVariant
}

export const nativeLightStatus: NativeStatusTokens = {
  empty: { bg: '#ffffff', fg: '#000000' },
  done: { bg: green[600], fg: '#053b2e' },
  working: { bg: orange[650], fg: '#231200' },
  stuck: { bg: red[600], fg: '#ffffff' },
  on_hold: { bg: purple[650], fg: '#ffffff' },
  review: { bg: blue[650], fg: '#ffffff' },
  queued: { bg: '#eaeaea', fg: gray[800] },
  blocked: { bg: '#b42318', fg: '#ffffff' },
}

export const nativeDarkStatus: NativeStatusTokens = {
  empty: { bg: '#121821', fg: '#f5f7fa' },
  done: { bg: green[700], fg: '#e9fff6' },
  working: { bg: orange[700], fg: '#1b1200' },
  stuck: { bg: red[700], fg: '#fff5f6' },
  on_hold: { bg: purple[700], fg: '#f7f1ff' },
  review: { bg: blue[700], fg: '#f2f7ff' },
  queued: { bg: '#313843', fg: '#e5e7eb' },
  blocked: { bg: '#b42318', fg: '#ffffff' },
}

export const nativeTheme = {
  palette,
  space: nativeSpace,
  radii: nativeRadii,
  fontSizes: nativeFontSizes,
  fontWeights: nativeFontWeights,
  fontFamilies: nativeFontFamilies,
  lineHeightRatios: nativeLineHeightRatios,
  controls: nativeControls,
  zIndex: nativeZIndex,
  motion: nativeMotion,
  shadows: nativeShadows,
  light: { semantic: nativeLightTheme, status: nativeLightStatus },
  dark: { semantic: nativeDarkTheme, status: nativeDarkStatus },
} as const

export type NativeTheme = typeof nativeTheme

export { fontFamilies, lineHeights } from './metrics'
