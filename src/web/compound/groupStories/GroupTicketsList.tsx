import { useState, type KeyboardEvent, type ReactNode } from 'react'

import {
  GROUP_TICKETS_DEFAULT_LAYOUT,
  GROUP_TICKETS_TEXT,
  type GroupTicketListName,
  type GroupTicketRow,
  type GroupTicketSectionView,
  type GroupTicketsLayout,
  type GroupTicketsShown,
  type GroupTicketsView,
} from '../../../headless'
import { IconSearch } from '../../icons'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import SegmentedControl from '../../primitives/SegmentedControl'
import TicketChip from '../chips/TicketChip'
import { GroupStoryStoryChip } from './GroupStoryBits'

type TicketActions = {
  /** Open a ticket's discussion; its chat opens once it has started. */
  onDiscuss: (ticketKey: string) => void
  /** Start a ticket's plan; its chat opens once it has started. */
  onPlan: (ticketKey: string) => void
  /** Open the group story working a ticket. */
  onOpenStory: (groupStoryId: string) => void
}

export type GroupTicketsListProps = TicketActions & {
  view: GroupTicketsView
  /** What is typed in the search box. */
  query: string
  onQueryChange: (query: string) => void
  /** Open Settings → Group, for a group with no Jira. */
  onOpenSettings: () => void
  /** Read the tickets again. */
  onRetry: () => void
  onLoadMore: (name: GroupTicketListName) => void
  layout?: GroupTicketsLayout
  /** The list One list at a time starts on — for a fixed showcase state. */
  shownFirst?: GroupTicketsShown
}

type Listed = Extract<GroupTicketsView, { kind: 'tickets' }>

const HEADING_CLASS = 'm-0 text-[12px] font-medium text-(--text-primary)'
const NOTE_CLASS = 'm-0 text-[12.5px] text-(--text-secondary)'
const LABEL_CLASS = 'text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)'

/**
 * A group's tickets: the person's first, the next one to take on top of them, the
 * rest of the sprint, and a search that finds any ticket. Pressing a row opens its
 * discussion. Only a ticket that can be taken offers Take ticket, so a started one
 * reads at a glance as one to talk about. All a ticket says comes from Jira, so all
 * of it is plain text.
 */
export default function GroupTicketsList({
  view,
  query,
  onQueryChange,
  onOpenSettings,
  onRetry,
  onLoadMore,
  layout = GROUP_TICKETS_DEFAULT_LAYOUT,
  shownFirst = 'mine',
  ...actions
}: GroupTicketsListProps) {
  const [shown, setShown] = useState(shownFirst)

  if (view.kind === 'loading') {
    return <p className={`${NOTE_CLASS} p-4`}>{GROUP_TICKETS_TEXT.loading}</p>
  }
  if (view.kind === 'no-jira') {
    return (
      <p className={`${NOTE_CLASS} flex flex-wrap items-center gap-x-2 p-4`}>
        <span>{GROUP_TICKETS_TEXT.noJira}</span>
        <Button size="sm" variant="link" onClick={onOpenSettings}>
          {GROUP_TICKETS_TEXT.connectJira}
        </Button>
      </p>
    )
  }

  const list = { starting: view.starting, onRetry, ...actions }
  const yours = (
    <TicketSection
      {...list}
      heading={layout === 'segmented' ? undefined : GROUP_TICKETS_TEXT.yours}
      section={view.mine}
      top={view.next ? <NextTicket row={view.next} starting={view.starting} {...actions} /> : null}
      onLoadMore={() => onLoadMore('mine')}
    />
  )
  const others = (
    <TicketSection
      {...list}
      heading={layout === 'segmented' ? undefined : GROUP_TICKETS_TEXT.others}
      section={view.others}
      onLoadMore={() => onLoadMore('sprint')}
    />
  )

  return (
    <div className="@container flex flex-col gap-4 p-4">
      <div className="relative">
        <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-(--text-muted)" />
        <Input
          type="search"
          aria-label={GROUP_TICKETS_TEXT.search}
          placeholder={GROUP_TICKETS_TEXT.searchHint}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="pl-8"
        />
      </div>
      {view.readError ? <ReadFailed error={view.readError} onRetry={onRetry} /> : null}
      {view.startError ? <Alert variant="error">{view.startError}</Alert> : null}
      {view.search ? (
        <TicketSection
          {...list}
          heading={GROUP_TICKETS_TEXT.results}
          section={view.search}
          loadingLine={GROUP_TICKETS_TEXT.searching}
          onLoadMore={() => onLoadMore('search')}
        />
      ) : layout === 'columns' ? (
        <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-2">
          {yours}
          {others}
        </div>
      ) : layout === 'segmented' ? (
        <>
          <SegmentedControl
            ariaLabel={GROUP_TICKETS_TEXT.heading}
            size="sm"
            className="self-start"
            value={shown}
            onChange={(next) => setShown(next === 'others' ? 'others' : 'mine')}
            options={[
              { value: 'mine', label: GROUP_TICKETS_TEXT.yours, badge: count(view, 'mine') },
              {
                value: 'others',
                label: GROUP_TICKETS_TEXT.othersShort,
                badge: count(view, 'others'),
              },
            ]}
          />
          {shown === 'mine' ? yours : others}
        </>
      ) : (
        <>
          {yours}
          {others}
        </>
      )}
    </div>
  )
}

