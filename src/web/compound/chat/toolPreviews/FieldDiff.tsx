import { useMemo, type ReactNode } from 'react'
import { SimpleSplitText } from '../../diff/SimpleUnifiedDiff'
import { InlineTextDiff } from '../../diff/InlineTextDiff'
import { SectionTitle } from './components'

function formatValue(value: unknown): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return '(empty)'
    return value.map((item) => `- ${String(item)}`).join('\n')
  }
  if (value == null || value === '') return '(empty)'
  return String(value)
}

/**
 * Tiny single-hunk unified-diff generator. We deliberately avoid a `diff`
 * dependency just for chat field previews — the `InlineTextDiff` renderer
 * only needs `@@`-delimited `-` / `+` line markers to do its word-level
 * intra-line highlighting.
 */
function buildSimpleUnifiedDiff(
  label: string,
  beforeText: string,
  afterText: string,
): string | undefined {
  if (!label || beforeText === afterText) return undefined
  const before = beforeText.split(/\r?\n/)
  const after = afterText.split(/\r?\n/)
  const header = `--- ${label}\n+++ ${label}\n@@ -1,${before.length} +1,${after.length} @@\n`
  const body =
    before.map((l) => `-${l}`).join('\n') +
    (before.length ? '\n' : '') +
    after.map((l) => `+${l}`).join('\n')
  return header + body
}

/**
 * Field-by-field diff used in story/feature update tool previews. Shows
 * either an inline word-diff or a side-by-side split — pick via
 * `sideBySide`.
 */
export function FieldDiff({
  label,
  before,
  after,
  sideBySide,
}: {
  label: string
  before: unknown
  after: unknown
  sideBySide: boolean
}) {
  const beforeText = formatValue(before)
  const afterText = formatValue(after)
  const hasChanges = beforeText !== afterText
  const patch = useMemo(
    () => buildSimpleUnifiedDiff(label, beforeText, afterText),
    [label, beforeText, afterText],
  )

  return (
    <div className="space-y-1 min-w-0">
      <SectionTitle>{label}</SectionTitle>
      {sideBySide ? (
        <SimpleSplitText
          oldText={beforeText}
          newText={hasChanges ? afterText : '(no changes)'}
          oldLabel="Current"
          newLabel="Updated"
        />
      ) : patch ? (
        <InlineTextDiff patch={patch} intraline="word" showDeletions />
      ) : (
        <div className="text-[11px] text-(--text-secondary)">No visible changes</div>
      )}
    </div>
  )
}

export function SmallBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded border border-(--border-subtle) bg-(--surface-base) px-1 py-0 text-[10px] font-medium text-(--text-secondary)">
      {children}
    </span>
  )
}

/**
 * Generic patch-preview card used by `updateStory` / `updateFeature` in
 * the tool hover-card registry — header chips + a list of `FieldDiff`s
 * for each key in the patch. The completed-state card (StoryCard /
 * FeatureCard) is host-specific; consumers render it via the
 * `completedCard` slot.
 */
export function PatchPreview({
  headerBadge,
  headerId,
  headerSub,
  patchKeys,
  before,
  after,
  sideBySide,
  completedCard,
}: {
  headerBadge: string
  headerId?: string
  headerSub?: ReactNode
  patchKeys: string[]
  before: Record<string, unknown> | undefined
  after: Record<string, unknown> | undefined
  sideBySide: boolean
  /** Rendered when the tool has completed — host-specific (StoryCard /
   * FeatureCard with full styling). When provided, replaces the diff
   * list. */
  completedCard?: ReactNode
}) {
  if (completedCard) return <>{completedCard}</>

  return (
    <div className="space-y-2 text-xs min-w-0">
      <div className="rounded border border-(--border-subtle) bg-(--surface-base) p-2 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <SmallBadge>{headerBadge}</SmallBadge>
          {headerId ? (
            <span className="font-mono text-[11px] text-(--text-secondary)">{headerId}</span>
          ) : null}
        </div>
        {headerSub}
      </div>

      {patchKeys.length > 0 ? (
        <div className="space-y-2 min-w-0">
          {patchKeys.map((key) => (
            <FieldDiff
              key={key}
              label={key}
              before={before?.[key]}
              after={after?.[key]}
              sideBySide={sideBySide}
            />
          ))}
        </div>
      ) : (
        <div className="text-[11px] text-(--text-secondary)">No changed fields</div>
      )}
    </div>
  )
}
