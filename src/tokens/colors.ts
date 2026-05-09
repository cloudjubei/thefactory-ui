// Raw color ramps. Pure hex — usable on any platform (web, RN).
// Names match the CSS variables they back: --color-{ramp}-{step}.

export type Step = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
export type ExtendedStep = Step | 650
export type Ramp = Record<Step, string>
export type RampWithMid = Record<ExtendedStep, string>

export const gray: Ramp = {
  50: '#f9fafb',
  100: '#f3f4f6',
  200: '#e5e7eb',
  300: '#d1d5db',
  400: '#9ca3af',
  500: '#6b7280',
  600: '#4b5563',
  700: '#374151',
  800: '#1f2937',
  900: '#111827',
}

export const brand: Ramp = {
  50: '#e6f1fe',
  100: '#cce3fd',
  200: '#99c7fb',
  300: '#66abf8',
  400: '#338ff4',
  500: '#0f7eeb',
  600: '#0073ea',
  700: '#005dc1',
  800: '#004798',
  900: '#00316f',
}

export const green: Ramp = {
  50: '#e6fbf4',
  100: '#cff7ea',
  200: '#9ff0d5',
  300: '#6fe8c0',
  400: '#3fe1ab',
  500: '#1ed79b',
  600: '#00c875',
  700: '#00a862',
  800: '#00884f',
  900: '#00683c',
}

export const orange: RampWithMid = {
  50: '#fff5e9',
  100: '#ffe8cc',
  200: '#ffd199',
  300: '#ffb966',
  400: '#fda23d',
  500: '#fd9826',
  600: '#fd8e0f',
  650: '#fdab3d',
  700: '#d97500',
  800: '#b15f00',
  900: '#8a4a00',
}

export const red: Ramp = {
  50: '#fdecee',
  100: '#f9d0d5',
  200: '#f3a1ab',
  300: '#ed7381',
  400: '#e84a5e',
  500: '#e4445a',
  600: '#e2445c',
  700: '#c22f45',
  800: '#a02137',
  900: '#7d172a',
}

export const purple: RampWithMid = {
  50: '#f5ecfb',
  100: '#e6d1f8',
  200: '#cda3f1',
  300: '#b375ea',
  400: '#9b55e2',
  500: '#8b47da',
  600: '#7b3dd0',
  650: '#a25ddc',
  700: '#6632c2',
  800: '#4f26a0',
  900: '#3b1c7d',
}

export const blue: RampWithMid = {
  50: '#eff6ff',
  100: '#dbeafe',
  200: '#bfdbfe',
  300: '#93c5fd',
  400: '#60a5fa',
  500: '#3b82f6',
  600: '#2563eb',
  650: '#579bfc',
  700: '#1d4ed8',
  800: '#1e40af',
  900: '#1e3a8a',
}

export const teal: Ramp = {
  50: '#e6fbfc',
  100: '#ccf7f8',
  200: '#99eff1',
  300: '#66e8ea',
  400: '#33e0e3',
  500: '#14d6d9',
  600: '#00d1d1',
  700: '#00a8a8',
  800: '#008080',
  900: '#005858',
}

export const pink: Ramp = {
  50: '#ffe9f4',
  100: '#ffd1e8',
  200: '#ffa3d1',
  300: '#ff75ba',
  400: '#ff47a3',
  500: '#ff2e97',
  600: '#ff158a',
  700: '#d80a73',
  800: '#b0075e',
  900: '#880449',
}

export const palette = {
  gray,
  brand,
  green,
  orange,
  red,
  purple,
  blue,
  teal,
  pink,
}

export type Palette = typeof palette
