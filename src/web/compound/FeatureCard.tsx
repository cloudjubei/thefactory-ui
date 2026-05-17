import type { ReactNode } from 'react'
import { cn } from '../utils/cn'
import Markdown from './Markdown'
import type { StoryStatus } from './StoryCard'
import StatusControl from './StatusControl'

/** Minimal feature shape this card renders. */
export type FeatureCardData = {
  id: string
  title: string
  description?: string
  status: StoryStatus
  blockers?: ReadonlyArray<string>
}

export type FeatureCardProps = {
  feature: FeatureCardData
  /** Slot for the top-left header — typically a dependency-bullet or "NEW" pill. */
  headerLeft?: ReactNode
  /** Hover-revealed slot in the top-right header. */
  actions?: ReactNode
  /** Custom slot rendered between description and the status row. */
  footer?: ReactNode
  /** Renderer for each blocker chip — see `StoryCardProps.renderBlocker`. */
  renderBlocker?: (dep: string) => ReactNode
  showStatus?: boolean
  /** When provided, the status chip becomes an inline picker. */
  onStatusChange?: (status: StoryStatus) => void
  className?: string
  onClick?: () => void
  ariaLabel?: string
}

/**
 * Presentational feature card — see `StoryCard` for design notes. The card
 * stands on its own and intentionally does not surface a parent-story
 * subtitle; the host app puts a dependency-bullet or label in `headerLeft`
 * when context is needed.
 */
export function FeatureCard({
  feature,
  headerLeft,
  actions,
  footer,
  showStatus = true,
  onStatusChange,
  renderBlocker,
  className,
  onClick,
  ariaLabel,
}: FeatureCardProps) {
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
      aria-label={ariaLabel ?? `Feature ${feature.id} ${feature.title}`}
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

      <h3 className="text-lg font-semibold mb-2" title={feature.title}>
        {feature.title}
      </h3>

      {feature.description && (
        <div className="text-sm text-(--text-secondary) mb-2 overflow-hidden text-ellipsis">
          <Markdown text={feature.description} />
        </div>
      )}

      {feature.blockers && feature.blockers.length > 0 && (
        <div className="flex flex-wrap items-start gap-1 mb-2">
          {feature.blockers.map((b) =>
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
          <StatusControl status={feature.status} onChange={onStatusChange} />
        </div>
      )}
    </div>
  )
}
