// RN-friendly mirror of the shared design tokens.
//
// Native consumers need numeric metrics (RN measures in `dp`, not CSS pixel
// strings) and flat hex colours (RN doesn't understand `color-mix()` or
// CSS variables). The web tokens use CSS-shaped values (`'8px'`, hex+mix);
// this module re-shapes the same source as RN-typed values so primitives
// under `src/native/` can do `style={{ padding: nativeSpace[4] }}` or feed
// values into the NativeWind preset.
//
// Source of truth is still `./colors` + `./metrics` + `./semantic`. Anything
// that doesn't translate cleanly (CSS `color-mix`, `color-scheme`, CSS easing
// curves, multi-shadow CSS strings) is either dropped or replaced with a
// platform-appropriate fallback.

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

// Re-export the palette as-is — already hex strings, RN consumes them directly.
export { palette as nativePalette } from './colors'

// Parse a value like '8px' / '14px' / '999px' to its numeric dp value.
// Strings already without a unit (e.g. line-heights like '1.45') pass through
// as parsed floats so RN's `lineHeight` consumer can apply them.
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
  // RN doesn't honour percentage radii on every platform; large numeric value
  // covers the typical "fully rounded chip" use without surprises.
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

// Line heights authored as ratios (`'1.45'`) — RN's `lineHeight` is dp, so a
// consumer multiplies the ratio by the matching font size. Expose both shapes.
export const nativeLineHeightRatios = {
  tight: Number(lineHeights.tight),
  snug: Number(lineHeights.snug),
  normal: Number(lineHeights.normal),
  relaxed: Number(lineHeights.relaxed),
} as const

// RN expects fontWeight as a string union ('400', '500', '600', '700').
export const nativeFontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
}

// RN doesn't ship the same font family names as web. Map to the closest
// platform-native equivalents — RN will fall back to the system font when
// the named family is absent.
export const nativeFontFamilies = {
  // `undefined` on iOS picks San Francisco; on Android picks Roboto. Leaving
  // these unset is the most reliable cross-platform default for body text.
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

// RN doesn't understand CSS easing curves; ship the duration values only.
// Animation libraries (Reanimated, RN Animated) take their own easing fns.
export const nativeMotion = {
  fast: parseInt(motion.fast, 10),
  normal: parseInt(motion.normal, 10),
  slow: parseInt(motion.slow, 10),
} as const

// Shadows — RN's shadow API is split across `shadowColor` / `shadowOffset` /
// `shadowOpacity` / `shadowRadius` (iOS) + `elevation` (Android). The web
// tokens are multi-shadow CSS strings; mapping them 1:1 isn't useful. Provide
// a small bank of presets that mirror the elevation steps.
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

// Semantic themes — flat hex values only. The CSS web themes use `color-mix`
// for hover/soft tints; RN can't compute those at runtime, so we precompute
// the equivalents inline.
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
    // Precomputed equivalent of `color-mix(in srgb, var(--border-default) 20%, transparent)`
    // against the light theme's `--border-default` (gray[300] = #d1d5db).
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
    // Precomputed equivalent of `color-mix(in srgb, #ffffff 8%, transparent)`.
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

// Status colours — bold variants are flat hex (always usable on RN). The
// `soft` variants on web use `color-mix()` so we omit them here; consumers
// that need a soft tint can layer an `opacity` style on the bold colour.
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

// Convenience: bundled RN metrics for `tailwind.config.js` consumers that
// extend their theme from this preset. NativeWind reads pixel-numeric values.
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

// Re-export raw metric records consumers may also want directly.
export { fontFamilies, lineHeights } from './metrics'
