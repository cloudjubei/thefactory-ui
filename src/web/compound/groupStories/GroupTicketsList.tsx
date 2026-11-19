import { useState, type KeyboardEvent, type ReactNode } from 'react'

import {
  GROUP_TICKET_TAB_ACTION_LABELS,
  GROUP_TICKET_TAB_ROW_TEXT,
  GROUP_TICKET_TABS_DEFAULT_LAYOUT,
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
  type GroupTicketTabItem,
  type GroupTicketTabsLayout,
  type ReviewOfferLayout,
  type ReviewOfferRowView,
} from '../../../headless'
import { IconChat, IconClose, IconExternalLink, IconSearch } from '../../icons'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import { NativeSelect } from '../../primitives/NativeSelect'
import SegmentedControl from '../../primitives/SegmentedControl'
import Spinner from '../../primitives/Spinner'
import ReviewTabBar from '../chat/signoff/ReviewTabBar'
import TicketChip from '../chips/TicketChip'
import { GroupStoryStoryChip } from './GroupStoryBits'

export type TicketActions = {
  /** Open a ticket's page: what a press on its row does. */
  onOpen: (ticketKey: string) => void
  /** Open a ticket's discussion; its chat opens once it has started. */
  onDiscuss: (ticketKey: string) => void
  /** Take a ticket: start its plan; its chat opens once it has started. */
  onPlan: (ticketKey: string) => void
  /** Open the group story working a ticket: Carry on, and its chip. */
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
  /** Show another tab. */
  onPickTab: (tabId: string) => void
  /** Open Settings → Group, for a group with no Jira. */
  onOpenSettings: () => void
  /** Read the tickets again. */
  onRetry: () => void
  onLoadMore: (name: GroupTicketListName) => void
  /** How a tab lays out the person's tickets and everyone else's. */
  layout?: GroupTicketsLayout
  /** Where the tabs sit. */
  tabsLayout?: GroupTicketTabsLayout
  /** The side One list at a time starts on — for a fixed showcase state. */
  shownFirst?: GroupTicketsShown
}

type Listed = Extract<GroupTicketsView, { kind: 'tickets' }>

const HEADING_CLASS = 'm-0 text-[12px] font-medium text-(--text-primary)'
const NOTE_CLASS = 'm-0 text-[12.5px] text-(--text-secondary)'
const LABEL_CLASS = 'text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)'

/**
 * A group's tickets by tab: the tabs with their counts, and inside the tab on
 * screen the person's tickets first — the next one to take on top — then
 * everyone else's, each row with the tab's actions for its side. A search
 * finds any ticket. Pressing a row opens its page; Discuss is its own button.
 * All a ticket says comes from Jira, so all of it is plain text.
 */
