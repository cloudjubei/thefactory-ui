import { startColleagueReview } from '../api/colleagueReviewApi'
import { dismissReviewOffer, listTicketReviewOffers } from '../api/colleagueReviewSourceApi'
import { extractErrorMessage } from '../api/errorMessage'
import {
  readGroupTickets,
  startGroupTicketDiscussion,
  startGroupTicketPlan,
} from '../api/groupTicketsApi'
import { readGroupTicketTabs } from '../api/groupTicketTabsApi'
import { reviewChatContext, reviewStartBody } from '../utils/colleagueReviewStart'
import { REVIEW_OFFER_TEXT } from '../utils/colleagueReviewSourceConstants'
import type { TicketReviewOffer } from '../utils/colleagueReviewSourceTypes'
import { REVIEW_START_TEXT } from '../utils/colleagueReviewStartConstants'
import type {
  ColleagueReviewMode,
  ReviewBoxOffer,
  ReviewDraft,
  ReviewDraftFile,
  ReviewFileUpload,
  ReviewStartOutcome,
  ReviewStartPhase,
} from '../utils/colleagueReviewStartTypes'
import { GROUP_TICKETS_SEARCH_WAIT_MS, GROUP_TICKETS_TEXT } from '../utils/groupTicketConstants'
import { GROUP_TICKET_TAB_ROW_TEXT } from '../utils/groupTicketTabConstants'
import { groupTicketShownTab } from '../utils/groupTicketTabs'
import type { LaunchAgentPickMetadata } from '../utils/launchAgentPickTypes'
import type { GroupTicketTabs } from '../utils/groupTicketTabTypes'
import type {
  GroupTicket,
  GroupTicketAction,
  GroupTicketList,
  GroupTicketListName,
  GroupTicketSection,
  GroupTicketsQuery,
  GroupTicketsState,
  TicketPlanStarted,
} from '../utils/groupTicketTypes'

const NOT_READ: GroupTicketSection = { list: undefined, readError: null, loadingMore: false }

const EMPTY: GroupTicketsState = {
  mine: NOT_READ,
  tabs: { tabs: undefined, custom: false, readError: null },
  tab: undefined,
  byTab: {},
  tabCounts: {},
  search: { ...NOT_READ, query: '' },
  starting: undefined,
  startError: null,
  reviewing: {},
  offers: {},
  offerError: null,
}

const READ_FAILED: Record<GroupTicketListName, string> = {
  mine: GROUP_TICKETS_TEXT.readFailed,
  tab: GROUP_TICKETS_TEXT.readFailed,
  search: GROUP_TICKETS_TEXT.searchFailed,
}

/** A list the store reads: the person's, a search, or one tab's by its id. */
type ListKey = 'mine' | 'search' | { tab: string }

const keyName = (key: ListKey): string => (typeof key === 'string' ? key : `tab:${key.tab}`)

const START_FAILED: Record<GroupTicketAction, string> = {
  discuss: GROUP_TICKETS_TEXT.discussFailed,
  plan: GROUP_TICKETS_TEXT.planFailed,
}

const START: Record<
  GroupTicketAction,
  (groupId: string, ticketKey: string) => Promise<TicketPlanStarted>
> = {
  discuss: (groupId, ticketKey) => startGroupTicketDiscussion(groupId, ticketKey),
  plan: (groupId, ticketKey) => startGroupTicketPlan(groupId, ticketKey),
}

function withPage(list: GroupTicketList, page: GroupTicketList): GroupTicketList {
  const held = new Set(list.tickets.map((t) => t.key))
  const { nextPageToken: _read, ...rest } = list
  const nextTicketKey = list.nextTicketKey ?? page.nextTicketKey
  return {
    ...rest,
    tickets: [...list.tickets, ...page.tickets.filter((t) => !held.has(t.key))],
    ...(nextTicketKey ? { nextTicketKey } : {}),
    ...(page.nextPageToken ? { nextPageToken: page.nextPageToken } : {}),
  }
}

function withTicket<S extends GroupTicketSection>(section: S, ticket: GroupTicket): S {
  return withTicketPatch(section, ticket.key, () => ticket)
}

