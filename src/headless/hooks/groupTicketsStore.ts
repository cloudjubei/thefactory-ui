import { extractErrorMessage } from '../api/errorMessage'
import {
  readGroupTickets,
  startGroupTicketDiscussion,
  startGroupTicketPlan,
} from '../api/groupTicketsApi'
import { GROUP_TICKETS_SEARCH_WAIT_MS, GROUP_TICKETS_TEXT } from '../utils/groupTicketConstants'
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
  sprint: NOT_READ,
  search: { ...NOT_READ, query: '' },
  starting: undefined,
  startError: null,
}

const READ_FAILED: Record<GroupTicketListName, string> = {
  mine: GROUP_TICKETS_TEXT.readFailed,
  sprint: GROUP_TICKETS_TEXT.readFailed,
  search: GROUP_TICKETS_TEXT.searchFailed,
}

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
  const { list } = section
  if (!list?.tickets.some((t) => t.key === ticket.key)) return section
  const tickets = list.tickets.map((t) => (t.key === ticket.key ? ticket : t))
  return { ...section, list: { ...list, tickets } }
}

/**
 * One group's tickets as its Tickets tab shows them: the person's, the rest of the
 * sprint and a search, each read on its own, so one failing or running late leaves
 * the others be. Only one chat opens at a time, as each can start an agent.
 */
export class GroupTicketsStore {
  private _state: GroupTicketsState = EMPTY
  private readonly _reads: Record<GroupTicketListName, number> = { mine: 0, sprint: 0, search: 0 }
  private readonly _listeners = new Set<() => void>()
  private readonly _groupId: string
  private _typing: ReturnType<typeof setTimeout> | undefined

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

  private _patch(name: GroupTicketListName, patch: Partial<GroupTicketSection>): void {
    this._set({ [name]: { ...this._state[name], ...patch } })
  }

  private _query(name: GroupTicketListName, nextPageToken?: string): GroupTicketsQuery {
    return {
      view: name,
      ...(name === 'search' ? { q: this._state.search.query } : {}),
      ...(nextPageToken ? { nextPageToken } : {}),
    }
  }

  /** Read a list's first page again. A read a newer one overtook is dropped, a page being read too. */
  private async _read(name: GroupTicketListName): Promise<void> {
    const read = ++this._reads[name]
    try {
      const list = await readGroupTickets(this._groupId, this._query(name))
      if (read === this._reads[name])
        this._patch(name, { list, readError: null, loadingMore: false })
    } catch (err) {
      if (read !== this._reads[name]) return
      this._patch(name, {
        readError: extractErrorMessage(err, READ_FAILED[name]),
        loadingMore: false,
      })
    }
  }

  refreshMine = (): Promise<void> => this._read('mine')

  /** Read every list on screen again. */
  refresh = async (): Promise<void> => {
    const names: GroupTicketListName[] = ['mine', 'sprint']
    if (this._state.search.query) names.push('search')
    await Promise.all(names.map((name) => this._read(name)))
  }

  loadMore = async (name: GroupTicketListName): Promise<void> => {
    const { list, loadingMore } = this._state[name]
    if (!list?.nextPageToken || loadingMore) return
    const read = ++this._reads[name]
    this._patch(name, { loadingMore: true })
    try {
      const page = await readGroupTickets(this._groupId, this._query(name, list.nextPageToken))
      if (read === this._reads[name]) {
        this._patch(name, { list: withPage(list, page), readError: null, loadingMore: false })
      }
    } catch (err) {
      if (read !== this._reads[name]) return
      this._patch(name, {
        readError: extractErrorMessage(err, READ_FAILED[name]),
        loadingMore: false,
      })
    }
  }

  /** Search for what was typed; nothing typed ends the search, and any answer still coming. */
  search = async (typed: string): Promise<void> => {
    const query = typed.trim()
    if (query === this._state.search.query) return
    this._reads.search++
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
      const { mine, sprint, search } = this._state
      this._set({
        mine: withTicket(mine, started.ticket),
        sprint: withTicket(sprint, started.ticket),
        search: withTicket(search, started.ticket),
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

  /** Open a ticket's chat to talk it over; answers it, or `undefined` with why in `startError`. */
  discuss = (ticketKey: string): Promise<TicketPlanStarted | undefined> =>
    this._start(ticketKey, 'discuss')

  /** Open a ticket's planning chat; answers it, or `undefined` with why in `startError`. */
  plan = (ticketKey: string): Promise<TicketPlanStarted | undefined> =>
    this._start(ticketKey, 'plan')
}
