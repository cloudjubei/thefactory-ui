import { useCallback, useState } from 'react'
import { StructuredUnifiedDiff, type IntraMode } from './diffUtils'
import { IconWarningTriangle } from '../../icons'

/**
 * The subset of a git text-recovery result this view renders. Kept structural
 * (not the SDK type) so the web layer stays decoupled from the generated API —
 * the host passes `useGit().recoverTextDiff(...)`, whose result is a superset.
 */
export interface BinaryDiffRecovery {
  /** True when both sides sanitized to plausible text and a diff was produced. */
  recovered: boolean
  /** Unified diff between the sanitized sides; present (maybe empty) when recovered. */
  patch?: string
  before: { size: number; wasBinary: boolean; reason?: string }
  after: { size: number; wasBinary: boolean; reason?: string }
}

export interface BinaryDiffViewProps {
  path: string
  /**
   * `'binary'` — git flagged the file binary (no textual patch).
   * `'unparseable'` — a patch exists but parsed to zero hunks.
   */
  reason: 'binary' | 'unparseable'
  /** Byte size of the before side (HEAD/index), when known. */
  beforeSize?: number
  /** Byte size of the after side (index/working tree), when known. */
  afterSize?: number
  /**
   * On-demand "quick fix": sanitize both sides in memory and return a text
   * diff. Absent ⇒ no recovery affordance (e.g. ref-to-ref diffs with no
   * working tree to repair).
   */
  onRecover?: () => Promise<BinaryDiffRecovery>
  /**
   * Persist the fix — write the sanitized content back to the working-tree
   * file. Absent ⇒ preview only.
   */
  onApplyRecovery?: () => void | Promise<void>
  /** Render options for the recovered preview diff. */
  diffOpts?: { wrap: boolean; ignoreWS: boolean; intra: IntraMode }
}

function formatBytes(n: number | undefined): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function reasonLabel(reason?: string): string | null {
  if (reason === 'nul-bytes') return 'contains NUL bytes'
  if (reason === 'invalid-utf8') return 'contains invalid UTF-8'
  return null
}

/**
 * SourceTree-style view for a file whose diff can't be shown as text — a binary
 * file or a payload that didn't parse into hunks. Shows a Before → After byte
 * summary and, when the host supplies recovery callbacks, a "quick fix" that
 * sanitizes the file in memory and previews the recovered text diff (with an
 * optional apply-to-disk action).
 */
export function BinaryDiffView({
  path,
  reason,
  beforeSize,
  afterSize,
  onRecover,
  onApplyRecovery,
  diffOpts,
}: BinaryDiffViewProps) {
  const [recovery, setRecovery] = useState<BinaryDiffRecovery | null>(null)
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runRecover = useCallback(async () => {
    if (!onRecover) return
    setLoading(true)
    setError(null)
    try {
      setRecovery(await onRecover())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [onRecover])

  const runApply = useCallback(async () => {
    if (!onApplyRecovery) return
    setApplying(true)
    setError(null)
    try {
      await onApplyRecovery()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setApplying(false)
    }
  }, [onApplyRecovery])

  const headline =
    reason === 'binary' ? 'Binary file — no text diff' : "Couldn't parse this diff as text"
  // The side most likely to carry the corruption drives the inline note.
  const corruptionNote =
    reasonLabel(recovery?.after.reason) || reasonLabel(recovery?.before.reason)
  const delta = typeof beforeSize === 'number' && typeof afterSize === 'number'
    ? afterSize - beforeSize
    : undefined

  return (
    <div className="p-3 text-xs text-(--text-primary)">
      <div className="rounded-md border border-(--border-subtle) bg-(--surface-muted) p-3">
        <div className="flex items-center gap-2 font-medium text-(--text-primary)">
          <IconWarningTriangle className="w-3.5 h-3.5 text-(--color-amber-600) flex-none" />
          <span>{headline}</span>
        </div>

        {/* Before → After byte summary (SourceTree-style). */}
        <div className="mt-2 flex items-center gap-3 font-mono text-(--text-secondary)">
          <span>
            Before <span className="text-(--text-primary)">{formatBytes(beforeSize)}</span>
          </span>
          <span aria-hidden>→</span>
          <span>
            After <span className="text-(--text-primary)">{formatBytes(afterSize)}</span>
          </span>
          {typeof delta === 'number' && delta !== 0 && (
            <span className={delta > 0 ? 'text-(--color-green-600)' : 'text-(--color-red-600)'}>
              {delta > 0 ? '+' : ''}
              {delta} B
            </span>
          )}
        </div>

        {onRecover && !recovery && (
          <button
            type="button"
            onClick={runRecover}
            disabled={loading}
            className="mt-3 px-3 py-1 rounded text-[11px] font-medium border transition-colors bg-(--surface-raised) hover:bg-(--surface-hover) border-(--border-default) text-(--text-primary) disabled:opacity-60"
          >
            {loading ? 'Recovering…' : 'Quick fix · recover as text'}
          </button>
        )}

        {error && <div className="mt-2 text-(--color-red-600)">{error}</div>}
      </div>

      {recovery && !recovery.recovered && (
        <div className="mt-3 rounded-md border border-(--border-subtle) p-3 text-(--text-secondary)">
          This looks like a genuine binary file — it can't be recovered as text.
        </div>
      )}

      {recovery && recovery.recovered && (
        <div className="mt-3 rounded-md border border-(--border-subtle) overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-(--surface-muted) border-b border-(--border-subtle)">
            <span className="text-(--text-secondary)">
              Recovered preview (in-memory)
              {corruptionNote ? ` — ${corruptionNote}` : ''}
            </span>
            {onApplyRecovery && (
              <button
                type="button"
                onClick={runApply}
                disabled={applying}
                className="px-3 py-1 rounded text-[11px] font-medium bg-green-600 hover:bg-green-700 active:bg-green-800 text-white transition-colors disabled:opacity-60"
              >
                {applying ? 'Applying…' : 'Apply fix to working tree'}
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-auto">
            {recovery.patch && recovery.patch.trim() ? (
              <StructuredUnifiedDiff
                patch={recovery.patch}
                wrap={diffOpts?.wrap ?? false}
                ignoreWhitespace={diffOpts?.ignoreWS ?? false}
                intraline={diffOpts?.intra ?? 'none'}
              />
            ) : (
              <div className="p-3 text-(--text-muted)">
                No textual differences — only binary/corruption bytes changed in {path}.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
