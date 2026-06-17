import { PathDisplay } from '../../PathDisplay'
import type { ToolArgDisplay } from '../../../../headless/utils/toolPreview'

/**
 * The collapsed one-line tool input shown between the tool name and the time
 * chip. A file path (or list of paths) renders with the same dir+filename
 * display used in the Git views; a command / search pattern renders as a compact
 * code snippet. Occupies the row's flexible middle slot and truncates to fit.
 */
export default function ToolArgInline({ display }: { display: ToolArgDisplay | null }) {
  if (!display) return <span className="flex-1" />

  if (display.kind === 'path') {
    return (
      <div className="flex-1 min-w-0">
        <PathDisplay path={display.path} />
      </div>
    )
  }

  if (display.kind === 'paths') {
    // As many paths as fit, one after another; the row clips the overflow and
    // the full list is available when the card is expanded.
    return (
      <div className="flex-1 min-w-0 flex items-baseline gap-3 overflow-hidden">
        {display.paths.map((p, i) => (
          <span key={`${i}-${p}`} className="shrink-0 max-w-[240px] min-w-0">
            <PathDisplay path={p} />
          </span>
        ))}
      </div>
    )
  }

  const snippet = display.text.replace(/\s+/g, ' ').trim()
  return (
    <code className="font-mono text-[11px] text-(--text-secondary) bg-(--surface-base) border border-(--border-subtle) rounded px-1.5 py-0.5 truncate min-w-0 flex-1">
      {snippet}
    </code>
  )
}
