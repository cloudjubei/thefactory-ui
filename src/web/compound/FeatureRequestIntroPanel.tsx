import { cn } from '../utils/cn'
import { Button } from '../primitives/Button'

export type FeatureRequestIntroPanelProps = {
  /** The sending project (A). */
  fromProjectId?: string
  title?: string
  description?: string
  /** A → B → A deadlock flagged at emit (D.5) — surfaced as a warning, never blocking. */
  cycle?: boolean
  /** Accept the request — starts the work run in this same chat. Host owns the call. */
  onAccept: () => void
  /** Decline the request. */
  onReject: () => void
  /** True while an accept/reject call is in flight — disables the buttons. */
  busy?: boolean
  className?: string
}

/**
 * The centered call-to-action shown in a receiver-side `FEATURE_REQUEST` chat while it is still
 * `pending` — presents the incoming request (sender · title · description) and the Accept / Reject
 * actions in the middle of the canvas (rendered via `ChatBody.emptyStateContent`), instead of a
 * chat message + composer bar. Purely presentational.
 */
export function FeatureRequestIntroPanel({
  fromProjectId,
  title,
  description,
  cycle,
  onAccept,
  onReject,
  busy,
  className,
}: FeatureRequestIntroPanelProps) {
  return (
    <div
      className={cn(
        'mx-auto mt-10 max-w-[560px] rounded-lg border border-(--border-default) bg-(--surface-raised) p-5 text-left',
        className,
      )}
    >
      <div className="text-[11px] font-medium uppercase tracking-wide text-(--text-secondary)">
        Incoming feature request
        {fromProjectId ? (
          <>
            {' · from '}
            <span className="font-mono normal-case">{fromProjectId}</span>
          </>
        ) : null}
      </div>

      {title ? (
        <div className="mt-2 text-[16px] font-semibold text-(--text-primary)">{title}</div>
      ) : null}

      {description ? (
        <div className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-(--text-secondary)">
          {description}
        </div>
      ) : null}

      {cycle ? (
        <div className="mt-3 rounded bg-amber-500/10 px-2 py-1 text-[12px] text-amber-600 dark:text-amber-400">
          ⚠ This project is already waiting on the requester — accepting may deadlock.
        </div>
      ) : null}

      <div className="mt-4 flex items-center gap-2">
        <Button size="sm" variant="primary" onClick={onAccept} disabled={busy}>
          Accept &amp; start work
        </Button>
        <Button size="sm" variant="ghost" onClick={onReject} disabled={busy}>
          Reject
        </Button>
      </div>
    </div>
  )
}
