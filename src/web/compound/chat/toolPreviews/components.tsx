import { useMemo, useState, type ReactNode } from 'react'
import { toLines } from './utils'

export function Row({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={['text-xs leading-relaxed', className || ''].join(' ')}>{children}</div>
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] font-semibold text-(--text-secondary) mb-1">{children}</div>
  )
}

export function PreLimited({
  lines,
  maxLines = 10,
  renderTruncationMessage,
}: {
  lines: string[]
  maxLines?: number
  renderTruncationMessage?: (omitted: number) => ReactNode
}) {
  const [expanded, setExpanded] = useState(false)

  const { shownLines, omitted } = useMemo(() => {
    const safe = Array.isArray(lines) ? lines : []
    if (expanded) return { shownLines: safe, omitted: 0 }
    const slice = safe.slice(0, maxLines)
    return { shownLines: slice, omitted: Math.max(0, safe.length - slice.length) }
  }, [lines, maxLines, expanded])

  return (
    <div>
      <pre className="text-[11px] font-mono whitespace-pre-wrap break-words">
        {shownLines.join('\n')}
      </pre>
      {omitted > 0 ? (
        <button
          type="button"
          className="text-[11px] text-(--text-secondary) hover:underline"
          onClick={() => setExpanded(true)}
        >
          {renderTruncationMessage ? renderTruncationMessage(omitted) : `+ ${omitted} more`}
        </button>
      ) : null}
    </div>
  )
}

export function InlineOldNew({ oldVal, newVal }: { oldVal?: string; newVal?: string }) {
  if (!oldVal && !newVal) return null

  return (
    <div className="text-xs space-y-1">
      {oldVal ? (
        <div>
          <div className="text-[11px] text-(--text-secondary)">Old</div>
          <pre className="text-[11px] font-mono whitespace-pre-wrap break-words">{oldVal}</pre>
        </div>
      ) : null}
      {newVal ? (
        <div>
          <div className="text-[11px] text-(--text-secondary)">New</div>
          <pre className="text-[11px] font-mono whitespace-pre-wrap break-words">{newVal}</pre>
        </div>
      ) : null}
    </div>
  )
}

export function NewContentOnly({ text, label }: { text?: string; label?: string }) {
  const header = label || 'New content only. Diff unavailable.'
  const lines = toLines(text)

  return (
    <div className="text-xs space-y-1">
      <SectionTitle>{header}</SectionTitle>
      <PreLimited lines={lines} maxLines={25} />
    </div>
  )
}

export function ReorderList({
  items,
  movedId,
}: {
  items: unknown[]
  movedId?: string
}) {
  return (
    <div className="text-xs space-y-1">
      {items.map((it, idx) => {
        const item = it as { id?: string; key?: string; title?: string } | string | undefined
        const id =
          typeof item === 'string'
            ? item
            : item?.id || item?.key || item?.title || String(idx)
        const title =
          typeof item === 'object' && item ? item.title || id : (item as string) || String(id)
        const moved =
          !!movedId &&
          ((typeof item === 'object' && item?.id === movedId) || id === movedId)

        return (
          <div key={id} className={moved ? 'font-semibold' : undefined}>
            {idx + 1}. {title}
          </div>
        )
      })}
    </div>
  )
}
