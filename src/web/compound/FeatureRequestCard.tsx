import type { ReactNode } from 'react'
import { cn } from '../utils/cn'
import { Button } from '../primitives/Button'

/** The seven cross-project feature-request lifecycle states (mirrors `FeatureRequestStatus`). */
export type FeatureRequestCardStatus =
  | 'pending'
  | 'rejected'
  | 'accepted'
  | 'in_progress'
  | 'in_review'
  | 'completed'
  | 'failed'

/** Minimal shape this card renders — hosts pass the matching subset of the live `FeatureRequest`. */
export type FeatureRequestCardData = {
  id: string
  title?: string
  /** The receiving project (B). */
  targetProjectId: string
  /** The sending project (A). */
  fromProjectId?: string
  status: FeatureRequestCardStatus
  /** A → B → A deadlock was detected at emit (D.5) — surfaced as a warning, never blocking. */
  cycleDetected?: boolean
  /** The review branch B landed the work on, once in review / completed. */
  reviewBranch?: string
}

const STATUS_LABEL: Record<FeatureRequestCardStatus, string> = {
  pending: 'Pending',
  rejected: 'Rejected',
  accepted: 'Accepted',
  in_progress: 'In progress',
  in_review: 'In review',
  completed: 'Completed',
  failed: 'Failed',
}

/** Pill colour per status — amber (waiting) · blue (working) · violet (review) · green · red. */
const STATUS_PILL: Record<FeatureRequestCardStatus, string> = {
  pending: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  accepted: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  in_progress: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  in_review: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  completed: 'bg-green-500/15 text-green-600 dark:text-green-400',
  failed: 'bg-red-500/15 text-red-600 dark:text-red-400',
  rejected: 'bg-red-500/15 text-red-600 dark:text-red-400',
}

export type FeatureRequestCardProps = {
  request: FeatureRequestCardData
  /** Accept the request (shown only while `pending`). Host owns the backend call. */
  onAccept?: () => void
  /** Reject the request (shown only while `pending`). */
  onReject?: () => void
  /** True while an accept/reject call is in flight — disables the buttons. */
  busy?: boolean
  /** Open B's work (the placed story / feature-request chat). Renders a link when provided. */
  onOpenReceiver?: () => void
  /** Extra slot rendered in the footer (e.g. host-specific links). */
  footer?: ReactNode
  className?: string
}

/**
 * Presentational cross-project feature-request card — pure rendering, no contexts, no app deps.
 * The host looks the live record up (via `useCrossProjectRequests`) and owns accept/reject +
 * navigation, passing them in as callbacks. Rendered inline in A's chat from the
 * `requestProjectFeature` tool result, and reused by the background inspector.
 */
export function FeatureRequestCard({
  request,
  onAccept,
  onReject,
  busy,
  onOpenReceiver,
  footer,
  className,
}: FeatureRequestCardProps) {
  const { title, targetProjectId, fromProjectId, status, cycleDetected, reviewBranch } = request
  const canDecide = status === 'pending' && (onAccept || onReject)

  return (
    <div
      className={cn(
        'rounded-md border border-(--border-subtle) bg-(--surface-raised) px-3 py-2 text-xs',
        className,
      )}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-(--text-secondary)">Feature request</span>
        {fromProjectId ? (
          <span className="font-mono text-[11px] text-(--text-secondary)">{fromProjectId}</span>
        ) : null}
        <span className="text-(--text-muted)">→</span>
        <span className="font-mono text-[11px] text-(--text-primary)">{targetProjectId}</span>
        <span
          className={cn(
            'ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium',
            STATUS_PILL[status],
          )}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>

      {title ? <div className="mt-1.5 text-[13px] text-(--text-primary)">{title}</div> : null}

      {cycleDetected ? (
        <div className="mt-1.5 rounded bg-amber-500/10 px-2 py-1 text-[11px] text-amber-600 dark:text-amber-400">
          ⚠ {targetProjectId} is already waiting on {fromProjectId ?? 'this project'} — this may
          deadlock.
        </div>
      ) : null}

      {reviewBranch ? (
        <div className="mt-1.5 font-mono text-[11px] text-(--text-secondary)">{reviewBranch}</div>
      ) : null}

      {(canDecide || onOpenReceiver || footer) && (
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {canDecide ? (
            <>
              {onAccept ? (
                <Button size="sm" variant="primary" onClick={onAccept} disabled={busy}>
                  Accept
                </Button>
              ) : null}
              {onReject ? (
                <Button size="sm" variant="ghost" onClick={onReject} disabled={busy}>
                  Reject
                </Button>
              ) : null}
            </>
          ) : null}
          {onOpenReceiver ? (
            <Button size="sm" variant="link" onClick={onOpenReceiver}>
              View {targetProjectId}'s work
            </Button>
          ) : null}
          {footer}
        </div>
      )}
    </div>
  )
}
