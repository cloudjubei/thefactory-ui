import {
  PROCESS_ALREADY_LANDED_FEATURE_DONE,
  PROCESS_ALREADY_LANDED_FEATURE_STAYS,
  PROCESS_ALREADY_LANDED_FEATURES_HEAD,
  type ProcessAlreadyLandedOffer,
} from '../../../headless'
import { Button } from '../../primitives/Button'
import CommitChip from '../chips/CommitChip'
import DependencyBullet from '../stories/DependencyBullet'

export type AlreadyMergedOfferProps = {
  projectId: string
  offer: ProcessAlreadyLandedOffer
  busy: boolean
  /** Why the last try was refused. */
  error: string | null
  onSettle: () => void
}

/**
 * "Finish as already merged": where the base has held the run's work since,
 * the features finishing makes done, what finishing does, and the button.
 */
export default function AlreadyMergedOffer({
  projectId,
  offer,
  busy,
  error,
  onSettle,
}: AlreadyMergedOfferProps) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-(--status-done-soft-border) bg-(--status-done-soft-bg) p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12.5px] font-semibold text-(--text-primary)">{offer.text}</span>
        <CommitChip projectId={projectId} sha={offer.sha} />
      </div>
      {offer.features.length > 0 ? (
        <div className="flex flex-col gap-1">
          <span className="text-[11.5px] font-medium text-(--text-secondary)">
            {PROCESS_ALREADY_LANDED_FEATURES_HEAD}
          </span>
          {offer.features.map((f) => (
            <div key={f.dependency} className="flex flex-wrap items-center gap-2">
              <DependencyBullet dependency={f.dependency} interactive />
              <span className="text-[12px] text-(--text-primary)">{f.title}</span>
              <span className="text-[11.5px] text-(--text-muted)">
                {f.becomesDone
                  ? PROCESS_ALREADY_LANDED_FEATURE_DONE
                  : PROCESS_ALREADY_LANDED_FEATURE_STAYS}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      <span className="max-w-[72ch] text-[11.5px] text-(--text-secondary)">{offer.detail}</span>
      {error ? <span className="text-[12px] text-(--status-stuck-soft-fg)">{error}</span> : null}
      <div>
        <Button size="sm" variant="primary" disabled={busy} onClick={onSettle}>
          {offer.label}
        </Button>
      </div>
    </div>
  )
}
