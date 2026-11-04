import { useState, type KeyboardEvent } from 'react'

import {
  pressTicketRow,
  TAKE_NEXT_TICKET_DEFAULT_LAYOUT,
  TAKE_NEXT_TICKET_TEXT,
  type GroupTicketRow,
  type TakeNextTicketLayout,
  type TakeNextTicketView,
} from '../../../headless'
import { IconChevron } from '../../icons'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import TicketChip from '../chips/TicketChip'
import { GroupStoryStoryChip } from './GroupStoryBits'

export type TakeNextTicketProps = {
  view: TakeNextTicketView
  /** Start a ticket's plan; its chat opens once it has started. */
  onPlan: (ticketKey: string) => void
  /** Open the group story working a ticket. */
  onOpenStory: (groupStoryId: string) => void
  /** Read the tickets again. */
  onRetry: () => void
  onLoadMore: () => void
  layout?: TakeNextTicketLayout
  /** The sprint list starts open — for a fixed showcase state. */
  sprintOpen?: boolean
}

type RowHandlers = Pick<TakeNextTicketProps, 'onPlan' | 'onOpenStory'>

/**
 * The group's Stories tab's way in from Jira: the next ticket with no work yet,
 * and the person's sprint in board order with what already has work. A row with
 * work opens its group story; one without starts its plan. Everything a ticket
 * says comes from Jira, so all of it is plain text.
 */
export default function TakeNextTicket({
  view,
  onPlan,
  onOpenStory,
  onRetry,
  onLoadMore,
  layout = TAKE_NEXT_TICKET_DEFAULT_LAYOUT,
  sprintOpen = false,
}: TakeNextTicketProps) {
  const [open, setOpen] = useState(sprintOpen)
  const handlers = { onPlan, onOpenStory }
  const hasRows = view.rows.length > 0
  const sprint = (
    <SprintRows view={view} marksNext={layout === 'list'} onLoadMore={onLoadMore} {...handlers} />
  )
  const next = view.next ? (
    <NextTicket row={view.next} planning={view.planning} onPlan={onPlan} />
  ) : view.noNextLine ? (
    <p className="m-0 px-3 py-2.5 text-[12.5px] text-(--text-secondary)">{view.noNextLine}</p>
  ) : null

  return (
    <section
      aria-label={TAKE_NEXT_TICKET_TEXT.heading}
      className="@container mx-4 my-2.5 shrink-0 overflow-hidden rounded-lg border border-(--border-subtle) bg-(--surface-raised)"
    >
      {view.readError ? (
        <div className="flex flex-wrap items-center gap-2 p-2">
          <Alert variant="error" className="min-w-0 flex-1">
            {view.readError}
          </Alert>
          <Button size="sm" variant="secondary" onClick={onRetry}>
            {TAKE_NEXT_TICKET_TEXT.tryAgain}
          </Button>
        </div>
      ) : null}
      {view.planError ? (
        <div className="p-2">
          <Alert variant="error">{view.planError}</Alert>
        </div>
      ) : null}
      {layout === 'list' ? (
        hasRows ? (
          sprint
        ) : (
          next
        )
      ) : layout === 'columns' ? (
        <div className="grid grid-cols-1 @3xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="min-w-0 @3xl:border-r @3xl:border-(--border-subtle)">{next}</div>
          {hasRows ? (
            <div className="min-w-0 border-t border-(--border-subtle) @3xl:border-t-0">
              <SprintHeading line={view.sprintLine} />
              {sprint}
            </div>
          ) : null}
        </div>
      ) : (
        <>
          {next}
          {hasRows ? (
            <>
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center gap-2 border-t border-(--border-subtle) px-3 py-1.5 text-left hover:bg-(--surface-hover) focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
              >
                <IconChevron
                  className={`size-3 text-(--text-muted) transition-transform ${open ? 'rotate-90' : ''}`}
                />
                <span className="text-[12px] font-medium text-(--text-primary)">
                  {TAKE_NEXT_TICKET_TEXT.sprint}
                </span>
                <span className="text-[11.5px] text-(--text-muted)">{view.sprintLine}</span>
              </button>
              {open ? sprint : null}
            </>
          ) : null}
        </>
      )}
    </section>
  )
}

