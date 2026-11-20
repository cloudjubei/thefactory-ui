import { useState } from 'react'
import {
  TICKET_UPDATE_COPY,
  useTicketUpdate,
  type ProcessDeliveryLink,
  type TicketUpdateCardView,
} from '../../../headless'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { ConfirmDialog } from '../../primitives/Modal'
import ToneBadge from '../chips/ToneBadge'
import { SignOffOutputText } from './signoff/SignOffOutputPanel'

export type TicketUpdateCardProps = {
  view: TicketUpdateCardView
  /** Post it, once confirmed. */
  onPost: () => unknown
  /** Start on the confirm — for a fixed showcase state. */
  initialConfirming?: boolean
}

function OutLink({ link }: { link: ProcessDeliveryLink }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noreferrer noopener"
      className="shrink-0 text-[12px] font-medium text-(--accent-primary) hover:underline"
    >
      {link.label}
    </a>
  )
}

/**
 * "Post the ticket update" on a sign-off: the shared post word for word, the
 * channel it goes to, what holds it back, a confirm, and once posted where it
 * went. Native peer: `native/compound/process/TicketUpdateCard`.
 */
export default function TicketUpdateCard({
  view,
  onPost,
  initialConfirming = false,
}: TicketUpdateCardProps) {
  const [confirming, setConfirming] = useState(initialConfirming)
  const posted = view.phase === 'posted'
  return (
    <section
      aria-label={view.title}
      className="flex min-w-0 flex-col gap-2 rounded-lg border border-(--border-subtle) bg-(--surface-base) p-3"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-[13px] font-semibold text-(--text-primary)">{view.title}</span>
        <span className="text-[12px] text-(--text-muted)">{view.label}</span>
        {posted ? <ToneBadge tone="done">{TICKET_UPDATE_COPY.postedBadge}</ToneBadge> : null}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2 text-[12px] text-(--text-secondary)">
        <span className="min-w-0 wrap-break-word">{view.where}</span>
        {view.channelLink ? <OutLink link={view.channelLink} /> : null}
      </div>
      {view.text !== undefined ? <SignOffOutputText segments={view.segments} /> : null}
      {view.phase === 'blocked' ? (
        <div className="flex flex-col gap-1 text-[12px] text-(--status-on_hold-soft-fg)">
          <span className="font-medium">{TICKET_UPDATE_COPY.blocked}</span>
          <ul className="m-0 flex list-disc flex-col gap-0.5 pl-4">
            {view.problems.map((problem) => (
              <li key={problem} className="wrap-break-word">
                {problem}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {posted ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-[12.5px] text-(--text-primary)">
          <span>{view.postedLine}</span>
          {view.postedLink ? <OutLink link={view.postedLink} /> : null}
        </div>
      ) : (
        <div>
          <Button
            size="sm"
            variant="primary"
            disabled={!view.canPost}
            loading={view.phase === 'posting'}
            onClick={() => setConfirming(true)}
          >
            {view.button}
          </Button>
        </div>
      )}
      {view.error ? <Alert variant="error">{view.error}</Alert> : null}
      {confirming && view.canPost ? (
        <ConfirmDialog
          isOpen
          onClose={() => setConfirming(false)}
          title={view.confirm.title}
          description={view.confirm.body}
          confirmLabel={view.confirm.confirm}
          cancelLabel={view.confirm.cancel}
          onConfirm={() => {
            setConfirming(false)
            void onPost()
          }}
        />
      ) : null}
    </section>
  )
}

/** A run's own ticket update on its sign-off; nothing while it is not offered. */
export function RunTicketUpdatePanel({
  runId,
  revision,
}: {
  runId: string
  revision?: string | number
}) {
  const { card, post } = useTicketUpdate({ kind: 'run', runId }, revision)
  return card ? <TicketUpdateCard view={card} onPost={post} /> : null
}

/** A group run's ticket update on its one sign-off; nothing while it is not offered. */
export function GroupTicketUpdatePanel({
  groupRunId,
  revision,
}: {
  groupRunId: string
  revision?: string | number
}) {
  const { card, post } = useTicketUpdate({ kind: 'group', groupRunId }, revision)
  return card ? <TicketUpdateCard view={card} onPost={post} /> : null
}
