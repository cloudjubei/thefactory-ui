// Semantic tokens — surface, text, border, accent, focus, status.
// Resolved per theme. Values are CSS-shaped strings (web target).
// Some values use color-mix(), which is CSS-only — a future RN target
// must supply its own SemanticTheme with flat hex values.

import { brand, gray, green, orange, red, purple, blue } from './colors'

export interface SemanticTheme {
  colorScheme: 'light' | 'dark'

  surface: {
    base: string
    raised: string
    overlay: string
    // Solid mid-tone used for hover backgrounds, inactive rows, and subtle
    // tonal blocks that need to read as "slightly differentiated" without
    // committing to a full elevation step.
    muted: string
    // Translucent overlay tint for transient hover states layered on any surface.
    hover: string
  }

  text: {
    primary: string
    secondary: string
    muted: string
    inverted: string
  }

  border: {
    subtle: string
    default: string
    strong: string
    focus: string
  }

  accent: {
    primary: string
    primaryHover: string
    primaryActive: string
  }

  focusRing: string

  status: StatusTokens
}

export interface StatusTokens {
  empty: StatusVariant
  done: StatusVariant
  working: StatusVariant
  stuck: StatusVariant
  on_hold: StatusVariant
  review: StatusVariant
  queued: StatusVariant
  blocked: Pick<StatusVariant, 'bg' | 'fg'>
}

export interface StatusVariant {
  bg: string
  fg: string
  softBg: string
  softFg: string
  softBorder: string
}

export const lightTheme: SemanticTheme = {
  colorScheme: 'light',

  surface: {
    base: gray[50],
    raised: '#ffffff',
    overlay: '#ffffff',
    muted: gray[100],
    hover: 'color-mix(in srgb, var(--border-default) 20%, transparent)',
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

  status: {
    empty: {
      bg: '#ffffff',
      fg: '#000000',
      softBg: 'color-mix(in srgb, var(--color-gray-400) 12%, transparent)',
      softFg: gray[800],
      softBorder: gray[300],
    },
    done: {
      bg: green[600],
      fg: '#053b2e',
      softBg: 'color-mix(in srgb, var(--color-green-600) 15%, transparent)',
      softFg: green[800],
      softBorder: green[400],
    },
    working: {
      bg: orange[650],
      fg: '#231200',
      softBg: 'color-mix(in srgb, var(--color-orange-650) 18%, transparent)',
      softFg: orange[800],
      softBorder: orange[400],
    },
    stuck: {
      bg: red[600],
      fg: '#ffffff',
      softBg: 'color-mix(in srgb, var(--color-red-600) 12%, transparent)',
      softFg: red[700],
      softBorder: red[400],
    },
    on_hold: {
      bg: purple[650],
      fg: '#ffffff',
      softBg: 'color-mix(in srgb, var(--color-purple-650) 12%, transparent)',
      softFg: purple[700],
      softBorder: purple[400],
    },
    review: {
      bg: blue[650],
      fg: '#ffffff',
      softBg: 'color-mix(in srgb, var(--color-blue-650) 12%, transparent)',
      softFg: blue[700],
      softBorder: blue[400],
    },
    queued: {
      bg: '#eaeaea',
      fg: gray[800],
      softBg: 'color-mix(in srgb, var(--status-queued-bg) 30%, transparent)',
      softFg: gray[800],
      softBorder: '#d4d4d4',
    },
    blocked: {
      bg: '#b42318',
      fg: '#ffffff',
    },
  },
}

export const darkTheme: SemanticTheme = {
  colorScheme: 'dark',

  surface: {
    base: '#0b0f14',
    raised: '#121821',
    overlay: '#1a2230',
    muted: '#0e141d',
    hover: 'color-mix(in srgb, #ffffff 8%, transparent)',
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

  status: {
    empty: {
      bg: 'var(--surface-raised)',
      fg: 'var(--text-primary)',
      softBg: 'color-mix(in srgb, #ffffff 10%, transparent)',
      softFg: 'var(--text-secondary)',
      softBorder: 'color-mix(in srgb, #ffffff 35%, transparent)',
    },
    done: {
      bg: 'color-mix(in srgb, var(--color-green-600) 85%, #0b0f14)',
      fg: '#e9fff6',
      softBg: 'color-mix(in srgb, var(--color-green-600) 18%, transparent)',
      softFg: '#bbf7e1',
      softBorder: 'color-mix(in srgb, var(--color-green-600) 60%, transparent)',
    },
    working: {
      bg: 'color-mix(in srgb, var(--color-orange-650) 80%, #0b0f14)',
      fg: '#1b1200',
      softBg: 'color-mix(in srgb, var(--color-orange-650) 20%, transparent)',
      softFg: '#ffe6c7',
      softBorder: 'color-mix(in srgb, var(--color-orange-650) 60%, transparent)',
    },
    stuck: {
      bg: 'color-mix(in srgb, var(--color-red-600) 85%, #0b0f14)',
      fg: '#fff5f6',
      softBg: 'color-mix(in srgb, var(--color-red-600) 16%, transparent)',
      softFg: '#ffdadf',
      softBorder: 'color-mix(in srgb, var(--color-red-600) 60%, transparent)',
    },
    on_hold: {
      bg: 'color-mix(in srgb, var(--color-purple-650) 85%, #0b0f14)',
      fg: '#f7f1ff',
      softBg: 'color-mix(in srgb, var(--color-purple-650) 16%, transparent)',
      softFg: '#e7d8ff',
      softBorder: 'color-mix(in srgb, var(--color-purple-650) 60%, transparent)',
    },
    review: {
      bg: 'color-mix(in srgb, var(--color-blue-650) 85%, #0b0f14)',
      fg: '#f2f7ff',
      softBg: 'color-mix(in srgb, var(--color-blue-650) 16%, transparent)',
      softFg: '#d9e7ff',
      softBorder: 'color-mix(in srgb, var(--color-blue-650) 60%, transparent)',
    },
    queued: {
      bg: '#313843',
      fg: '#e5e7eb',
      softBg: 'color-mix(in srgb, var(--status-queued-bg) 40%, transparent)',
      softFg: '#e5e7eb',
      softBorder: '#505963',
    },
    blocked: {
      bg: '#b42318',
      fg: '#ffffff',
    },
  },
}
