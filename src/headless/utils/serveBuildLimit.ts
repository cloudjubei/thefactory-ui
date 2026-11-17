import {
  SERVE_BUILD_LIMIT_COPY,
  SERVE_BUILD_LIMIT_DEFAULT_MS,
  SERVE_BUILD_LIMIT_METADATA_KEY,
  SERVE_BUILD_LIMIT_MINUTE_MS,
} from './serveBuildLimitConstants'

/** The build limit as the serve settings field shows it. */
export type ServeBuildLimitField = {
  /** What the field shows. Empty when the project uses the default and nothing is typed. */
  text: string
  /** The default, in minutes, shown while the field is empty. */
  placeholder: string
  /** Why a blank field is the default. */
  hint: string
  /** Why the typed value cannot be saved. */
  error?: string
  /** A save would change the limit the project holds. */
  dirty: boolean
}

const heldMs = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : undefined

/** The minutes a stored millisecond limit shows, without trailing zeros. */
export function serveBuildLimitMinutesText(ms: number): string {
  const minutes = ms / SERVE_BUILD_LIMIT_MINUTE_MS
  if (Number.isInteger(minutes)) return String(minutes)
  return minutes.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')
}

const placeholder = serveBuildLimitMinutesText(SERVE_BUILD_LIMIT_DEFAULT_MS)
const hint = SERVE_BUILD_LIMIT_COPY.hint(placeholder)

/**
 * The build limit stored on a project, in milliseconds.
 * Anything that is not a positive whole number of milliseconds counts as unset, so the default applies.
 */
export function readServeBuildTimeoutMs(
  metadata: Record<string, unknown> | null | undefined,
): number | undefined {
  return heldMs(metadata?.[SERVE_BUILD_LIMIT_METADATA_KEY])
}

function parseMinutes(text: string): { ms?: number; error?: string } {
  const trimmed = text.trim()
  if (trimmed === '') return {}
  const value = Number(trimmed)
  const ms = Math.round(value * SERVE_BUILD_LIMIT_MINUTE_MS)
  if (!Number.isFinite(value) || !Number.isSafeInteger(ms) || ms <= 0) {
    return { error: SERVE_BUILD_LIMIT_COPY.invalid }
  }
  return { ms }
}

/**
 * The field for a stored limit and what the person has typed.
 * `typed` left out shows the stored limit, or an empty field when the project uses the default.
 */
export function serveBuildLimitField(
  storedMs: number | undefined,
  typed: string | undefined,
): ServeBuildLimitField {
  const stored = heldMs(storedMs)
  const storedText = stored === undefined ? '' : serveBuildLimitMinutesText(stored)
  const text = typed ?? storedText
  const parsed = parseMinutes(text)
  const next = parsed.error ? undefined : parsed.ms
  const same = next === stored
  return {
    text,
    placeholder,
    hint,
    ...(parsed.error ? { error: parsed.error } : {}),
    dirty: !parsed.error && !same,
  }
}

/**
 * Metadata after saving the field's text. A blank field drops the key so the default applies.
 * Text that cannot be saved leaves the metadata as it was. Other keys are kept: a project
 * update replaces its metadata whole.
 */
export function withServeBuildTimeout(
  metadata: Record<string, unknown> | null | undefined,
  text: string,
): Record<string, unknown> {
  const parsed = parseMinutes(text)
  const next: Record<string, unknown> = { ...(metadata ?? {}) }
  if (parsed.error) return next
  if (parsed.ms === undefined) delete next[SERVE_BUILD_LIMIT_METADATA_KEY]
  else next[SERVE_BUILD_LIMIT_METADATA_KEY] = parsed.ms
  return next
}