function withTicketPatch<S extends GroupTicketSection>(
  section: S,
  key: string,
  patch: (ticket: GroupTicket) => GroupTicket,
): S {
  const { list } = section
  if (!list?.tickets.some((t) => t.key === key)) return section
  const tickets = list.tickets.map((t) => (t.key === key ? patch(t) : t))
  return { ...section, list: { ...list, tickets } }
}

/** A list without the updates the person settled, its count less them. */
function withoutOffers(list: GroupTicketList, ids: ReadonlySet<string>): GroupTicketList {
  if (ids.size === 0) return list
  const held = list.tickets.filter((t) => t.reviewOffer && ids.has(t.reviewOffer.id))
  if (held.length === 0 && list.reviewOfferCount === 0) return list
  const tickets = list.tickets.map((t) => {
    if (!t.reviewOffer || !ids.has(t.reviewOffer.id)) return t
    const { reviewOffer: _settled, ...rest } = t
    return rest
  })
  return { ...list, tickets, reviewOfferCount: Math.max(0, list.reviewOfferCount - ids.size) }
}

/** A list with a ticket's update back on it, counted again. */
function withOffer(list: GroupTicketList, key: string, offer: TicketReviewOffer): GroupTicketList {
  const tickets = list.tickets.map((t) =>
    t.key === key && !t.reviewOffer ? { ...t, reviewOffer: offer } : t,
  )
  return { ...list, tickets, reviewOfferCount: list.reviewOfferCount + 1 }
}

function without<V>(record: Readonly<Record<string, V>>, key: string): Record<string, V> {
  const { [key]: _gone, ...rest } = record
  return rest
}

/**
 * One group's tickets as its Tickets tab shows them: its tabs, each tab's tickets
 * kept once read so switching back shows them at once, the person's own and a
 * search, each read on its own, so one failing or running late leaves the others
 * be. Only one chat opens at a time, as each can start an agent.
 */
export class GroupTicketsStore {
  private _state: GroupTicketsState = EMPTY
  private readonly _reads = new Map<string, number>()
  private _tabsRead: Promise<void> | undefined
  private readonly _listeners = new Set<() => void>()
  private readonly _groupId: string
  private _typing: ReturnType<typeof setTimeout> | undefined
  /** Every read so far: an update settled after a read began is still in what it answers. */
  private _readCount = 0
  /** The updates the person dismissed or started from, and the read count once the backend had it. */
  private readonly _settled = new Map<string, { after?: number }>()
  private _offersRead: Promise<void> | undefined

  constructor(groupId: string) {
    this._groupId = groupId
  }

  subscribe = (listener: () => void): (() => void) => {
    this._listeners.add(listener)
    return () => this._listeners.delete(listener)
  }

  getState = (): GroupTicketsState => this._state

  private _set(patch: Partial<GroupTicketsState>): void {
    this._state = { ...this._state, ...patch }
    for (const listener of this._listeners) listener()
  }

  /** The tab on screen: the one picked while the group has it, else the first. */
  shownTab = (): string | undefined =>
    groupTicketShownTab(this._state.tabs.tabs, this._state.tab)?.id

  private _keyOf(name: GroupTicketListName): ListKey | undefined {
    if (name !== 'tab') return name
    const tab = this.shownTab()
    return tab ? { tab } : undefined
  }

  private _section(key: ListKey): GroupTicketSection {
    if (typeof key === 'string') return this._state[key]
    return this._state.byTab[key.tab] ?? NOT_READ
  }

  private _patch(key: ListKey, patch: Partial<GroupTicketSection>): void {
    if (typeof key === 'string') {
      this._set({ [key]: { ...this._state[key], ...patch } })
      return
    }
    const { byTab } = this._state
    this._set({ byTab: { ...byTab, [key.tab]: { ...(byTab[key.tab] ?? NOT_READ), ...patch } } })
  }

  private _bump(key: ListKey): number {
    const name = keyName(key)
    const read = (this._reads.get(name) ?? 0) + 1
    this._reads.set(name, read)
    return read
  }

  private _current(key: ListKey, read: number): boolean {
    return this._reads.get(keyName(key)) === read
  }

