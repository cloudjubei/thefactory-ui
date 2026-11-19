import type { ReactNode } from 'react'

import { REVIEW_REPLY_TEXT as TEXT, type ReviewReplyView } from '../../../headless'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { ReviewReplyLine, ReviewReplyText } from '../groupStories/ReviewReplyBanner'

export type ReviewReplyComposerCardProps = {
  view: ReviewReplyView
  /** The round is starting: Start says so and a repeat press does nothing. */
  starting?: boolean
  error?: string | undefined
  /** The host's model chip: the agent the round runs on. */
  modelChip?: ReactNode
  onStart: () => void
  /** Hide the card for this view; the composer comes back. */
  onNotNow: () => void
  /** Start with the whole reply showing — for a fixed showcase state. */
  expanded?: boolean
}

/**
 * In an inline review chat, in the composer's place: who replied in the
 * update's thread and when, what was pushed since the last round, what they
 * wrote, and Start round N — the round begins here with the reply as its
 * update. Not now brings the composer back. Nothing starts by itself.
 */
export default function ReviewReplyComposerCard({
  view,
  starting = false,
  error,
  modelChip,
  onStart,
  onNotNow,
  expanded = false,
}: ReviewReplyComposerCardProps) {
  return (
    <section aria-label={view.line} className="flex min-w-0 flex-col gap-2 text-[12.5px]">
      <ReviewReplyLine view={view} />
      <ReviewReplyText view={view} expanded={expanded} />
      {error ? <Alert variant="error">{error}</Alert> : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="primary"
          loading={starting}
          disabled={starting}
          onClick={() => {
            if (!starting) onStart()
          }}
        >
          {starting ? TEXT.starting : view.startLabel}
        </Button>
        {modelChip}
        <Button size="sm" variant="secondary" disabled={starting} onClick={onNotNow}>
          {TEXT.notNow}
        </Button>
      </div>
    </section>
  )
}
