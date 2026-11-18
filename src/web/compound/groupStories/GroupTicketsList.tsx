import { useState, type KeyboardEvent, type ReactNode } from 'react'

import {
  GROUP_TICKETS_DEFAULT_LAYOUT,
  GROUP_TICKETS_TEXT,
  REVIEW_OFFER_DEFAULT_LAYOUT,
  REVIEW_OFFER_TEXT,
  REVIEW_START_TEXT,
  type GroupTicketListName,
  type GroupTicketRow,
  type GroupTicketSectionView,
  type GroupTicketsLayout,
  type GroupTicketsShown,
  type GroupTicketsView,
  type ReviewOfferLayout,
  type ReviewOfferRowView,
} from '../../../headless'
import { IconChat, IconClose, IconExternalLink, IconSearch } from '../../icons'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import SegmentedControl from '../../primitives/SegmentedControl'
import Spinner from '../../primitives/Spinner'
import TicketChip from '../chips/TicketChip'
import { GroupStoryStoryChip } from './GroupStoryBits'

type TicketActions = {
  /** Open a ticket's discussion; its chat opens once it has started. */
  onDiscuss: (ticketKey: string) => void
  /** Start a ticket's plan; its chat opens once it has started. */
  onPlan: (ticketKey: string) => void
  /** Open the group story working a ticket. */
  onOpenStory: (groupStoryId: string) => void
  /** Open the paste box on a ticket, to review a colleague's update. Without it, Review is not offered. */
  onReview?: (ticketKey: string) => void
  /** Dismiss the update from Slack waiting on a ticket. Without it, Dismiss is not offered. */
  onDismissOffer?: (ticketKey: string) => void
  /** How a waiting update from Slack shows on its row. */
  offerLayout?: ReviewOfferLayout
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
      {view.offerError ? <Alert variant="error">{view.offerError}</Alert> : null}
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

function reviewLabel(row: GroupTicketRow, offerOnButton: boolean): string {
  if (row.reviewing !== undefined) return row.reviewing
  if (row.offer && offerOnButton) return REVIEW_OFFER_TEXT.review
  return row.reviewOpen ? REVIEW_START_TEXT.nextRound : REVIEW_START_TEXT.review
}

function RowButtons({
  row,
  starting,
  onDiscuss,
  onPlan,
  onReview,
  onDismissOffer,
  offerLayout = REVIEW_OFFER_DEFAULT_LAYOUT,
}: Pick<TicketActions, 'onDiscuss' | 'onPlan' | 'onReview' | 'onDismissOffer' | 'offerLayout'> & {
  row: GroupTicketRow
  starting: boolean
}) {
  const offer = onReview && row.reviewing === undefined ? row.offer : undefined
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
      {onReview ? (
        <Button
          size="sm"
          variant={offer && offerLayout === 'button' ? 'primary' : 'secondary'}
          disabled={row.reviewing !== undefined}
          aria-busy={row.reviewing !== undefined || undefined}
          title={
            offer
              ? `${offer.label} · ${offer.when}`
              : row.reviewOpen
                ? REVIEW_START_TEXT.nextRoundOf(row.key)
                : REVIEW_START_TEXT.reviewTicket(row.key)
          }
          onClick={(e) => {
            e.stopPropagation()
            onReview(row.key)
          }}
        >
          {row.reviewing !== undefined ? <Spinner size={12} /> : null}
          {offer && offerLayout === 'button' ? (
            <span aria-hidden className="size-1.5 rounded-full bg-current" />
          ) : null}
          {reviewLabel(row, offerLayout === 'button')}
        </Button>
      ) : null}
      {offer && offerLayout === 'button' && onDismissOffer && !offer.dismissed ? (
        <DismissOffer row={row} onDismissOffer={onDismissOffer} />
      ) : null}
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

function DismissOffer({
  row,
  onDismissOffer,
  className = '',
}: {
  row: GroupTicketRow
  onDismissOffer: (ticketKey: string) => void
  className?: string
}) {
  return (
    <button
      type="button"
      aria-label={REVIEW_OFFER_TEXT.dismissHint(row.key)}
      title={REVIEW_OFFER_TEXT.dismissHint(row.key)}
      onClick={(e) => {
        e.stopPropagation()
        onDismissOffer(row.key)
      }}
      className={`inline-flex shrink-0 items-center justify-center rounded text-(--text-muted) hover:text-(--text-primary) focus:outline-none focus-visible:ring-2 ${className}`}
    >
      <IconClose className="size-3.5" />
    </button>
  )
}

function OfferLink({ offer }: { offer: ReviewOfferRowView }) {
  return offer.permalink ? (
    <a
      href={offer.permalink}
      target="_blank"
      rel="noreferrer noopener"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex shrink-0 items-center gap-1 text-(--accent-primary) hover:underline"
    >
      {REVIEW_OFFER_TEXT.open}
      <IconExternalLink className="size-3" />
    </a>
  ) : null
}

/** A waiting update as a chip among the row's own: who sent it and when, dismissed from its ×. */
function OfferChip({
  row,
  offer,
  onDismissOffer,
}: {
  row: GroupTicketRow
  offer: ReviewOfferRowView
  onDismissOffer?: ((ticketKey: string) => void) | undefined
}) {
  return (
    <span
      title={offer.when}
      className="inline-flex max-w-[260px] min-w-0 items-center gap-1 rounded-full border border-(--accent-primary)/40 bg-(--accent-primary)/10 px-2 py-px text-[11.5px] text-(--text-primary)"
    >
      <IconChat className="size-3 shrink-0 text-(--accent-primary)" />
      <span className="min-w-0 truncate">{offer.label}</span>
      {onDismissOffer && !offer.dismissed ? (
        <DismissOffer row={row} onDismissOffer={onDismissOffer} />
      ) : null}
    </span>
  )
}

/** A waiting update as a line under its row: who sent it, when, its Slack message, and Dismiss. */
function OfferStrip({
  row,
  offer,
  onDismissOffer,
}: {
  row: GroupTicketRow
  offer: ReviewOfferRowView
  onDismissOffer?: ((ticketKey: string) => void) | undefined
}) {
  return (
    <div className="flex min-w-0 basis-full flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-(--accent-primary)/8 px-2 py-1 text-[12px]">
      <IconChat className="size-3.5 shrink-0 text-(--accent-primary)" />
      <span className="min-w-0 font-medium text-(--text-primary)">{offer.label}</span>
      <span className="shrink-0 text-(--text-muted)">{offer.when}</span>
      <OfferLink offer={offer} />
      {onDismissOffer && !offer.dismissed ? (
        <button
          type="button"
          className="ml-auto shrink-0 text-(--text-secondary) hover:text-(--text-primary) hover:underline"
          title={REVIEW_OFFER_TEXT.dismissHint(row.key)}
          onClick={(e) => {
            e.stopPropagation()
            onDismissOffer(row.key)
          }}
        >
          {REVIEW_OFFER_TEXT.dismiss}
        </button>
      ) : null}
    </div>
  )
}

function NextTicket({
  row,
  starting,
  onDiscuss,
  onPlan,
  onReview,
  onDismissOffer,
  offerLayout = REVIEW_OFFER_DEFAULT_LAYOUT,
}: Omit<TicketActions, 'onOpenStory'> & { row: GroupTicketRow; starting: boolean }) {
  const offer = onReview ? row.offer : undefined
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
          {row.reviewOpen ? <span className="chip">{REVIEW_START_TEXT.reviewOpen}</span> : null}
          {offer && offerLayout === 'chip' ? (
            <OfferChip row={row} offer={offer} onDismissOffer={onDismissOffer} />
          ) : null}
        </div>
        <span className="text-[13.5px] font-medium text-(--text-primary)">{row.summary}</span>
        <span className="text-[11.5px] text-(--text-muted)">{GROUP_TICKETS_TEXT.explain}</span>
      </div>
      <RowButtons
        row={row}
        starting={starting}
        onDiscuss={onDiscuss}
        onPlan={onPlan}
        offerLayout={offerLayout}
        {...(onReview ? { onReview } : {})}
        {...(onDismissOffer ? { onDismissOffer } : {})}
      />
      {offer && offerLayout === 'strip' ? (
        <OfferStrip row={row} offer={offer} onDismissOffer={onDismissOffer} />
      ) : null}
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
  onReview,
  onDismissOffer,
  offerLayout = REVIEW_OFFER_DEFAULT_LAYOUT,
}: TicketActions & { row: GroupTicketRow; starting: boolean; divided: boolean }) {
  const { work } = row
  const offer = onReview ? row.offer : undefined
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
          {row.reviewOpen ? <span className="chip">{REVIEW_START_TEXT.reviewOpen}</span> : null}
          {offer && offerLayout === 'chip' ? (
            <OfferChip row={row} offer={offer} onDismissOffer={onDismissOffer} />
          ) : null}
          {!work && !row.chatOpen && !row.reviewOpen && !(offer && offerLayout === 'chip') ? (
            <span className="shrink-0 text-[11.5px] text-(--text-muted)">
              {GROUP_TICKETS_TEXT.noWork}
            </span>
          ) : null}
          <RowButtons
            row={row}
            starting={starting}
            onDiscuss={onDiscuss}
            onPlan={onPlan}
            offerLayout={offerLayout}
            {...(onReview ? { onReview } : {})}
            {...(onDismissOffer ? { onDismissOffer } : {})}
          />
        </span>
        {offer && offerLayout === 'strip' ? (
          <OfferStrip row={row} offer={offer} onDismissOffer={onDismissOffer} />
        ) : null}
      </div>
    </li>
  )
}