export default function GroupTicketsList({
  view,
  query,
  onQueryChange,
  onPickTab,
  onOpenSettings,
  onRetry,
  onLoadMore,
  layout = GROUP_TICKETS_DEFAULT_LAYOUT,
  tabsLayout = GROUP_TICKET_TABS_DEFAULT_LAYOUT,
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
  if (view.kind === 'failed') {
    return (
      <div className="p-4">
        <ReadFailed error={view.error} onRetry={onRetry} />
      </div>
    )
  }

  const list = { starting: view.starting, ...actions }
  const yours = (
    <TicketSection
      {...list}
      heading={layout === 'segmented' ? undefined : GROUP_TICKETS_TEXT.yours}
      section={view.mine}
      top={view.next ? <NextTicket row={view.next} starting={view.starting} {...actions} /> : null}
    />
  )
  const others = (
    <TicketSection
      {...list}
      heading={layout === 'segmented' ? undefined : GROUP_TICKETS_TEXT.othersShort}
      section={view.others}
    />
  )
  const sides =
    layout === 'columns' ? (
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
    )

  const tab = (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      {view.readError ? <ReadFailed error={view.readError} onRetry={onRetry} /> : null}
      {view.emptyLine ? (
        <p className={NOTE_CLASS}>{view.emptyLine}</p>
      ) : (
        <>
          {sides}
          {view.canLoadMore ? (
            <div className="flex">
              <Button
                size="sm"
                variant="ghost"
                loading={view.loadingMore}
                onClick={() => onLoadMore('tab')}
              >
                {GROUP_TICKETS_TEXT.showMore}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
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
      {view.startError ? <Alert variant="error">{view.startError}</Alert> : null}
      {view.offerError ? <Alert variant="error">{view.offerError}</Alert> : null}
      {view.search ? (
        <TicketSection
          {...list}
          heading={GROUP_TICKETS_TEXT.results}
          section={view.search}
          loadingLine={GROUP_TICKETS_TEXT.searching}
          onRetry={onRetry}
          onLoadMore={() => onLoadMore('search')}
        />
      ) : tabsLayout === 'side' ? (
        <div className="flex flex-col gap-4 @3xl:flex-row @3xl:items-start">
          <div className="@3xl:hidden">
            <TabBar tabs={view.tabs} active={view.tab} onPick={onPickTab} />
          </div>
          <SideTabs tabs={view.tabs} active={view.tab} onPick={onPickTab} />
          {tab}
        </div>
      ) : tabsLayout === 'menu' ? (
        <>
          <TabMenu tabs={view.tabs} active={view.tab} onPick={onPickTab} />
          {tab}
        </>
      ) : (
        <>
          <TabBar tabs={view.tabs} active={view.tab} onPick={onPickTab} />
          {tab}
        </>
      )}
    </div>
  )
}

type TabPick = {
  tabs: readonly GroupTicketTabItem[]
  active: string
  onPick: (tabId: string) => void
}

function TabBar({ tabs, active, onPick }: TabPick) {
  return (
    <ReviewTabBar<string>
      ariaLabel={GROUP_TICKETS_TEXT.heading}
      tabs={tabs}
      active={active}
      onChange={onPick}
    />
  )
}

function SideTabs({ tabs, active, onPick }: TabPick) {
  return (
    <nav
      aria-label={GROUP_TICKETS_TEXT.heading}
      className="hidden w-44 shrink-0 flex-col gap-0.5 @3xl:flex"
    >
      {tabs.map((tab) => {
        const selected = tab.id === active
        return (
          <button
            key={tab.id}
            type="button"
            aria-current={selected || undefined}
            onClick={() => onPick(tab.id)}
            className={`flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-[12.5px] font-medium ${
              selected
                ? 'bg-(--accent-primary)/12 text-(--text-primary)'
                : 'text-(--text-muted) hover:bg-(--surface-hover) hover:text-(--text-primary)'
            }`}
          >
            <span className="min-w-0 truncate">{tab.label}</span>
            {tab.count !== undefined ? (
              <span className="text-[11px] tabular-nums opacity-80">{tab.count}</span>
            ) : null}
          </button>
        )
      })}
    </nav>
  )
}

function TabMenu({ tabs, active, onPick }: TabPick) {
  return (
    <NativeSelect
      size="sm"
      aria-label={GROUP_TICKETS_TEXT.heading}
      value={active}
      onChange={(e) => onPick(e.target.value)}
      className="self-start sm:w-64"
    >
      {tabs.map((tab) => (
        <option key={tab.id} value={tab.id}>
          {tab.count !== undefined ? `${tab.label} (${tab.count})` : tab.label}
        </option>
      ))}
    </NativeSelect>
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
  onRetry?: () => void
  onLoadMore?: () => void
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
      {section.readError && onRetry ? (
        <ReadFailed error={section.readError} onRetry={onRetry} />
      ) : null}
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
          {section.canLoadMore && onLoadMore ? (
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

/** A press on the row itself opens its page: one on a chip or a button inside it stays with that. */
function rowPress(row: GroupTicketRow, onOpen: (ticketKey: string) => void) {
  const press = () => onOpen(row.key)
  return {
    role: 'button',
    tabIndex: 0,
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

const stop =
  (go: () => void) =>
  (e: { stopPropagation: () => void }): void => {
    e.stopPropagation()
    go()
  }

/** The row's actions, as its tab offers them for its side. */
export function RowButtons({
  row,
  starting,
  onOpen,
  onDiscuss,
  onPlan,
  onOpenStory,
  onReview,
  onDismissOffer,
  offerLayout = REVIEW_OFFER_DEFAULT_LAYOUT,
}: TicketActions & { row: GroupTicketRow; starting: boolean }) {
  const offer = onReview && row.reviewing === undefined ? row.offer : undefined
  const { work } = row
  return (
    <span className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-1.5">
      {row.actions.map((action) => {
        switch (action) {
          case 'take':
            return (
              <Button
                key={action}
                size="sm"
                variant="primary"
                loading={row.starting === 'plan'}
                disabled={starting}
                onClick={stop(() => onPlan(row.key))}
              >
                {row.starting === 'plan'
                  ? GROUP_TICKETS_TEXT.starting
                  : GROUP_TICKET_TAB_ACTION_LABELS.take}
              </Button>
            )
          case 'carry-on':
            return work ? (
              <Button
                key={action}
                size="sm"
                variant="secondary"
                title={GROUP_TICKET_TAB_ROW_TEXT.carryOnHint(work.title)}
                onClick={stop(() => onOpenStory(work.id))}
              >
                {GROUP_TICKET_TAB_ACTION_LABELS['carry-on']}
              </Button>
            ) : null
          case 'review':
            return onReview ? (
              <span key={action} className="inline-flex items-center gap-1.5">
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
                  onClick={stop(() => onReview(row.key))}
                >
                  {row.reviewing !== undefined ? <Spinner size={12} /> : null}
                  {offer && offerLayout === 'button' ? (
                    <span aria-hidden className="size-1.5 rounded-full bg-current" />
                  ) : null}
                  {reviewLabel(row, offerLayout === 'button')}
                </Button>
                {offer && offerLayout === 'button' && onDismissOffer && !offer.dismissed ? (
                  <DismissOffer row={row} onDismissOffer={onDismissOffer} />
                ) : null}
              </span>
            ) : null
          case 'approve-and-merge':
            return (
              <Button
                key={action}
                size="sm"
                variant="secondary"
                onClick={stop(() => onOpen(row.key))}
              >
                {GROUP_TICKET_TAB_ACTION_LABELS['approve-and-merge']}
              </Button>
            )
          case 'discuss':
            return (
              <Button
                key={action}
                size="sm"
                variant="secondary"
                loading={row.starting === 'discuss'}
                disabled={starting}
                onClick={stop(() => onDiscuss(row.key))}
              >
                {row.starting === 'discuss'
                  ? GROUP_TICKETS_TEXT.opening
                  : GROUP_TICKETS_TEXT.discuss}
              </Button>
            )
          default:
            return null
        }
      })}
    </span>
  )
}

/** Replies to the person's update and comments on their pull requests, as a chip on their row. */
export function RepliesChip({ row }: { row: GroupTicketRow }) {
  const { replies } = row
  if (!replies) return null
  return (
    <span
      title={
        replies.when
          ? `${replies.line} · ${GROUP_TICKET_TAB_ROW_TEXT.latest(replies.when)}`
          : replies.line
      }
      className={`inline-flex max-w-full min-w-0 items-center gap-1 rounded-full border px-2 py-px text-[11.5px] ${
        replies.none
          ? 'border-(--border-subtle) text-(--text-muted)'
          : 'border-(--accent-primary)/40 bg-(--accent-primary)/10 text-(--text-primary)'
      }`}
    >
      <IconChat className={`size-3 shrink-0 ${replies.none ? '' : 'text-(--accent-primary)'}`} />
      <span className="min-w-0 truncate">{replies.line}</span>
      {replies.when ? (
        <span className="shrink-0 text-(--text-muted)">
          · {GROUP_TICKET_TAB_ROW_TEXT.latest(replies.when)}
        </span>
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
      onClick={stop(() => onDismissOffer(row.key))}
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
          onClick={stop(() => onDismissOffer(row.key))}
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
  offerLayout = REVIEW_OFFER_DEFAULT_LAYOUT,
  ...actions
}: TicketActions & { row: GroupTicketRow; starting: boolean }) {
  const offer = actions.onReview && row.actions.includes('review') ? row.offer : undefined
  return (
    <div
      {...rowPress(row, actions.onOpen)}
      className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 bg-(--accent-primary)/5 px-3 py-2.5 hover:bg-(--surface-hover) focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
    >
      <div className="flex min-w-0 flex-1 basis-[260px] flex-col gap-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className={LABEL_CLASS}>{GROUP_TICKETS_TEXT.next}</span>
          <TicketChip view={row.chip} />
          {row.priority ? <span className="chip">{row.priority}</span> : null}
          {row.chatOpen ? <span className="chip">{GROUP_TICKETS_TEXT.chatOpen}</span> : null}
          {row.reviewOpen ? <span className="chip">{REVIEW_START_TEXT.reviewOpen}</span> : null}
          {offer && offerLayout === 'chip' ? (
            <OfferChip row={row} offer={offer} onDismissOffer={actions.onDismissOffer} />
          ) : null}
        </div>
        <span className="text-[13.5px] font-medium text-(--text-primary)">{row.summary}</span>
        <span className="text-[11.5px] text-(--text-muted)">{GROUP_TICKETS_TEXT.explain}</span>
      </div>
      <RowButtons row={row} starting={starting} offerLayout={offerLayout} {...actions} />
      {offer && offerLayout === 'strip' ? (
        <OfferStrip row={row} offer={offer} onDismissOffer={actions.onDismissOffer} />
      ) : null}
    </div>
  )
}

function TicketRow({
  row,
  starting,
  divided,
  offerLayout = REVIEW_OFFER_DEFAULT_LAYOUT,
  ...actions
}: TicketActions & { row: GroupTicketRow; starting: boolean; divided: boolean }) {
  const { work } = row
  const offer = actions.onReview && row.actions.includes('review') ? row.offer : undefined
  return (
    <li className={divided ? 'border-t border-(--border-subtle)' : undefined}>
      <div
        {...rowPress(row, actions.onOpen)}
        className="flex cursor-pointer flex-wrap items-center gap-x-2.5 gap-y-1 px-3 py-1.5 hover:bg-(--surface-hover) focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
      >
        <TicketChip view={row.chip} />
        {row.priority ? <span className="chips-sub__label">{row.priority}</span> : null}
        <span className="line-clamp-2 min-w-0 flex-1 basis-full text-[12.5px] text-(--text-primary) @2xl:basis-[200px]">
          {row.summary}
        </span>
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1 @2xl:flex-none">
          {work ? (
            <span className="min-w-0 max-w-[260px]">
              <GroupStoryStoryChip title={work.title} onOpen={() => actions.onOpenStory(work.id)} />
            </span>
          ) : null}
          {row.chatOpen ? <span className="chip">{GROUP_TICKETS_TEXT.chatOpen}</span> : null}
          {row.reviewOpen ? <span className="chip">{REVIEW_START_TEXT.reviewOpen}</span> : null}
          <RepliesChip row={row} />
          {offer && offerLayout === 'chip' ? (
            <OfferChip row={row} offer={offer} onDismissOffer={actions.onDismissOffer} />
          ) : null}
          {!work &&
          !row.chatOpen &&
          !row.reviewOpen &&
          !row.replies &&
          !(offer && offerLayout === 'chip') ? (
            <span className="shrink-0 text-[11.5px] text-(--text-muted)">
              {GROUP_TICKETS_TEXT.noWork}
            </span>
          ) : null}
          <RowButtons row={row} starting={starting} offerLayout={offerLayout} {...actions} />
        </span>
        {offer && offerLayout === 'strip' ? (
          <OfferStrip row={row} offer={offer} onDismissOffer={actions.onDismissOffer} />
        ) : null}
      </div>
    </li>
  )
}