  private _query(key: ListKey, nextPageToken?: string): GroupTicketsQuery {
    return {
      ...(typeof key === 'string' ? { view: key } : { tab: key.tab }),
      ...(key === 'search' ? { q: this._state.search.query } : {}),
      ...(nextPageToken ? { nextPageToken } : {}),
    }
  }

  /** A list as it was read, and the tab counts it brought. */
  private _took(list: GroupTicketList): Partial<GroupTicketsState> {
    return list.tabCounts ? { tabCounts: { ...this._state.tabCounts, ...list.tabCounts } } : {}
  }

  /** What a read begun at `begun` answers, less the updates the backend may not have settled by then. */
  private _fresh(list: GroupTicketList, begun: number): GroupTicketList {
    const settled = new Set(
      [...this._settled].flatMap(([id, { after }]) =>
        after === undefined || begun <= after ? [id] : [],
      ),
    )
    return withoutOffers(list, settled)
  }

  /** Read a list's first page again. A read a newer one overtook is dropped, a page being read too. */
  private async _read(key: ListKey): Promise<void> {
    const read = this._bump(key)
    const begun = ++this._readCount
    const name: GroupTicketListName = typeof key === 'string' ? key : 'tab'
    try {
      const list = this._fresh(await readGroupTickets(this._groupId, this._query(key)), begun)
      if (!this._current(key, read)) return
      this._set(this._took(list))
      this._patch(key, { list, readError: null, loadingMore: false })
    } catch (err) {
      if (!this._current(key, read)) return
      this._patch(key, {
        readError: extractErrorMessage(err, READ_FAILED[name]),
        loadingMore: false,
      })
    }
  }

  refreshMine = (): Promise<void> => this._read('mine')

  /** Read the group's tabs, once however often it is asked meanwhile; a failed read keeps the tabs read before. */
  readTabs = (): Promise<void> => {
    this._tabsRead ??= readGroupTicketTabs(this._groupId)
      .then(({ tabs, custom }) => this._set({ tabs: { tabs, custom, readError: null } }))
      .catch((err: unknown) =>
        this._set({
          tabs: {
            ...this._state.tabs,
            readError: extractErrorMessage(err, GROUP_TICKET_TAB_ROW_TEXT.tabsFailed),
          },
        }),
      )
      .finally(() => {
        this._tabsRead = undefined
      })
    return this._tabsRead
  }

  /** The group's tabs as Settings saved them: shown at once, the tab on screen read again. */
  tabsChanged = (saved: GroupTicketTabs): void => {
    this._set({ tabs: { tabs: saved.tabs, custom: saved.custom, readError: null } })
    const tab = this.shownTab()
    if (tab && this._state.tabs.tabs) void this._read({ tab })
  }

  /** Show a tab: its tickets at once when read before, read again either way. */
  pickTab = async (tabId: string): Promise<void> => {
    if (tabId === this.shownTab()) return
    this._set({ tab: tabId })
    const tab = this.shownTab()
    if (tab) await this._read({ tab })
  }

  /**
   * Read the tabs, the tab on screen and any search again, and the rows'
   * updates whole once a row shows one. Tabs read before are read again
   * beside the tab, not before it.
   */
  refresh = async (): Promise<void> => {
    const tabsRead = this.readTabs()
    if (!this._state.tabs.tabs) await tabsRead
    const keys: ListKey[] = []
    const tab = this.shownTab()
    if (tab) keys.push({ tab })
    if (this._state.search.query) keys.push('search')
    await Promise.all([tabsRead, ...keys.map((key) => this._read(key))])
    const showsOne = this._sections().some((section) =>
      section.list?.tickets.some((ticket) => ticket.reviewOffer),
    )
    if (showsOne) void this.loadOffers()
  }

  /** Every list held: the person's, each tab's, and the search. */
  private _sections(): GroupTicketSection[] {
    const { mine, byTab, search } = this._state
    return [mine, ...Object.values(byTab), search]
  }

  /** Read the rows' updates whole, waiting or dismissed, once however often it is asked meanwhile; a failed read keeps what was read. */
  loadOffers = (): Promise<void> => {
    this._offersRead ??= listTicketReviewOffers(this._groupId)
      .then((offers) => this._set({ offers: Object.fromEntries(offers.map((o) => [o.id, o])) }))
      .catch(() => undefined)
      .finally(() => {
        this._offersRead = undefined
      })
    return this._offersRead
  }