function SprintHeading({ line }: { line: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5">
      <span className="text-[12px] font-medium text-(--text-primary)">
        {TAKE_NEXT_TICKET_TEXT.sprint}
      </span>
      <span className="text-[11.5px] text-(--text-muted)">{line}</span>
    </div>
  )
}

function NextTicket({
  row,
  planning,
  onPlan,
}: {
  row: GroupTicketRow
  planning: boolean
  onPlan: (ticketKey: string) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5">
      <div className="flex min-w-0 flex-1 basis-[260px] flex-col gap-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
            {TAKE_NEXT_TICKET_TEXT.heading}
          </span>
          <TicketChip view={row.chip} />
          {row.priority ? <span className="chip">{row.priority}</span> : null}
        </div>
        <span className="text-[13.5px] font-medium text-(--text-primary)">{row.summary}</span>
        <span className="text-[11.5px] text-(--text-muted)">{TAKE_NEXT_TICKET_TEXT.explain}</span>
      </div>
      <Button
        size="sm"
        variant="primary"
        loading={row.planning}
        disabled={planning}
        onClick={() => onPlan(row.key)}
      >
        {row.planning ? TAKE_NEXT_TICKET_TEXT.starting : TAKE_NEXT_TICKET_TEXT.take}
      </Button>
    </div>
  )
}

function SprintRows({
  view,
  marksNext,
  onLoadMore,
  ...handlers
}: RowHandlers & {
  view: TakeNextTicketView
  /** One list: the next ticket is a row of it, and says so. */
  marksNext: boolean
  onLoadMore: () => void
}) {
  return (
    <>
      <ul
        role="list"
        aria-label={TAKE_NEXT_TICKET_TEXT.sprint}
        className="m-0 flex list-none flex-col p-0"
      >
        {view.rows.map((row) => (
          <SprintRow
            key={row.key}
            row={row}
            planning={view.planning}
            isNext={marksNext && row.key === view.next?.key}
            {...handlers}
          />
        ))}
      </ul>
      {view.canLoadMore ? (
        <div className="border-t border-(--border-subtle) px-3 py-1.5">
          <Button size="sm" variant="ghost" loading={view.loadingMore} onClick={onLoadMore}>
            {TAKE_NEXT_TICKET_TEXT.showMore}
          </Button>
        </div>
      ) : null}
    </>
  )
}

function SprintRow({
  row,
  planning,
  isNext,
  onPlan,
  onOpenStory,
}: RowHandlers & { row: GroupTicketRow; planning: boolean; isNext: boolean }) {
  const press = () => pressTicketRow(row, planning, { onPlan, onOpenStory })
  const { work } = row
  const inert = planning && !work
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      press()
    }
  }
  return (
    <li className="border-t border-(--border-subtle)">
      <div
        role="button"
        tabIndex={0}
        aria-disabled={inert}
        title={row.hint}
        onClick={press}
        onKeyDown={onKey}
        className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 px-3 py-1.5 focus-visible:outline-2 focus-visible:outline-(--focus-ring) ${
          inert ? 'cursor-default opacity-70' : 'cursor-pointer hover:bg-(--surface-hover)'
        } ${isNext ? 'bg-(--accent-primary)/5' : ''}`}
      >
        {isNext ? (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
            {TAKE_NEXT_TICKET_TEXT.next}
          </span>
        ) : null}
        <TicketChip view={row.chip} />
        {row.priority ? <span className="chips-sub__label">{row.priority}</span> : null}
        <span className="min-w-0 flex-1 basis-[200px] truncate text-[12.5px] text-(--text-primary)">
          {row.summary}
        </span>
        {work ? (
          <span className="min-w-0 max-w-[260px]">
            <GroupStoryStoryChip title={work.title} onOpen={() => onOpenStory(work.id)} />
          </span>
        ) : isNext ? (
          <Button
            size="sm"
            variant="primary"
            loading={row.planning}
            disabled={planning}
            onClick={(e) => {
              e.stopPropagation()
              onPlan(row.key)
            }}
          >
            {row.planning ? TAKE_NEXT_TICKET_TEXT.starting : TAKE_NEXT_TICKET_TEXT.take}
          </Button>
        ) : (
          <span className="shrink-0 text-[11.5px] text-(--text-muted)">
            {row.planning ? TAKE_NEXT_TICKET_TEXT.starting : TAKE_NEXT_TICKET_TEXT.noWork}
          </span>
        )}
      </div>
    </li>
  )
}
