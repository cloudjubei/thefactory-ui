import { useState, type ReactNode } from 'react'
import type { ColleagueReviewCloseOutcome, ProcessRun } from 'thefactory-tools/types'
import { useColleagueReviewClose } from '../../../headless/hooks/useColleagueReviewClose'
import { reviewCloseConfirmView } from '../../../headless/utils/colleagueReviewClose'
import {
  REVIEW_CLOSE_DEFAULT_OUTCOME,
  REVIEW_CLOSE_NOTE_MAX_CHARS,
} from '../../../headless/utils/colleagueReviewCloseConstants'
import type { GroupTicketPageState } from '../../../headless/utils/groupTicketPageTypes'
import type {
  ReviewCloseContext,
  ReviewCloseView,
} from '../../../headless/utils/colleagueReviewCloseTypes'
import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'
import { Textarea } from '../../primitives/Textarea'

export type ReviewCloseControlProps = {
  view: ReviewCloseView
  context: ReviewCloseContext
  onClose: (outcome: ColleagueReviewCloseOutcome, note?: string) => void
  /** Leave out the closed line where the surface already says how the review ended. */
  hideClosed?: boolean
  /** Open the confirm at once, on this outcome: for the playground. */
  confirmOpen?: ColleagueReviewCloseOutcome
}

/**
 * "Close this review", the same on the ticket's page, its review run's page
 * and the review's card: a quiet button that always asks first — the two
 * outcomes, exactly what each does, that nothing is posted, and a short note —
 * then the review as it was closed, in a line.
 */
export function ReviewCloseControl({
  view,
  context,
  onClose,
  hideClosed = false,
  confirmOpen,
}: ReviewCloseControlProps) {
  const [open, setOpen] = useState(confirmOpen !== undefined)
  const [outcome, setOutcome] = useState(confirmOpen ?? REVIEW_CLOSE_DEFAULT_OUTCOME)
  const [note, setNote] = useState('')
  if (view.state === 'none') return null
  if (view.state !== 'open') {
    return hideClosed ? null : (
      <p className="m-0 text-[12px] text-(--text-secondary)" data-review-closed={view.state}>
        {view.line}
      </p>
    )
  }
  const confirm = reviewCloseConfirmView(context)
  const cancel = () => setOpen(false)
  return (
    <div className="flex min-w-0 flex-col items-start gap-1">
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        {view.label}
      </Button>
      {view.error ? (
        <p role="alert" className="m-0 text-[12px] text-(--status-stuck-soft-fg)">
          {view.error}
        </p>
      ) : null}
      {open ? (
        <Modal isOpen onClose={cancel} title={confirm.title} size="md">
          <div className="flex flex-col gap-3">
            <div role="radiogroup" className="flex flex-col gap-2">
              {confirm.outcomes.map((option) => {
                const picked = option.outcome === outcome
                return (
                  <button
                    key={option.outcome}
                    type="button"
                    role="radio"
                    aria-checked={picked}
                    onClick={() => setOutcome(option.outcome)}
                    className={`flex min-w-0 flex-col gap-1 rounded-md border px-3 py-2 text-left ${
                      picked
                        ? 'border-(--accent-primary) bg-(--surface-raised)'
                        : 'border-(--border-subtle) bg-transparent hover:bg-(--surface-hover)'
                    }`}
                  >
                    <span className="flex items-baseline gap-2">
                      <span className="text-[13px] font-medium text-(--text-primary)">
                        {option.label}
                      </span>
                      <span className="text-[12px] text-(--text-muted)">{option.when}</span>
                    </span>
                    {picked ? (
                      <ul className="m-0 flex list-disc flex-col gap-0.5 pl-4 text-[12px] text-(--text-secondary)">
                        {option.goes.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    ) : null}
                  </button>
                )
              })}
            </div>
            <p className="m-0 text-[12px] text-(--text-secondary)">{confirm.nothingPosted}</p>
            <Textarea
              rows={2}
              value={note}
              maxLength={REVIEW_CLOSE_NOTE_MAX_CHARS}
              aria-label={confirm.noteLabel}
              placeholder={confirm.notePlaceholder}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={cancel}>
                {confirm.cancel}
              </Button>
              <Button
                variant={outcome === 'remove' ? 'danger' : 'primary'}
                size="sm"
                onClick={() => {
                  setOpen(false)
                  onClose(outcome, note)
                }}
              >
                {confirm.confirm[outcome]}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}

export type ReviewCloseActionProps = {
  groupId: string
  ticketKey: string
  runOpen?: boolean
  offersWaiting?: boolean
  hideClosed?: boolean
}

/** {@link ReviewCloseControl} on a ticket's live review: one closing, shown wherever the review shows. */
export function ReviewCloseAction({
  groupId,
  ticketKey,
  runOpen = false,
  offersWaiting = false,
  hideClosed = false,
}: ReviewCloseActionProps) {
  const { view, close } = useColleagueReviewClose(groupId, ticketKey)
  return (
    <ReviewCloseControl
      view={view}
      context={{ ticketKey, runOpen, offersWaiting }}
      onClose={close}
      hideClosed={hideClosed}
    />
  )
}

/** Closing the review on its run's page, under its stop and its choices; nothing on any other run, or once the run reads as closed. */
export function ReviewRunClose({
  run,
}: {
  run: Pick<ProcessRun, 'ticketReview' | 'closedAs' | 'status'>
}) {
  const subject = run.ticketReview
  if (!subject || run.closedAs || run.status === 'succeeded') return null
  return (
    <div className="mx-3 mt-3">
      <ReviewCloseAction
        groupId={subject.groupId}
        ticketKey={subject.ticketKey}
        runOpen
        hideClosed
      />
    </div>
  )
}

/** Closing the review on its ticket's page, once the page shows a review. */
export function ticketReviewClose(
  groupId: string,
  ticketKey: string,
  state: GroupTicketPageState,
): ReactNode {
  if (state.kind !== 'page' || !state.page.review) return undefined
  const { liveRun, reply } = state.page
  return (
    <ReviewCloseAction
      groupId={groupId}
      ticketKey={ticketKey}
      runOpen={liveRun !== undefined}
      offersWaiting={reply !== undefined}
    />
  )
}