  /** The update waiting on a ticket, in whichever list holds it. */
  private _offerOn(key: string): TicketReviewOffer | undefined {
    return this._sections()
      .flatMap((section) => section.list?.tickets ?? [])
      .find((t) => t.key === key && t.reviewOffer)?.reviewOffer
  }

  private _eachSection(
    change: <S extends GroupTicketSection>(section: S) => S,
  ): Partial<GroupTicketsState> {
    const { mine, byTab, search } = this._state
    return {
      mine: change(mine),
      byTab: Object.fromEntries(Object.entries(byTab).map(([id, s]) => [id, change(s)])),
      search: change(search),
    }
  }

  private _eachList(
    change: (list: GroupTicketList) => GroupTicketList,
  ): Partial<GroupTicketsState> {
    return this._eachSection((section) =>
      section.list ? { ...section, list: change(section.list) } : section,
    )
  }

  /** Take an update off its ticket at once, as the person settled it. */
  private _settle(offerId: string): void {
    this._settled.set(offerId, {})
    this._set(this._eachList((list) => withoutOffers(list, new Set([offerId]))))
  }

  private _settledBy(offerId: string): void {
    this._settled.set(offerId, { after: this._readCount })
  }

  /** Put an update the backend did not settle back on its ticket. */
  private _unsettle(key: string, offer: TicketReviewOffer, patch: Partial<GroupTicketsState> = {}) {
    this._settled.delete(offer.id)
    this._set({ ...this._eachList((list) => withOffer(list, key, offer)), ...patch })
  }

  /**
   * Dismiss the update waiting on a ticket: gone at once from every list, once
   * however often it is pressed, and back with why when the backend refuses.
   * Answers whether this press dismissed it.
   */
  dismissOffer = async (ticketKey: string): Promise<boolean> => {
    const offer = this._offerOn(ticketKey)
    if (!offer || this._settled.has(offer.id)) return false
    this._settle(offer.id)
    this._set({ offerError: null })
    try {
      await dismissReviewOffer(this._groupId, offer.id)
      this._settledBy(offer.id)
      return true
    } catch (err) {
      this._unsettle(ticketKey, offer, {
        offerError: extractErrorMessage(err, REVIEW_OFFER_TEXT.dismissFailed),
      })
      return false
    }
  }

  loadMore = async (name: GroupTicketListName): Promise<void> => {
    const key = this._keyOf(name)
    if (!key) return
    const { list, loadingMore } = this._section(key)
    if (!list?.nextPageToken || loadingMore) return
    const read = this._bump(key)
    const begun = ++this._readCount
    this._patch(key, { loadingMore: true })
    try {
      const page = this._fresh(
        await readGroupTickets(this._groupId, this._query(key, list.nextPageToken)),
        begun,
      )
      if (this._current(key, read)) {
        this._set(this._took(page))
        this._patch(key, { list: withPage(list, page), readError: null, loadingMore: false })
      }
    } catch (err) {
      if (!this._current(key, read)) return
      this._patch(key, {
        readError: extractErrorMessage(err, READ_FAILED[name]),
        loadingMore: false,
      })
    }
  }

  /** Search for what was typed; nothing typed ends the search, and any answer still coming. */
  search = async (typed: string): Promise<void> => {
    const query = typed.trim()
    if (query === this._state.search.query) return
    this._bump('search')
    this._set({ search: { ...NOT_READ, query } })
    if (query) await this._read('search')
  }

  /** The search box as it is typed in: searched once typing rests, ended at once when cleared. */
  typed = (text: string): void => {
    this.stopTyping()
    if (text.trim()) {
      this._typing = setTimeout(() => void this.search(text), GROUP_TICKETS_SEARCH_WAIT_MS)
    } else {
      void this.search('')
    }
  }

  stopTyping = (): void => clearTimeout(this._typing)

