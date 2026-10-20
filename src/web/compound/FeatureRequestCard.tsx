import { useState, type ReactNode } from 'react'
import { cn } from '../utils/cn'
import { Button } from '../primitives/Button'
import { FEATURE_REQUEST_OPEN_FULL_LABEL } from '../../headless/utils/featureRequestViewConstants'
import { canSettleFeatureRequest } from '../../headless/utils/featureRequestView'
import type {
  FeatureRequestLinkView,
  FeatureRequestSettledView,
  FeatureRequestSettleMode,
} from '../../headless/utils/featureRequestViewTypes'
import type {
  FeatureRequestDeliveryForm,
  FeatureRequestHandoverForm,
} from '../../headless/hooks/useCrossProjectRequests'
import { FeatureRequestSettleActions, FeatureRequestSettledNote } from './FeatureRequestSettle'
import { FeatureRequestStartAgain } from './FeatureRequestStartAgain'
import { FeatureRequestStartWork } from './FeatureRequestStartWork'
import WorkLaunchChooser from './WorkLaunchChooser'
import { workLaunchOptions } from '../../headless/utils/workLaunchView'
import type { WorkLaunchMode } from 'thefactory-tools/types'

/** The cross-project feature-request lifecycle states (mirrors `FeatureRequestStatus`). */
export type FeatureRequestCardStatus =
  | 'pending'
  | 'rejected'
  | 'accepted'
  | 'in_progress'
  | 'in_review'
  | 'blocked'
  | 'completed'
  | 'failed'
  | 'handed_over'

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
  /** While its work and another request's wait on each other: who is in it and which side decides first — `featureRequestWaitCycleWarning`. */
  waitCycleWarning?: string
  /** The review branch B put the work on, once in review / completed. */
  reviewBranch?: string
  /** The request's summary (or, on an older request, its description). */
  summary?: string
  /** Its filled parts and their counts, e.g. "Done when 5 · Rules 3". */
  countsLine?: string
  /** Why B rejected it, when it said why. */
  rejectionReason?: string
  /** Why its work waits, while it is `blocked` — e.g. "2 of 3 features are blocked: …". */
  statusReason?: string
  /** What delivered it, or where its work was handed over, once settled elsewhere. */
  settled?: FeatureRequestSettledView
  /** The requests whose work this one took over. */
  takenOver?: FeatureRequestLinkView[]
  /** Accepted, and nothing started its work yet — `canStartFeatureRequestWork`. */
  workNotStarted?: boolean
}

const STATUS_LABEL: Record<FeatureRequestCardStatus, string> = {
  pending: 'Pending',
  rejected: 'Rejected',
  accepted: 'Accepted',
  in_progress: 'In progress',
  in_review: 'In review',
  blocked: 'Blocked',
  completed: 'Completed',
  failed: 'Failed',
  handed_over: 'Handed over',
}

/** Pill colour per status — amber (waiting) · blue (working) · violet (review) · green · red. */
const STATUS_PILL: Record<FeatureRequestCardStatus, string> = {
  pending: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  accepted: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  in_progress: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  in_review: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  blocked: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  completed: 'bg-green-500/15 text-green-600 dark:text-green-400',
  failed: 'bg-red-500/15 text-red-600 dark:text-red-400',
  rejected: 'bg-red-500/15 text-red-600 dark:text-red-400',
  handed_over: 'bg-slate-500/15 text-slate-600 dark:text-slate-300',
}