function count(view: Listed, shown: GroupTicketsShown): ReactNode {
  const total =
    shown === 'mine' ? view.mine.rows.length + (view.next ? 1 : 0) : view.others.rows.length
  return total > 0 ? <span className="opacity-80">{total}</span> : null
}

function ReadFailed({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Alert variant="error" className="min-w-0 flex-1">
        {error}
      </Alert>
      <Button size="sm" variant="secondary" onClick={onRetry}>
        {GROUP_TICKETS_TEXT.tryAgain}
      </Button>
    </div>
  )
}

function TicketSection({
  heading,
  section,
  top,
  loadingLine = GROUP_TICKETS_TEXT.loading,
  starting,
  onRetry,
  onLoadMore,
  ...actions
}: TicketActions & {
  /** Left out where a switch above already names the list. */
  heading?: string | undefined
  section: GroupTicketSectionView
  /** Drawn above the rows, in the same card. */
  top?: ReactNode
  loadingLine?: string
  starting: boolean
  onRetry: () => void
  onLoadMore: () => void
}) {
  const hasCard = Boolean(top) || section.rows.length > 0
  const hasWords = section.loading || section.emptyLine || section.readError
  if (!hasCard && !hasWords) return null
  return (
    <section aria-label={heading} className="@container flex min-w-0 flex-col gap-1.5">
      {heading ? (
        <div className="flex items-baseline gap-2">
          <h2 className={HEADING_CLASS}>{heading}</h2>
          <span className="text-[11.5px] text-(--text-muted)">{section.line}</span>
        </div>
      ) : null}
      {section.readError ? <ReadFailed error={section.readError} onRetry={onRetry} /> : null}
      {hasCard ? (
        <div className="overflow-hidden rounded-lg border border-(--border-subtle) bg-(--surface-raised)">
          {top}
          <ul role="list" className="m-0 flex list-none flex-col p-0">
            {section.rows.map((row, index) => (
              <TicketRow
                key={row.key}
                row={row}
                starting={starting}
                divided={index > 0 || Boolean(top)}
                {...actions}
              />
            ))}
          </ul>
          {section.canLoadMore ? (
            <div className="border-t border-(--border-subtle) px-3 py-1.5">
              <Button size="sm" variant="ghost" loading={section.loadingMore} onClick={onLoadMore}>
                {GROUP_TICKETS_TEXT.showMore}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
      {section.loading ? <p className={NOTE_CLASS}>{loadingLine}</p> : null}
      {section.emptyLine ? <p className={NOTE_CLASS}>{section.emptyLine}</p> : null}
    </section>
  )
}

/** A press on the row itself: one on a chip or a button inside it stays with that. */
function rowPress(row: GroupTicketRow, starting: boolean, onDiscuss: (ticketKey: string) => void) {
  const press = () => onDiscuss(row.key)
  return {
    role: 'button',
    tabIndex: 0,
    'aria-disabled': starting,
    title: row.hint,
    onClick: press,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.target !== e.currentTarget) return
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        press()
      }
    },
  }
}

function RowButtons({
  row,
  starting,
  onDiscuss,
  onPlan,
}: Pick<TicketActions, 'onDiscuss' | 'onPlan'> & {
  row: GroupTicketRow
  starting: boolean
}) {
  return (
    <span className="ml-auto flex shrink-0 items-center gap-1.5">
      <Button
        size="sm"
        variant="secondary"
        loading={row.starting === 'discuss'}
        disabled={starting}
        onClick={(e) => {
          e.stopPropagation()
          onDiscuss(row.key)
        }}
      >
        {row.starting === 'discuss' ? GROUP_TICKETS_TEXT.opening : GROUP_TICKETS_TEXT.discuss}
      </Button>
      {row.canTake ? (
        <Button
          size="sm"
          variant="primary"
          loading={row.starting === 'plan'}
          disabled={starting}
          onClick={(e) => {
            e.stopPropagation()
            onPlan(row.key)
          }}
        >
          {row.starting === 'plan' ? GROUP_TICKETS_TEXT.starting : GROUP_TICKETS_TEXT.take}
        </Button>
      ) : null}
    </span>
  )
}

function NextTicket({
  row,
  starting,
  onDiscuss,
  onPlan,
}: Omit<TicketActions, 'onOpenStory'> & { row: GroupTicketRow; starting: boolean }) {
  return (
    <div
      {...rowPress(row, starting, onDiscuss)}
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 bg-(--accent-primary)/5 px-3 py-2.5 focus-visible:outline-2 focus-visible:outline-(--focus-ring) ${
        starting ? 'cursor-default' : 'cursor-pointer hover:bg-(--surface-hover)'
      }`}
    >
      <div className="flex min-w-0 flex-1 basis-[260px] flex-col gap-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className={LABEL_CLASS}>{GROUP_TICKETS_TEXT.next}</span>
          <TicketChip view={row.chip} />
          {row.priority ? <span className="chip">{row.priority}</span> : null}
          {row.chatOpen ? <span className="chip">{GROUP_TICKETS_TEXT.chatOpen}</span> : null}
        </div>
        <span className="text-[13.5px] font-medium text-(--text-primary)">{row.summary}</span>
        <span className="text-[11.5px] text-(--text-muted)">{GROUP_TICKETS_TEXT.explain}</span>
      </div>
      <RowButtons row={row} starting={starting} onDiscuss={onDiscuss} onPlan={onPlan} />
    </div>
  )
}

function TicketRow({
  row,
  starting,
  divided,
  onDiscuss,
  onPlan,
  onOpenStory,
}: TicketActions & { row: GroupTicketRow; starting: boolean; divided: boolean }) {
  const { work } = row
  return (
    <li className={divided ? 'border-t border-(--border-subtle)' : undefined}>
      <div
        {...rowPress(row, starting, onDiscuss)}
        className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 px-3 py-1.5 focus-visible:outline-2 focus-visible:outline-(--focus-ring) ${
          starting ? 'cursor-default opacity-70' : 'cursor-pointer hover:bg-(--surface-hover)'
        }`}
      >
        <TicketChip view={row.chip} />
        {row.priority ? <span className="chips-sub__label">{row.priority}</span> : null}
        <span className="line-clamp-2 min-w-0 flex-1 basis-full text-[12.5px] text-(--text-primary) @2xl:basis-[200px]">
          {row.summary}
        </span>
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1 @2xl:flex-none">
          {work ? (
            <span className="min-w-0 max-w-[260px]">
              <GroupStoryStoryChip title={work.title} onOpen={() => onOpenStory(work.id)} />
            </span>
          ) : null}
          {row.chatOpen ? <span className="chip">{GROUP_TICKETS_TEXT.chatOpen}</span> : null}
          {!work && !row.chatOpen ? (
            <span className="shrink-0 text-[11.5px] text-(--text-muted)">
              {GROUP_TICKETS_TEXT.noWork}
            </span>
          ) : null}
          <RowButtons row={row} starting={starting} onDiscuss={onDiscuss} onPlan={onPlan} />
        </span>
      </div>
    </li>
  )
}
