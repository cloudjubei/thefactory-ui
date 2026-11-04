import { TICKET_MOVE_TEXT, type TicketMoveFieldView } from '../../../headless'
import TicketChip from '../chips/TicketChip'

export type TicketMoveFieldProps = {
  field: TicketMoveFieldView
  /** Whether the offered move is made as the run starts. */
  ticked: boolean
  onToggle: (ticked: boolean) => void
  disabled?: boolean
}

/**
 * A launch's ticket: the one change approving makes to it, ticked by default, or
 * why there is none and so no tick box. The ticket's title comes from Jira, so it
 * stays plain text.
 */
export default function TicketMoveField({
  field,
  ticked,
  onToggle,
  disabled = false,
}: TicketMoveFieldProps) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-(--border-subtle) bg-(--surface-base) px-2.5 py-2">
      <div className="flex flex-wrap items-center gap-2">
        {field.kind === 'offer' ? (
          <label className="inline-flex min-w-0 items-center gap-2 text-[12.5px] font-medium text-(--text-primary)">
            <input
              type="checkbox"
              checked={ticked}
              disabled={disabled}
              aria-label={
                ticked
                  ? TICKET_MOVE_TEXT.leaveIt(field.decision.ticketKey)
                  : TICKET_MOVE_TEXT.moveIt(field.change)
              }
              onChange={(e) => onToggle(e.target.checked)}
              className="shrink-0 accent-(--accent-primary)"
            />
            <span className="min-w-0">{field.change}</span>
          </label>
        ) : null}
        <TicketChip view={field.chip} />
      </div>
      {field.title ? (
        <span
          className="min-w-0 truncate text-[11.5px] text-(--text-secondary)"
          title={field.title}
        >
          {field.title}
        </span>
      ) : null}
      {field.kind === 'unavailable' ? (
        <span className="text-[11.5px] text-(--text-muted)">{field.text}</span>
      ) : null}
    </div>
  )
}
