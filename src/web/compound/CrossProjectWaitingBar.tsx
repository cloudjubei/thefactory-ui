import { cn } from '../utils/cn'
import { Button } from '../primitives/Button'
import type { CrossProjectWaitingView } from '../../headless/utils/crossProjectWaiting'

export type CrossProjectWaitingBarProps = {
  /** The waiting view-model (`useCrossProjectRequests().waitingViewForChat(context)`). */
  view: CrossProjectWaitingView
  /** Open the background-tasks inspector — renders a "View" affordance when provided. */
  onView?: () => void
  className?: string
}

/**
 * Read-only bar shown in place of the chat composer while the chat is blocked on another project's
 * feature request. Mirrors the agent-running banner's footprint; a flagged deadlock cycle (D.5)
 * escalates it to an amber tone. Purely presentational — the host derives `view` and owns `onView`.
 */
export function CrossProjectWaitingBar({ view, onView, className }: CrossProjectWaitingBarProps) {
  const cycle = view.tone === 'cycle'
  return (
    <div
      role="status"
      className={cn(
        'flex items-center justify-between gap-2 px-4 py-3 border-t text-xs shrink-0',
        cycle
          ? 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400'
          : 'border-(--border-subtle) bg-(--surface-muted) text-(--text-secondary)',
        className,
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          aria-hidden
          className={cn(
            'inline-block h-2 w-2 rounded-full shrink-0',
            cycle ? 'bg-amber-500' : 'bg-(--accent-primary) animate-ping',
          )}
        />
        <span className="truncate">
          {cycle ? '⚠ ' : ''}
          {view.title}
        </span>
      </div>
      {onView ? (
        <Button size="sm" variant="ghost" onClick={onView}>
          View
        </Button>
      ) : null}
    </div>
  )
}
