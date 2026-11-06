import { useState } from 'react'

import {
  TICKET_POST_DEFAULT_LAYOUT,
  TICKET_POST_TEXT,
  ticketPostView,
  useTicketPost,
  type TicketPostLayout,
  type TicketPostView,
} from '../../../../headless'

export type TicketPostNoteProps = {
  view: TicketPostView
  layout?: TicketPostLayout
  /** Open on the comment, for a fixed showcase state. */
  startOpen?: boolean
}

function Comment({ text }: { text: string }) {
  return (
    <blockquote
      aria-label={TICKET_POST_TEXT.commentLabel}
      className="max-h-64 overflow-auto whitespace-pre-wrap wrap-break-word rounded-md border-l-2 border-(--border-default) bg-(--surface-base) px-3 py-2 text-[12.5px] text-(--text-primary)"
    >
      {text}
    </blockquote>
  )
}

/**
 * What approving a sign-off would post to its tickets, in a line, with the
 * comment word for word. The comment is agent-written, so it is text only.
 * Native peer: `native/compound/process/signoff/TicketPostNote`.
 */
export default function TicketPostNote({
  view,
  layout = TICKET_POST_DEFAULT_LAYOUT,
  startOpen = false,
}: TicketPostNoteProps) {
  const [open, setOpen] = useState(startOpen)
  const { line, notes, comment } = view
  const folded = comment !== undefined && layout === 'fold'
  return (
    <div role="note" className="flex min-w-0 max-w-[72ch] flex-col gap-1 text-[12.5px]">
      <div className="wrap-break-word text-(--text-secondary)">
        <span className="font-medium text-(--text-primary)">{TICKET_POST_TEXT.heading}: </span>
        {line}
        {folded ? (
          <>
            {' '}
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
              className="font-medium text-(--accent-primary) hover:underline focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
            >
              {open ? TICKET_POST_TEXT.hideComment : TICKET_POST_TEXT.showComment}
            </button>
          </>
        ) : null}
      </div>
      {notes.map((note) => (
        <div key={note} className="wrap-break-word text-(--text-muted)">
          {note}
        </div>
      ))}
      {comment !== undefined && (open || !folded) ? <Comment text={comment} /> : null}
    </div>
  )
}

/** The note for one run's sign-off, read while its decision is open. */
export function RunTicketPostNote({ runId }: { runId: string }) {
  const { post, failed } = useTicketPost(runId)
  const view = ticketPostView(post)
  if (view) return <TicketPostNote view={view} />
  return failed ? (
    <div role="note" className="max-w-[72ch] text-[12.5px] text-(--text-muted)">
      {TICKET_POST_TEXT.failed}
    </div>
  ) : null
}
