import { Fragment, useMemo, type ReactNode } from 'react'
import { splitReferences } from 'thefactory-tools/utils'
import { useEffectiveReferenceRenderer } from '../../../headless/contexts/ReferenceRenderingContext'
import type { ReferenceSegment, ReferenceTarget } from 'thefactory-tools/types'
import FileDisplay, { type UikitFileMeta } from './FileDisplay'

/**
 * The path of a segment that names a file of this project, else `undefined` —
 * another project's file is a reference chip, not a file of this one.
 */
function filePath(seg: ReferenceSegment): string | undefined {
  return seg.type === 'reference' && seg.reference.kind === 'file' && !seg.reference.projectId
    ? seg.reference.path
    : undefined
}

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
   * Renders every reference other than a file — a story, feature, note or
   * attachment, or what was typed for one (`#3.2`, `&qa-login`). Returning
   * `undefined`, or omitting it, renders the token as text.
   */
  renderReference?: (target: ReferenceTarget) => ReactNode | undefined
  /** Chip what was typed (`#3.2`, `&qa-login`) as well as what was sent as ids. */
  typedReferences?: boolean
  /** Async preview loader forwarded to inline `FileDisplay`. Optional. */
  onReadPreview?: (relativePath: string) => Promise<string | null>
}

export default function RichText({
  text,
  variant = 'display',
  inputEditRange,
  onResolveFile,
  renderReference: ownRenderReference,
  typedReferences = false,
  onReadPreview,
}: RichTextProps) {
  const renderReference = useEffectiveReferenceRenderer(ownRenderReference, typedReferences)
  const segments = useMemo(() => splitReferences(text ?? ''), [text])

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
          const isFile = filePath(seg) !== undefined
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
        const path = filePath(seg)
        // Without a file resolver of its own, a file goes to the app's renderer,
        // which knows the project's files; one it does not know reads as written.
        if (path === undefined || !onResolveFile) {
          return <Fragment key={idx}>{renderReference?.(seg) ?? seg.raw}</Fragment>
        }
        const meta = onResolveFile?.(path) ?? null
        if (!meta) {
          return (
            <span
              key={idx}
              className="inline rounded-sm px-1 py-px border border-dashed border-(--border-subtle) text-(--text-secondary)"
              title={`File not found: ${path}`}
            >
              @{path}
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
