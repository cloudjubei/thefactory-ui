// Emits src/web/styles/tokens.css from the TS token source.
// Run via: npm run generate:tokens
//
// The TS source is authoritative. Hand-editing tokens.css is a smell —
// fix the TS source and re-run instead.

import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { palette } from '../src/tokens/colors'
import {
  darkTheme,
  lightTheme,
  type SemanticTheme,
  type StatusTokens,
} from '../src/tokens/semantic'
import {
  controls,
  fontFamilies,
  fontSizes,
  fontWeights,
  lineHeights,
  motion,
  radii,
  shadows,
  space,
  zIndex,
} from '../src/tokens/metrics'

const HEADER = `/* AUTO-GENERATED from src/tokens/. Do not edit by hand. */
/* Run: npm run generate:tokens */
`

function paletteVars(): string[] {
  const out: string[] = []
  out.push('  /* Palette ramps */')
  for (const [rampName, ramp] of Object.entries(palette)) {
    for (const [step, hex] of Object.entries(ramp)) {
      out.push(`  --color-${rampName}-${step}: ${hex};`)
    }
    out.push('')
  }
  return out
}

function statusVars(s: StatusTokens, includeBlockedBg: boolean): string[] {
  const out: string[] = []
  out.push('  /* Status: bold */')
  out.push(`  --status-empty-bg: ${s.empty.bg};`)
  out.push(`  --status-empty-fg: ${s.empty.fg};`)
  out.push(`  --status-done-bg: ${s.done.bg};`)
  out.push(`  --status-done-fg: ${s.done.fg};`)
  out.push(`  --status-working-bg: ${s.working.bg};`)
  out.push(`  --status-working-fg: ${s.working.fg};`)
  out.push(`  --status-stuck-bg: ${s.stuck.bg};`)
  out.push(`  --status-stuck-fg: ${s.stuck.fg};`)
  out.push(`  --status-on_hold-bg: ${s.on_hold.bg};`)
  out.push(`  --status-on_hold-fg: ${s.on_hold.fg};`)
  out.push(`  --status-review-bg: ${s.review.bg};`)
  out.push(`  --status-review-fg: ${s.review.fg};`)
  out.push(`  --status-queued-bg: ${s.queued.bg};`)
  out.push(`  --status-queued-fg: ${s.queued.fg};`)
  if (includeBlockedBg) {
    out.push(`  --status-blocked-bg: ${s.blocked.bg};`)
    out.push(`  --status-blocked-fg: ${s.blocked.fg};`)
  }
  out.push('')
  out.push('  /* Status: soft */')
  for (const key of ['empty', 'done', 'working', 'stuck', 'on_hold', 'review', 'queued'] as const) {
    const v = s[key]
    out.push(`  --status-${key}-soft-bg: ${v.softBg};`)
    out.push(`  --status-${key}-soft-fg: ${v.softFg};`)
    out.push(`  --status-${key}-soft-border: ${v.softBorder};`)
  }
  return out
}

function semanticVars(theme: SemanticTheme): string[] {
  const out: string[] = []
  out.push(`  color-scheme: ${theme.colorScheme};`)
  out.push('  /* Surfaces */')
  out.push(`  --surface-base: ${theme.surface.base};`)
  out.push(`  --surface-raised: ${theme.surface.raised};`)
  out.push(`  --surface-overlay: ${theme.surface.overlay};`)
  out.push(`  --surface-muted: ${theme.surface.muted};`)
  out.push(`  --surface-hover: ${theme.surface.hover};`)
  out.push('  --surface-0: var(--surface-base);')
  out.push('  --surface-1: var(--surface-raised);')
  out.push('  --surface-2: var(--surface-overlay);')
  out.push('')
  out.push('  /* Text */')
  out.push(`  --text-primary: ${theme.text.primary};`)
  out.push(`  --text-secondary: ${theme.text.secondary};`)
  out.push(`  --text-muted: ${theme.text.muted};`)
  out.push(`  --text-inverted: ${theme.text.inverted};`)
  out.push('')
  out.push('  /* Borders */')
  out.push(`  --border-subtle: ${theme.border.subtle};`)
  out.push(`  --border-default: ${theme.border.default};`)
  out.push(`  --border-strong: ${theme.border.strong};`)
  out.push(`  --border-focus: ${theme.border.focus};`)
  out.push('')
  out.push('  /* Accents */')
  out.push(`  --accent-primary: ${theme.accent.primary};`)
  out.push(`  --accent-primary-hover: ${theme.accent.primaryHover};`)
  out.push(`  --accent-primary-active: ${theme.accent.primaryActive};`)
  out.push('')
  out.push(`  --focus-ring: ${theme.focusRing};`)
  out.push('')
  return out
}

