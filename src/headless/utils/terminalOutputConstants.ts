import type { TerminalColor } from './terminalOutputTypes'

/** Foreground SGR codes (30–37, 90–97) to the colour each names. */
export const TERMINAL_SGR_COLORS: Readonly<Record<number, TerminalColor>> = {
  30: 'black',
  31: 'red',
  32: 'green',
  33: 'yellow',
  34: 'blue',
  35: 'magenta',
  36: 'cyan',
  37: 'white',
  90: 'brightBlack',
  91: 'brightRed',
  92: 'brightGreen',
  93: 'brightYellow',
  94: 'brightBlue',
  95: 'brightMagenta',
  96: 'brightCyan',
  97: 'brightWhite',
}

/** The 256-colour palette's first sixteen entries (`38;5;n`), in index order. */
export const TERMINAL_INDEXED_COLORS: readonly TerminalColor[] = [
  'black',
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'white',
  'brightBlack',
  'brightRed',
  'brightGreen',
  'brightYellow',
  'brightBlue',
  'brightMagenta',
  'brightCyan',
  'brightWhite',
]

/** The terminal block is dark in both themes, so its palette is fixed rather than themed. */
export const TERMINAL_PALETTE: Readonly<Record<TerminalColor, string>> = {
  black: '#4b5563',
  red: '#f87171',
  green: '#4ade80',
  yellow: '#facc15',
  blue: '#60a5fa',
  magenta: '#e879f9',
  cyan: '#22d3ee',
  white: '#e5e7eb',
  brightBlack: '#9ca3af',
  brightRed: '#fca5a5',
  brightGreen: '#86efac',
  brightYellow: '#fde047',
  brightBlue: '#93c5fd',
  brightMagenta: '#f0abfc',
  brightCyan: '#67e8f9',
  brightWhite: '#f9fafb',
}

export const TERMINAL_BACKGROUND = '#0d1117'
export const TERMINAL_FOREGROUND = '#d1d5db'
export const TERMINAL_BORDER = '#1f2937'
export const TERMINAL_DIM_OPACITY = 0.6

/** How tall the block grows before it scrolls inside itself. */
export const TERMINAL_MAX_HEIGHT = 240

export const TERMINAL_OUTPUT_LABEL = 'Output'
export const TERMINAL_RAW_OUTPUT_LABEL = 'Raw output'