export type FeatureRequestCardProps = {
  request: FeatureRequestCardData
  /**
   * Accept the request (shown only while `pending`), its work carried out the way the person
   * chose on the card. Host owns the backend call.
   */
  onAccept?: (mode: WorkLaunchMode) => void
  /** How work last started in the target project — offered first. */
  defaultMode?: WorkLaunchMode
  /** Reject the request (shown only while `pending`). */
  onReject?: () => void
  /** True while an accept/reject call is in flight — disables the buttons. */
  busy?: boolean
  /** Open B's work (the placed story / feature-request chat). Renders a link when provided. */
  onOpenReceiver?: () => void
  /** Open the whole request. Renders a link when provided. */
  onOpenFull?: () => void
  /** Mark the request delivered by other work — offered until it is settled, a rejected one included. */
  onMarkDelivered?: (input: FeatureRequestDeliveryForm) => void
  /** Hand the request over to another project's request or story — offered likewise. */
  onHandOver?: (input: FeatureRequestHandoverForm) => void
  /** Start the work of an accepted request that never started, the way chosen. */
  onStartWork?: (mode: WorkLaunchMode) => void
  /** Start the work again — offered once it ended blocked or failed. */
  onStartAgain?: (mode: WorkLaunchMode) => void
  /** Open another request, from the links between requests handed over and taken over. */
  onOpenRequest?: (requestId: string) => void
  /** Opens a settle form at once, for a fixed showcase state. */
  initialSettleMode?: FeatureRequestSettleMode
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
  defaultMode,
  onReject,
  busy,
  onOpenReceiver,
  onOpenFull,
  onMarkDelivered,
  onHandOver,
  onStartWork,
  onStartAgain,
  onOpenRequest,
  initialSettleMode,
  footer,
  className,
}: FeatureRequestCardProps) {
  const {
    title,
    targetProjectId,
    fromProjectId,
    status,
    cycleDetected,
    waitCycleWarning,
    reviewBranch,
    summary,
    countsLine,
    rejectionReason,
    statusReason,
    settled,
    takenOver,
    workNotStarted,
  } = request
  const canDecide = status === 'pending' && (onAccept || onReject)
  const [choosing, setChoosing] = useState(false)

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

      {summary ? (
        <div className="mt-1 line-clamp-2 text-[12px] leading-normal text-(--text-secondary)">
          {summary}
        </div>
      ) : null}

      {countsLine ? (
        <div className="mt-1 text-[11px] text-(--text-secondary)">{countsLine}</div>
      ) : null}

      {status === 'rejected' && rejectionReason ? (
        <div className="mt-1.5 text-[12px] italic text-(--text-secondary)">“{rejectionReason}”</div>
      ) : null}

      {status === 'blocked' && statusReason ? (
        <div className="mt-1.5 text-[12px] text-amber-600 dark:text-amber-400">{statusReason}</div>
      ) : null}

      {waitCycleWarning ? (
        <div className="mt-1.5 rounded bg-amber-500/10 px-2 py-1 text-[11px] text-amber-600 dark:text-amber-400">
          ⚠ {waitCycleWarning}
        </div>
      ) : cycleDetected ? (
        <div className="mt-1.5 rounded bg-amber-500/10 px-2 py-1 text-[11px] text-amber-600 dark:text-amber-400">
          ⚠ {targetProjectId} is already waiting on {fromProjectId ?? 'this project'} — this may
          deadlock.
        </div>
      ) : null}

      {settled || takenOver?.length ? (
        <div className="mt-1.5">
          <FeatureRequestSettledNote
            settled={settled}
            takenOver={takenOver}
            onOpenRequest={onOpenRequest}
          />
        </div>
      ) : null}

      {reviewBranch ? (
        <div className="mt-1.5 font-mono text-[11px] text-(--text-secondary)">{reviewBranch}</div>
      ) : null}

      {choosing && onAccept && status === 'pending' ? (
        <WorkLaunchChooser
          options={workLaunchOptions({ workLaunchMode: defaultMode })}
          onChoose={onAccept}
          onCancel={() => setChoosing(false)}
          {...(busy !== undefined ? { busy } : {})}
        />
      ) : null}

      {(canDecide || onOpenReceiver || onOpenFull || footer) && (
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {canDecide ? (
            <>
              {onAccept ? (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setChoosing(true)}
                  disabled={busy}
                >
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
          {onOpenFull ? (
            <Button size="sm" variant="link" onClick={onOpenFull}>
              {FEATURE_REQUEST_OPEN_FULL_LABEL}
            </Button>
          ) : null}
          {footer}
        </div>
      )}

      {onStartWork && status === 'accepted' && workNotStarted ? (
        <div className="mt-2">
          <FeatureRequestStartWork
            onStartWork={onStartWork}
            {...(defaultMode ? { defaultMode } : {})}
            {...(busy !== undefined ? { busy } : {})}
          />
        </div>
      ) : null}

      {onStartAgain && (status === 'blocked' || status === 'failed') ? (
        <div className="mt-2">
          <FeatureRequestStartAgain
            failed={status === 'failed'}
            onStartAgain={onStartAgain}
            busy={busy}
          />
        </div>
      ) : null}

      {canSettleFeatureRequest({ status }) ? (
        <div className="mt-2">
          <FeatureRequestSettleActions
            fromLabel={fromProjectId ?? targetProjectId}
            onMarkDelivered={onMarkDelivered}
            onHandOver={onHandOver}
            busy={busy}
            initialMode={initialSettleMode}
          />
        </div>
      ) : null}
    </div>
  )
}
