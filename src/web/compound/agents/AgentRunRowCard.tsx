import type { ReactNode } from 'react'
import StatusChip, { type ChipState } from '../chips/StatusChip'
import { IconDelete, IconThumbDown, IconThumbUp } from '../../icons'
import { Button } from '../../primitives/Button'

export type AgentRunRowCardData = {
  /** Stable key used for the run id chip. */
  runId?: string
  /** Run state for the status chip. Defaults to `created`. */
  state?: ChipState
  /** Number of messages in the run, displayed inline. */
  messageCount?: number
  /** Total run cost in USD; rendered when > 0. */
  totalCostUSD?: number
  /** Optional rating score; -1 = down, 0/undefined = none, 1 = up. */
  ratingScore?: number
  /** Subtype label rendered as monospaced `<type> · <runId>` suffix. */
  type?: 'feature' | 'story' | string
}

export type AgentRunRowCardProps = {
  /** Resolved title shown as the row's primary label. */
  target: ReactNode
  run: AgentRunRowCardData
  /** Open the run's detail surface (chat / inspector). */
  onOpen: () => void
  /** Cancel an active run. Renders the Cancel button when provided. */
  onCancel?: () => void
  /** Delete a finished run. Renders the trash icon when provided. */
  onDelete?: () => void
  /**
   * Rate the run. Caller decides the toggle semantics: clicking the same
   * direction twice should call back with `0` to clear. Renders both
   * up/down buttons.
   */
  onRate?: (score: number) => void
  className?: string
}

function RatingButton({
  icon,
  ariaLabel,
  isActive,
  onClick,
}: {
  icon: ReactNode
  ariaLabel: string
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={isActive}
      onClick={onClick}
      className="p-1 rounded"
      style={{ opacity: isActive ? 1 : 0.4 }}
    >
      {icon}
    </button>
  )
}

/**
 * Card-shaped agent-run row. Used by web's Agents view and the upcoming RN
 * target — mobile-friendly inline layout with the title on top of a `type ·
 * runId` subline, and a chip cluster on the right (status, message count,
 * cost, rating, cancel / delete).
 *
 * Pure presentational primitive: caller wires its own context lookups
 * (target title, ratings store, run lifecycle), tilts the chrome via
 * `onCancel` / `onDelete` slots, and binds row interaction via `onOpen`.
 */
export default function AgentRunRowCard({
  target,
  run,
  onOpen,
  onCancel,
  onDelete,
  onRate,
  className = '',
}: AgentRunRowCardProps) {
  const state = run.state ?? 'created'
  const messageCount = run.messageCount ?? 0
  const totalCostUSD = run.totalCostUSD ?? 0
  const score = run.ratingScore ?? 0

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded border px-3 py-2 text-sm hover:bg-(--surface-muted) ${className}`}
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      <button type="button" onClick={onOpen} className="flex flex-col min-w-0 flex-1 text-left">
        <span className="truncate">{target}</span>
        <span className="text-xs opacity-60 font-mono">
          {run.type ?? 'run'} · {run.runId?.slice(0, 8) ?? '?'}
        </span>
      </button>
      <div className="flex items-center gap-3 shrink-0 text-xs opacity-70">
        <StatusChip state={state} label={state} />
        <span>{messageCount} msgs</span>
        {totalCostUSD > 0 && <span className="tabular-nums">${totalCostUSD.toFixed(4)}</span>}
        {onRate && (
          <div className="flex items-center gap-0.5" role="group" aria-label="Rate this run">
            <RatingButton
              icon={<IconThumbUp className="w-4 h-4" />}
              ariaLabel="Thumbs up"
              isActive={score > 0}
              onClick={() => onRate(score > 0 ? 0 : 1)}
            />
            <RatingButton
              icon={<IconThumbDown className="w-4 h-4" />}
              ariaLabel="Thumbs down"
              isActive={score < 0}
              onClick={() => onRate(score < 0 ? 0 : -1)}
            />
          </div>
        )}
        {onCancel && (
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        {onDelete && (
          <Button size="sm" variant="ghost" onClick={onDelete} aria-label="Delete run">
            <IconDelete className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
