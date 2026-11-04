import { extractErrorMessage } from '../api/errorMessage'
import { readGroupTickets, startGroupTicketPlan } from '../api/groupTicketsApi'
import { TAKE_NEXT_TICKET_TEXT } from '../utils/groupTicketConstants'
import type {
  GroupTicketList,
  GroupTicketsState,
  TicketPlanStarted,
} from '../utils/groupTicketTypes'

const EMPTY: GroupTicketsState = {
  list: undefined,
  readError: null,
  loadingMore: false,
  planning: undefined,
  planError: null,
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

/**
 * One group's sprint tickets as its Stories tab shows them, and the plan of one.
 * Only one plan starts at a time, as each opens a chat and starts an agent.
 */
export class GroupTicketsStore {
  private _state: GroupTicketsState = EMPTY
  private _reads = 0
  private readonly _listeners = new Set<() => void>()
  private readonly _groupId: string

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

  /** Read the first page again. A read a newer one overtook is dropped, a page being read too. */
  refresh = async (): Promise<void> => {
    const read = ++this._reads
    try {
      const list = await readGroupTickets(this._groupId)
      if (read === this._reads) this._set({ list, readError: null, loadingMore: false })
    } catch (err) {
      if (read !== this._reads) return
      this._set({
        readError: extractErrorMessage(err, TAKE_NEXT_TICKET_TEXT.readFailed),
        loadingMore: false,
      })
    }
  }

  loadMore = async (): Promise<void> => {
    const { list, loadingMore } = this._state
    if (!list?.nextPageToken || loadingMore) return
    const read = ++this._reads
    this._set({ loadingMore: true })
    try {
      const page = await readGroupTickets(this._groupId, list.nextPageToken)
      if (read === this._reads) {
        this._set({ list: withPage(list, page), readError: null, loadingMore: false })
      }
    } catch (err) {
      if (read !== this._reads) return
      this._set({
        readError: extractErrorMessage(err, TAKE_NEXT_TICKET_TEXT.readFailed),
        loadingMore: false,
      })
    }
  }

  /** Open a ticket's planning chat; answers it, or `undefined` with why in `planError`. */
  plan = async (ticketKey: string): Promise<TicketPlanStarted | undefined> => {
    if (this._state.planning) return undefined
    this._set({ planning: ticketKey, planError: null })
    try {
      const started = await startGroupTicketPlan(this._groupId, ticketKey)
      this._set({ planning: undefined })
      return started
    } catch (err) {
      this._set({
        planning: undefined,
        planError: extractErrorMessage(err, TAKE_NEXT_TICKET_TEXT.planFailed),
      })
      await this.refresh()
      return undefined
    }
  }
}
