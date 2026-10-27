import { PathDisplay } from '../../PathDisplay'
import type { ToolArgDisplay } from '../../../../headless/utils/toolPreview'

/**
 * The collapsed one-line tool input shown between the tool name and the time
 * chip — or on its own line under them when the row is narrow. A file path (or
 * list of paths) renders with the same dir+filename display used in the Git
 * views; a command / search pattern renders as a compact code snippet. It
 * truncates to fit.
 */
export default function ToolArgInline({
  display,
  className = '',
}: {
  display: ToolArgDisplay | null
  className?: string
}) {
  if (!display) return <span className={`flex-1 ${className}`} />

  if (display.kind === 'path') {
    return (
      <div className={`flex-1 min-w-0 ${className}`}>
        <PathDisplay path={display.path} />
      </div>
    )
  }

  if (display.kind === 'paths') {
    // One after another, each shrinking to its file name and then an ellipsis —
    // never cut mid-word; the full list is available when the card is expanded.
    return (
      <div className={`flex-1 min-w-0 flex items-baseline gap-3 overflow-hidden ${className}`}>
        {display.paths.map((p, i) => (
          <span key={`${i}-${p}`} className="max-w-[240px] min-w-0">
            <PathDisplay path={p} />
          </span>
        ))}
      </div>
    )
  }

  const snippet = display.text.replace(/\s+/g, ' ').trim()
  return (
    <code
      className={`font-mono text-[11px] text-(--text-secondary) bg-(--surface-base) border border-(--border-subtle) rounded px-1.5 py-0.5 truncate min-w-0 flex-1 ${className}`}
    >
      {snippet}
    </code>
  )
}
