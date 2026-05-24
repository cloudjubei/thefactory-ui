import type { CSSProperties } from 'react'

export type LLMProviderId =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'google'
  | 'xai'
  | 'deepseek'
  | 'llama'
  | 'meta'
  | 'qwen'

interface ProviderStyle {
  /** Letter shown inside the monogram badge. */
  letter: string
  /** Brand-leaning solid background. */
  bg: string
  /** Foreground colour used for the letter. */
  fg: string
}

// Brand colours are deliberately simple monograms rather than the
// trademarked logos so we stay vendor-neutral and never need to ship
// per-provider SVG assets. Keys are normalised to lowercase before lookup.
const PROVIDER_STYLES: Record<LLMProviderId, ProviderStyle> = {
  openai: { letter: 'O', bg: '#0d9488', fg: '#ffffff' },
  anthropic: { letter: 'A', bg: '#d97706', fg: '#ffffff' },
  gemini: { letter: 'G', bg: '#2563eb', fg: '#ffffff' },
  google: { letter: 'G', bg: '#2563eb', fg: '#ffffff' },
  xai: { letter: 'X', bg: '#111827', fg: '#ffffff' },
  deepseek: { letter: 'D', bg: '#7c3aed', fg: '#ffffff' },
  llama: { letter: 'L', bg: '#16a34a', fg: '#ffffff' },
  meta: { letter: 'L', bg: '#16a34a', fg: '#ffffff' },
  qwen: { letter: 'Q', bg: '#dc2626', fg: '#ffffff' },
}

function normalise(provider: string): LLMProviderId | null {
  const k = provider.trim().toLowerCase()
  if (k in PROVIDER_STYLES) return k as LLMProviderId
  return null
}

export interface LLMProviderIconProps {
  provider: string
  size?: number
  className?: string
  style?: CSSProperties
  /** When the provider isn't recognised, render a neutral monogram from the
   *  provider string's first letter rather than `null`. Default `false`. */
  fallback?: boolean
}

/**
 * Compact monogram badge that identifies an LLM provider. Returns `null`
 * for unrecognised providers unless `fallback` is set — callers can decide
 * whether to reserve space for unknown providers or omit the icon entirely.
 */
export default function LLMProviderIcon({
  provider,
  size = 16,
  className,
  style,
  fallback = false,
}: LLMProviderIconProps) {
  const key = normalise(provider)
  if (!key && !fallback) return null
  const palette: ProviderStyle = key
    ? PROVIDER_STYLES[key]
    : {
        letter: (provider.trim()[0] ?? '?').toUpperCase(),
        bg: 'var(--surface-muted)',
        fg: 'var(--text-secondary)',
      }
  return (
    <span
      aria-hidden
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.25),
        fontSize: Math.round(size * 0.625),
        fontWeight: 700,
        lineHeight: 1,
        backgroundColor: palette.bg,
        color: palette.fg,
        ...style,
      }}
    >
      {palette.letter}
    </span>
  )
}

export { PROVIDER_STYLES as LLM_PROVIDER_STYLES }