function metricsVars(): string[] {
  const out: string[] = []
  out.push('  /* Typography */')
  out.push(`  --font-sans: ${fontFamilies.sans};`)
  out.push(`  --font-mono: ${fontFamilies.mono};`)
  for (const [k, v] of Object.entries(fontSizes)) out.push(`  --fs-${k}: ${v};`)
  for (const [k, v] of Object.entries(lineHeights)) out.push(`  --lh-${k}: ${v};`)
  for (const [k, v] of Object.entries(fontWeights)) out.push(`  --fw-${k}: ${v};`)
  out.push('')
  out.push('  /* Spacing */')
  for (const [k, v] of Object.entries(space)) out.push(`  --space-${k}: ${v};`)
  out.push('')
  out.push('  /* Radii */')
  for (const [k, v] of Object.entries(radii)) out.push(`  --radius-${k}: ${v};`)
  out.push('')
  out.push('  /* Motion */')
  out.push(`  --motion-fast: ${motion.fast};`)
  out.push(`  --motion-normal: ${motion.normal};`)
  out.push(`  --motion-slow: ${motion.slow};`)
  out.push(`  --easing-standard: ${motion.easing.standard};`)
  out.push(`  --easing-decelerate: ${motion.easing.decelerate};`)
  out.push(`  --easing-accelerate: ${motion.easing.accelerate};`)
  out.push('')
  out.push('  /* Z-index */')
  for (const [k, v] of Object.entries(zIndex)) out.push(`  --z-${k}: ${v};`)
  out.push('')
  out.push('  /* Controls */')
  out.push(`  --control-h-sm: ${controls.height.sm};`)
  out.push(`  --control-h-md: ${controls.height.md};`)
  out.push(`  --control-h-lg: ${controls.height.lg};`)
  out.push(`  --control-pad-x: ${controls.paddingX};`)
  out.push(`  --focus-ring-width: ${controls.focusRingWidth};`)
  return out
}

function shadowVars(themeName: 'light' | 'dark'): string[] {
  const s = shadows[themeName]
  return [
    '  /* Shadows */',
    `  --shadow-0: ${s[0]};`,
    `  --shadow-1: ${s[1]};`,
    `  --shadow-2: ${s[2]};`,
    `  --shadow-3: ${s[3]};`,
    `  --shadow-4: ${s[4]};`,
  ]
}

function build(): string {
  const lines: string[] = [HEADER, '']

  lines.push(':root {')
  lines.push(...paletteVars())
  lines.push(...semanticVars(lightTheme))
  lines.push(...statusVars(lightTheme.status, true))
  lines.push('')
  lines.push(...metricsVars())
  lines.push('')
  lines.push(...shadowVars('light'))
  lines.push('}')
  lines.push('')

  lines.push('.dark,')
  lines.push("[data-theme='dark'] {")
  lines.push(...semanticVars(darkTheme))
  lines.push(...statusVars(darkTheme.status, false))
  lines.push('')
  lines.push(...shadowVars('dark'))
  lines.push('}')
  lines.push('')

  return lines.join('\n')
}

const here = dirname(fileURLToPath(import.meta.url))
const out = resolve(here, '..', 'src/web/styles/tokens.css')
writeFileSync(out, build())
console.log(`tokens.css written → ${out}`)
