// Semantic tokens — surface, text, border, accent, focus, status.
// Resolved per theme. Values are CSS-shaped strings (web target).
// Some values use color-mix(), which is CSS-only — a future RN target
// must supply its own SemanticTheme with flat hex values.

import { brand, gray, green, orange, red, purple, sky, gold } from './colors'

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
    /** A selection, a note or a hand-off tinted in the brand blue — never a status. */
    softBg: string
    softFg: string
    softBorder: string
  }

  focusRing: string

  status: StatusTokens
}

export interface StatusTokens {
  empty: StatusVariant
  done: StatusVariant
  /** Work an agent is doing right now — sky blue, apart from done's green and the sign-off's gold. */
  running: StatusVariant
  working: StatusVariant
  stuck: StatusVariant
  on_hold: StatusVariant
  /** A decision waiting on the person, the sign-off first — gold, yellower than working's orange. */
  review: StatusVariant
  queued: StatusVariant
  blocked: StatusVariant
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
    softBg: 'color-mix(in srgb, var(--color-brand-600) 10%, transparent)',
    softFg: brand[700],
    softBorder: brand[300],
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
    running: {
      bg: sky[700],
      fg: '#ffffff',
      softBg: 'color-mix(in srgb, var(--color-sky-600) 14%, transparent)',
      softFg: sky[700],
      softBorder: sky[400],
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
      bg: gold[500],
      fg: '#2b2200',
      softBg: 'color-mix(in srgb, var(--color-gold-500) 18%, transparent)',
      softFg: gold[800],
      softBorder: gold[400],
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
      softBg: 'color-mix(in srgb, #b42318 12%, transparent)',
      softFg: '#b42318',
      softBorder: 'color-mix(in srgb, #b42318 45%, transparent)',
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
    softBg: 'color-mix(in srgb, var(--color-brand-500) 18%, transparent)',
    softFg: brand[200],
    softBorder: 'color-mix(in srgb, var(--color-brand-500) 55%, transparent)',
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
    running: {
      bg: 'color-mix(in srgb, var(--color-sky-500) 90%, #0b0f14)',
      fg: '#04202e',
      softBg: 'color-mix(in srgb, var(--color-sky-500) 18%, transparent)',
      softFg: sky[200],
      softBorder: 'color-mix(in srgb, var(--color-sky-500) 60%, transparent)',
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
      bg: 'color-mix(in srgb, var(--color-gold-500) 85%, #0b0f14)',
      fg: '#1f1800',
      softBg: 'color-mix(in srgb, var(--color-gold-500) 18%, transparent)',
      softFg: gold[200],
      softBorder: 'color-mix(in srgb, var(--color-gold-500) 60%, transparent)',
    },
    queued: {
      bg: '#313843',
      fg: '#e5e7eb',
      softBg: 'color-mix(in srgb, var(--status-queued-bg) 40%, transparent)',
      softFg: '#e5e7eb',
      softBorder: '#505963',
    },
    blocked: {
      bg: 'color-mix(in srgb, #b42318 85%, #0b0f14)',
      fg: '#ffe4e0',
      softBg: 'color-mix(in srgb, #b42318 22%, transparent)',
      softFg: '#ffc9c4',
      softBorder: 'color-mix(in srgb, #b42318 55%, transparent)',
    },
  },
}
