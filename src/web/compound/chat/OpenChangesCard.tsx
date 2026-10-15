import { useState, type ReactNode } from 'react'
import type { ChatOpenChangesCard } from 'thefactory-tools/types'

import { useChatOpenChanges } from '../../../headless/hooks/useChatOpenChanges'
import { openChangesCardView } from '../../../headless/utils/openChangesCard'
import { OPEN_CHANGES_CARD_COPY } from '../../../headless/utils/openChangesCardConstants'
import { IconCheck, IconWarningTriangle } from '../../icons'
import { Button } from '../../primitives/Button'

/**
 * The card the host posted about a chat's open changes, drawn from the changes
 * as they stand now: View opens their review below, Discard throws them away,
 * Rebuild on current merges them onto the checkout. Decided anywhere, it shows
 * how.
 */
export function OpenChangesCardView({
  card,
  at,
  formatAt,
  renderReview,
}: {
  card: ChatOpenChangesCard
  at?: string
  formatAt: (ms: number) => string
  /** The review panel of a run, opened by View. */
  renderReview?: (runId: string) => ReactNode
}) {
  const live = useChatOpenChanges(card)
  const view = openChangesCardView({ card, ...live }, formatAt)
  const [showing, setShowing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const open = view.state === 'open'
  return (
    <div
      className="overflow-hidden rounded-xl border-[1.5px] bg-(--surface-raised)"
      style={{ borderColor: open ? 'var(--status-on_hold-bg)' : 'var(--border-subtle)' }}
    >
      <div
        className="flex items-center gap-2 px-3.5 py-2 text-[12.5px] font-semibold"
        style={
          open
            ? {
                background: 'var(--status-on_hold-soft-bg)',
                color: 'var(--status-on_hold-soft-fg)',
              }
            : { color: 'var(--text-secondary)' }
        }
      >
        {open ? <IconWarningTriangle className="h-4 w-4" /> : <IconCheck className="h-4 w-4" />}
        <span className="min-w-0 flex-1 truncate">{view.title}</span>
        {at ? <span className="shrink-0 font-normal text-(--text-secondary)">{at}</span> : null}
      </div>
      <div className="flex flex-col gap-2.5 px-3.5 py-3">
        <div className="text-[13.5px] leading-snug text-(--text-primary)">{view.detail}</div>
        {view.conflictLine ? (
          <div className="text-[12.5px] leading-normal text-(--status-on_hold-soft-fg)">
            {view.conflictLine}
          </div>
        ) : view.error ? (
          <div className="text-[12.5px] leading-normal text-(--text-secondary)">{view.error}</div>
        ) : null}
        {confirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12.5px] text-(--text-secondary)">
              {OPEN_CHANGES_CARD_COPY.confirmDiscard}
            </span>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                setConfirming(false)
                void live.discard()
              }}
            >
              {OPEN_CHANGES_CARD_COPY.discard}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              {OPEN_CHANGES_CARD_COPY.keep}
            </Button>
          </div>
        ) : view.viewRunId && (open || renderReview) ? (
          <div className="flex flex-wrap items-center gap-2">
            {renderReview ? (
              <Button size="sm" variant="outline" onClick={() => setShowing((s) => !s)}>
                {showing ? OPEN_CHANGES_CARD_COPY.hide : OPEN_CHANGES_CARD_COPY.view}
              </Button>
            ) : null}
            {open ? (
              <Button
                size="sm"
                variant="outline"
                disabled={!view.canDiscard}
                onClick={() => setConfirming(true)}
              >
                {view.busy === 'discarding'
                  ? OPEN_CHANGES_CARD_COPY.discarding
                  : OPEN_CHANGES_CARD_COPY.discard}
              </Button>
            ) : null}
            {view.canRebuild || view.busy === 'rebuilding' ? (
              <Button size="sm" disabled={!view.canRebuild} onClick={() => void live.rebuild()}>
                {view.busy === 'rebuilding'
                  ? OPEN_CHANGES_CARD_COPY.rebuilding
                  : OPEN_CHANGES_CARD_COPY.rebuild}
              </Button>
            ) : null}
          </div>
        ) : null}
        {showing && view.viewRunId && renderReview ? renderReview(view.viewRunId) : null}
      </div>
    </div>
  )
}
