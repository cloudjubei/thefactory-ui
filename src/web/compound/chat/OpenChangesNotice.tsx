import { useState } from 'react'

import type { OpenChangesNoticeView } from '../../../headless/utils/openChangesNoticeTypes'
import { OPEN_CHANGES_NOTICE_COPY } from '../../../headless/utils/openChangesNoticeConstants'
import { IconWarningTriangle } from '../../icons'
import { Button } from '../../primitives/Button'

export type OpenChangesNoticeProps = {
  view: OpenChangesNoticeView
  onDiscard: () => void
  onRebuild: () => void
}

/**
 * What a chat's change card says of its open changes once they need the
 * person — waiting past the limit, or no longer fitting the checkout — with
 * Discard (confirmed) and, while they do not fit, Rebuild on current. A line on
 * the card itself, never a card of its own.
 */
export function OpenChangesNotice({ view, onDiscard, onRebuild }: OpenChangesNoticeProps) {
  const [confirming, setConfirming] = useState(false)
  return (
    <div className="flex flex-col gap-2 rounded-md border border-(--status-on_hold-bg) bg-(--status-on_hold-soft-bg) px-2.5 py-2 text-(--status-on_hold-soft-fg)">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <IconWarningTriangle className="h-4 w-4 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {view.waiting ? (
            <span className="text-[12.5px] font-semibold">{view.waiting}</span>
          ) : null}
          {view.unfit ? <span className="text-[12.5px]">{view.unfit}</span> : null}
        </div>
        {confirming ? null : (
          <div className="flex shrink-0 items-center gap-2">
            {view.canRebuild || view.busy === 'rebuilding' ? (
              <Button size="sm" disabled={!view.canRebuild} onClick={onRebuild}>
                {view.busy === 'rebuilding'
                  ? OPEN_CHANGES_NOTICE_COPY.rebuilding
                  : OPEN_CHANGES_NOTICE_COPY.rebuild}
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              disabled={!view.canDiscard}
              onClick={() => setConfirming(true)}
            >
              {view.busy === 'discarding'
                ? OPEN_CHANGES_NOTICE_COPY.discarding
                : OPEN_CHANGES_NOTICE_COPY.discard}
            </Button>
          </div>
        )}
      </div>
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12.5px]">{OPEN_CHANGES_NOTICE_COPY.confirmDiscard}</span>
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              setConfirming(false)
              onDiscard()
            }}
          >
            {OPEN_CHANGES_NOTICE_COPY.discard}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            {OPEN_CHANGES_NOTICE_COPY.keep}
          </Button>
        </div>
      ) : null}
      {view.conflictLine ? (
        <div className="text-[12.5px] leading-normal">{view.conflictLine}</div>
      ) : view.error ? (
        <div className="text-[12.5px] leading-normal">{view.error}</div>
      ) : null}
    </div>
  )
}
