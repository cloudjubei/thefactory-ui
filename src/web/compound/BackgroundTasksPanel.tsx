import { FeatureRequestCard, type FeatureRequestCardData } from './FeatureRequestCard'

export interface BackgroundTasksPanelProps {
  /** Every cross-project request, most-recently-updated first (account-global). */
  requests: FeatureRequestCardData[]
  /** Accept a pending request. Host owns the backend call. */
  onAccept?: (id: string) => void
  /** Reject a pending request. */
  onReject?: (id: string) => void
  /** The request currently mid accept/reject — its buttons disable. */
  busyId?: string
  /** Text shown when there are no requests. */
  emptyText?: string
}

/**
 * Presentational background-tasks inspector — a scrollable stack of cross-project
 * {@link FeatureRequestCard}s (from→to · status · accept/reject), account-global across every
 * project. Pure rendering; the host supplies the (already-mapped) rows + accept/reject callbacks.
 * Mounted inside a modal (web/desktop) or a pushed screen (mobile).
 */
export function BackgroundTasksPanel({
  requests,
  onAccept,
  onReject,
  busyId,
  emptyText = 'No cross-project requests.',
}: BackgroundTasksPanelProps) {
  if (requests.length === 0) {
    return <div className="py-8 text-center text-xs text-(--text-secondary)">{emptyText}</div>
  }

  return (
    <div className="flex flex-col gap-2">
      {requests.map((r) => (
        <FeatureRequestCard
          key={r.id}
          request={r}
          busy={busyId === r.id}
          onAccept={onAccept ? () => onAccept(r.id) : undefined}
          onReject={onReject ? () => onReject(r.id) : undefined}
        />
      ))}
    </div>
  )
}
