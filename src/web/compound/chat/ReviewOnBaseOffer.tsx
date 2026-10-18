import { useState } from 'react'

import type { ReviewOnBaseOfferView } from '../../../headless/utils/reviewOnBaseTypes'
import { Button } from '../../primitives/Button'

export type ReviewOnBaseOfferProps = {
  view: ReviewOnBaseOfferView
  /** Close the review; `force` once the person confirmed a review the base lacks some of. */
  onClose: (force: boolean) => void
  /** Open with its confirm showing — how the showcase draws that state. */
  defaultConfirming?: boolean
}

/**
 * "Already on <base> — close it" on a review its base already holds, or a
 * later commit replaced: why, in a line, and the button. When the base lacks
 * some of it the button is quieter and asks first — nothing on disk is
 * discarded, the review closes and its branch is removed, recorded for restore.
 */
export function ReviewOnBaseOffer({
  view,
  onClose,
  defaultConfirming = false,
}: ReviewOnBaseOfferProps) {
  const [confirming, setConfirming] = useState(defaultConfirming)
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <span className="min-w-0 flex-1 text-[12px] text-(--text-secondary)">{view.detail}</span>
        {confirming ? null : (
          <Button
            size="sm"
            variant={view.confirm ? 'ghost' : 'secondary'}
            disabled={view.busy}
            onClick={() => (view.confirm ? setConfirming(true) : onClose(false))}
          >
            {view.busy ? view.busyLabel : view.label}
          </Button>
        )}
      </div>
      {confirming && view.confirm ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-(--text-primary)">{view.confirm.text}</span>
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              setConfirming(false)
              onClose(true)
            }}
          >
            {view.confirm.action}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            {view.confirm.keep}
          </Button>
        </div>
      ) : null}
      {view.error ? (
        <span className="text-[12px] text-(--status-stuck-soft-fg)">{view.error}</span>
      ) : null}
    </div>
  )
}
