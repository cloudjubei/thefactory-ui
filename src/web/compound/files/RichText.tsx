import { Fragment, useMemo, type ReactNode } from 'react'
import FileDisplay, { type UikitFileMeta } from './FileDisplay'
import { tokenizeRichText } from '../../../headless/utils/richTextTokenize'

export type RichTextProps = {
  text: string | null | undefined
  /**
   * `display` (default) renders mentions as chips / dep bullets via the supplied resolvers.
   * `input` is for an overlay layered behind a textarea: it preserves exact character widths
   * so mentions only get visual styling, never structural padding/margins.
   */
  variant?: 'display' | 'input'
  /**
   * In `input` variant: when the caret is editing a mention, suppress its chip styling
   * (so backspace/typing doesn't visually jitter). The library doesn't track the caret —
   * the consumer passes the live range.
   */
  inputEditRange?: { start: number; end: number } | null
  /**
   * Resolves an `@<token>` to a file. Receives the token without the leading `@`.
   * Returning `null` renders an unresolved-mention pill.
   */
  onResolveFile?: (token: string) => UikitFileMeta | null
  /**
   * Renders a `#<dep>` reference. Receives the dep value (without the leading `#`).
   * When omitted, renders the raw token as text.
   */
  renderDependency?: (dep: string) => ReactNode
  /** Async preview loader forwarded to inline `FileDisplay`. Optional. */
  onReadPreview?: (relativePath: string) => Promise<string | null>
}

export default function RichText({
  text,
  variant = 'display',
  inputEditRange,
  onResolveFile,
  renderDependency,
  onReadPreview,
}: RichTextProps) {
  const segments = useMemo(() => tokenizeRichText(text ?? ''), [text])

  if (variant === 'input') {
    let pos = 0
    return (
      <>
        {segments.map((seg, idx) => {
          if (seg.type === 'text') {
            const out = <Fragment key={idx}>{seg.value}</Fragment>
            pos += seg.value.length
            return out
          }
          const start = pos
          const end = start + seg.raw.length
          pos = end
          const isEditing = !!(
            inputEditRange &&
            Math.max(start, inputEditRange.start) < Math.min(end, inputEditRange.end)
          )
          if (isEditing) return <Fragment key={idx}>{seg.raw}</Fragment>
          const isFile = seg.type === 'file'
          return (
            <span
              key={idx}
              className="inline align-baseline rounded-sm px-1 py-px border border-(--border-subtle) text-(--text-primary)"
              style={{
                background: isFile
                  ? 'color-mix(in srgb, var(--accent-primary) 10%, transparent)'
                  : 'color-mix(in srgb, var(--accent-secondary, #a78bfa) 10%, transparent)',
              }}
            >
              {seg.raw}
            </span>
          )
        })}
      </>
    )
  }

  return (
    <>
      {segments.map((seg, idx) => {
        if (seg.type === 'text') return <Fragment key={idx}>{seg.value}</Fragment>
        if (seg.type === 'dep') {
          return (
            <Fragment key={idx}>
              {renderDependency ? renderDependency(seg.value) : seg.raw}
            </Fragment>
          )
        }
        const meta = onResolveFile?.(seg.value) ?? null
        if (!meta) {
          return (
            <span
              key={idx}
              className="inline rounded-sm px-1 py-px border border-dashed border-(--border-subtle) text-(--text-secondary)"
              title={`File not found: ${seg.value}`}
            >
              @{seg.value}
            </span>
          )
        }
        return (
          <span key={idx} className="inline-block align-baseline">
            <FileDisplay
              file={meta}
              density="compact"
              interactive={false}
              showPreviewOnHover
              showMeta={false}
              onReadPreview={onReadPreview}
            />
          </span>
        )
      })}
    </>
  )
}
