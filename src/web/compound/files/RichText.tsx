import { Fragment, useMemo, type ReactNode } from 'react'
import FileDisplay, { type UikitFileMeta } from './FileDisplay'

const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
// Build the dep pattern once; the file pattern is a literal. Both regexes are
// instantiated *per call* in `tokenize` so the `/g` flag's `lastIndex` cursor
// can't leak across calls (e.g. if a future change throws mid-scan).
const FILE_PATTERN = '@([A-Za-z0-9_\\-./]+)'
const DEP_PATTERN = `#((?:${UUID})|(?:\\d+))(?:\\.((?:${UUID})|(?:\\d+)))?`

type Segment =
  | { type: 'text'; value: string }
  | { type: 'file'; value: string; raw: string }
  | { type: 'dep'; value: string; raw: string }

function tokenize(input: string): Segment[] {
  if (!input) return [{ type: 'text', value: '' }]

  type Match = { index: number; length: number; type: 'file' | 'dep'; value: string; raw: string }
  const matches: Match[] = []

  const fileRe = new RegExp(FILE_PATTERN, 'g')
  const depRe = new RegExp(DEP_PATTERN, 'g')

  let m: RegExpExecArray | null
  while ((m = fileRe.exec(input))) {
    matches.push({ index: m.index, length: m[0].length, type: 'file', value: m[1], raw: m[0] })
  }
  while ((m = depRe.exec(input))) {
    matches.push({
      index: m.index,
      length: m[0].length,
      type: 'dep',
      value: m[0].slice(1),
      raw: m[0],
    })
  }
  matches.sort((a, b) => a.index - b.index)

  const parts: Segment[] = []
  let lastIndex = 0
  for (const mt of matches) {
    if (mt.index > lastIndex) parts.push({ type: 'text', value: input.slice(lastIndex, mt.index) })
    parts.push({ type: mt.type, value: mt.value, raw: mt.raw })
    lastIndex = mt.index + mt.length
  }
  if (lastIndex < input.length) parts.push({ type: 'text', value: input.slice(lastIndex) })
  return parts
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
  const segments = useMemo(() => tokenize(text ?? ''), [text])

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
