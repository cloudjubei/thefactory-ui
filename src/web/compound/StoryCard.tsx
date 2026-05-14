import type { DragEvent, ReactNode } from 'react'
import { cn } from '../utils/cn'
import Markdown from './Markdown'
import StatusControl from './StatusControl'

/**
 * The five story / feature statuses recognised across all `thefactory-*`
 * apps. Kept inline as a string union so the package has no upstream type
 * dependency on `thefactory-tools`.
 */
export type StoryStatus = '+' | '-' | '~' | '?' | '='

/** Minimal shape this card renders. Apps pass the matching subset of their
 *  own Story / Feature types — fields they don't have can be omitted. */
export type StoryCardData = {
  id: string
  title: string
  description?: string
  status: StoryStatus
  blockers?: ReadonlyArray<string>
}

export type StoryCardProps = {
  story: StoryCardData
  /** Slot for the top-left header — typically a dependency-bullet or "NEW"
   *  pill rendered by the host app. */
  headerLeft?: ReactNode
  /** Hover-revealed slot in the top-right header (group-hover, fades in). */
  actions?: ReactNode
  /** Custom slot rendered between description and the status row. */
  footer?: ReactNode
  /** Pass `false` to hide the status row entirely. */
  showStatus?: boolean
  /** Renderer for each blocker chip. Defaults to a plain text chip showing
   *  the raw dependency string; host apps pass their own renderer (e.g.
   *  desktop's `DependencyBullet`) to resolve `storyId.featureIndex` refs
   *  into friendly `#1.2` chips. */
  renderBlocker?: (dep: string) => ReactNode
  className?: string
  onClick?: () => void
  draggable?: boolean
  onDragStart?: (e: DragEvent<HTMLDivElement>) => void
  /** Forwarded to the wrapper for screen-readers. */
  ariaLabel?: string
}

/**
 * Presentational story card — pure rendering, no contexts, no app deps.
 * Used by the timeline hover card on both desktop and web, and by any
 * future consumer that wants a "card-shaped" story view. Interactive
 * behaviours (open agent runs, change status via picker, drag inside a
 * stories board) belong in the host app, which can wrap this primitive
 * and pass its richer chrome through `headerLeft` / `actions` / `footer`.
 */
export function StoryCard({
  story,
  headerLeft,
  actions,
  footer,
  showStatus = true,
  renderBlocker,
  className,
  onClick,
  draggable,
  onDragStart,
  ariaLabel,
}: StoryCardProps) {
  return (
    <div
      className={cn(
        'p-4 rounded-lg border shadow-md group',
        'bg-(--surface-raised) text-(--text-primary) border-(--border-subtle)',
        onClick && 'cursor-pointer',
        className,
      )}
      role={onClick ? 'button' : 'region'}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      draggable={draggable}
      onDragStart={onDragStart}
      aria-label={ariaLabel ?? `Story ${story.id} ${story.title}`}
    >
      {(headerLeft || actions) && (
        <div className="flex items-center justify-between text-xs mb-2 min-h-5">
          <div className="min-w-0">{headerLeft}</div>
          {actions && (
            <div className="opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150 ease-out flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      )}

      <h3 className="text-lg font-semibold mb-2" title={story.title}>
        {story.title}
      </h3>

      {story.description && (
        <div className="text-sm text-(--text-secondary) mb-2 overflow-hidden text-ellipsis">
          <Markdown text={story.description} />
        </div>
      )}

      {story.blockers && story.blockers.length > 0 && (
        <div className="flex flex-wrap items-start gap-1 mb-2">
          {story.blockers.map((b) =>
            renderBlocker ? (
              <span key={b}>{renderBlocker(b)}</span>
            ) : (
              <span
                key={b}
                className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-mono border-(--border-subtle) bg-(--surface-base) text-(--text-secondary)"
                title={`Blocker: ${b}`}
              >
                {b}
              </span>
            ),
          )}
        </div>
      )}

      {footer}

      {showStatus && (
        <div className="flex items-center gap-2 mt-1">
          <StatusControl status={story.status} />
        </div>
      )}
    </div>
  )
}
