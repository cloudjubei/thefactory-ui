// Layout, sizing, typography, motion, and z-index scales.
// Pure values — usable on any platform.

export const fontFamilies = {
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
} as const

export const fontSizes = {
  xxs: '10px',
  xs: '12px',
  sm: '14px',
  md: '16px',
  lg: '18px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '30px',
} as const

export const lineHeights = {
  tight: '1.1',
  snug: '1.25',
  normal: '1.45',
  relaxed: '1.6',
} as const

export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const

export const space = {
  0: '0',
  1: '2px',
  2: '4px',
  3: '6px',
  4: '8px',
  5: '10px',
  6: '12px',
  7: '14px',
  8: '16px',
  10: '20px',
  12: '24px',
  16: '32px',
  20: '40px',
  24: '48px',
  32: '64px',
} as const

export const radii = {
  1: '4px',
  2: '6px',
  3: '8px',
  4: '10px',
  5: '12px',
  round: '999px',
} as const

export const shadows = {
  light: {
    0: 'none',
    1: '0 1px 2px rgba(0, 0, 0, 0.06)',
    2: '0 1px 3px rgba(0, 0, 0, 0.08), 0 6px 20px rgba(0, 0, 0, 0.06)',
    3: '0 6px 16px rgba(0, 0, 0, 0.1), 0 10px 30px rgba(0, 0, 0, 0.08)',
    4: '0 10px 30px rgba(0, 0, 0, 0.14), 0 16px 40px rgba(0, 0, 0, 0.1)',
  },
  dark: {
    0: 'none',
    1: '0 1px 2px rgba(0, 0, 0, 0.28)',
    2: '0 1px 3px rgba(0, 0, 0, 0.32), 0 6px 20px rgba(0, 0, 0, 0.28)',
    3: '0 6px 16px rgba(0, 0, 0, 0.34), 0 10px 30px rgba(0, 0, 0, 0.3)',
    4: '0 10px 30px rgba(0, 0, 0, 0.38), 0 16px 40px rgba(0, 0, 0, 0.32)',
  },
} as const

export const motion = {
  fast: '120ms',
  normal: '180ms',
  slow: '240ms',
  easing: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    decelerate: 'cubic-bezier(0, 0, 0, 1)',
    accelerate: 'cubic-bezier(0.3, 0, 1, 1)',
  },
} as const

export const zIndex = {
  base: 1,
  sticky: 10,
  modal: 1100,
  dropdown: 1000,
  tooltip: 1200,
  toast: 1300,
} as const

export const controls = {
  height: { sm: '28px', md: '34px', lg: '40px' },
  paddingX: '12px',
  focusRingWidth: '3px',
} as const