  private async _start(
    key: string,
    action: GroupTicketAction,
  ): Promise<TicketPlanStarted | undefined> {
    if (this._state.starting) return undefined
    this._set({ starting: { key, action }, startError: null })
    try {
      const started = await START[action](this._groupId, key)
      this._set({
        ...this._eachSection((section) => withTicket(section, started.ticket)),
        starting: undefined,
      })
      return started
    } catch (err) {
      this._set({
        starting: undefined,
        startError: extractErrorMessage(err, START_FAILED[action]),
      })
      await this.refresh()
      return undefined
    }
  }

  private _reviewPhase(key: string, phase: ReviewStartPhase | undefined): void {
    const { reviewing } = this._state
    this._set({ reviewing: phase ? { ...reviewing, [key]: phase } : without(reviewing, key) })
  }

  /** Mark a ticket as having a review, in every list that holds it. */
  markReviewOpen = (ticketKey: string): void => {
    const open = (t: GroupTicket) => (t.reviewOpen ? t : { ...t, reviewOpen: true })
    this._set(this._eachSection((section) => withTicketPatch(section, ticketKey, open)))
  }

  /**
   * Start a ticket's next review round: its files go up to the review's chat
   * one by one, then the round starts. Each ticket's round starts on its own,
   * beside any chat opening; a ticket already starting one answers `undefined`.
   * A failure hands the draft back, every file that went up keeping its path.
   * Started from an update from Slack, the update leaves its ticket at once,
   * and comes back when the round does not start. `mode` says how the round
   * is reviewed; the group's default when left out. `agent` is the agent
   * picked for it; the chat's when left out.
   */
  review = async (
    ticketKey: string,
    draft: ReviewDraft,
    upload: ReviewFileUpload,
    offer?: ReviewBoxOffer,
    mode?: ColleagueReviewMode,
    agent: LaunchAgentPickMetadata = {},
  ): Promise<ReviewStartOutcome | undefined> => {
    if (this._state.reviewing[ticketKey]) return undefined
    const shown = this._offerOn(ticketKey)
    const onTicket = offer && shown?.id === offer.id ? shown : undefined
    if (onTicket) this._settle(onTicket.id)
    const context = reviewChatContext(this._groupId, ticketKey)
    const files: ReviewDraftFile[] = [...draft.files]
    const total = files.length
    const uploading = (): ReviewStartPhase => ({
      step: 'uploading',
      done: files.filter((f) => f.path).length,
      total,
    })
    const fail = (error: string): ReviewStartOutcome => {
      this._reviewPhase(ticketKey, undefined)
      if (onTicket) this._unsettle(ticketKey, onTicket)
      return { ok: false, error, draft: { ...draft, files } }
    }
    this._reviewPhase(ticketKey, total > 0 ? uploading() : { step: 'starting' })
    for (const [at, entry] of files.entries()) {
      if (entry.path) continue
      try {
        files[at] = { ...entry, path: await upload(context, entry.file) }
      } catch (err) {
        return fail(extractErrorMessage(err, REVIEW_START_TEXT.uploadFailed(entry.file.name)))
      }
      this._reviewPhase(ticketKey, uploading())
    }
    this._reviewPhase(ticketKey, { step: 'starting' })
    const attachments = files.flatMap((f) => (f.path ? [f.path] : []))
    try {
      const started = await startColleagueReview(this._groupId, ticketKey, {
        ...agent,
        ...reviewStartBody(
          { ticketKey, nextRound: false, draft, ...(offer ? { offer } : {}) },
          attachments,
          mode,
        ),
      })
      if (onTicket) this._settledBy(onTicket.id)
      this._reviewPhase(ticketKey, undefined)
      this.markReviewOpen(ticketKey)
      return { ok: true, started }
    } catch (err) {
      return fail(extractErrorMessage(err, REVIEW_START_TEXT.failed))
    }
  }

  /** Open a ticket's chat to talk it over; answers it, or `undefined` with why in `startError`. */
  discuss = (ticketKey: string): Promise<TicketPlanStarted | undefined> =>
    this._start(ticketKey, 'discuss')

  /** Open a ticket's planning chat; answers it, or `undefined` with why in `startError`. */
  plan = (ticketKey: string): Promise<TicketPlanStarted | undefined> =>
    this._start(ticketKey, 'plan')
}
