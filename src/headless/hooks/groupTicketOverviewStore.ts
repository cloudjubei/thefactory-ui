import { extractErrorMessage } from '../api/errorMessage'
import { readGroupTicketOverview } from '../api/groupTicketTabsApi'
import { GROUP_TICKET_PAGE_TEXT } from '../utils/groupTicketPageConstants'
import type { GroupTicketOverview } from '../utils/groupTicketPageTypes'

/** One ticket's overview as its page draws it. */
export interface GroupTicketOverviewSnapshot {
  /** Undefined until the first read answers. */
  overview: GroupTicketOverview | undefined
  readError: string | undefined
  reading: boolean
}

const UNREAD: GroupTicketOverviewSnapshot = {
  overview: undefined,
  readError: undefined,
  reading: false,
}

/**
 * A group's ticket pages: each ticket's overview, kept once read so its page
 * opens again at once, read once however often it is asked meanwhile. A read
 * that fails keeps what was read before, with why.
 */
export class GroupTicketOverviewStore {
  private readonly _groupId: string
  private readonly _held = new Map<string, GroupTicketOverviewSnapshot>()
  private readonly _reads = new Map<string, Promise<void>>()
  private readonly _listeners = new Map<string, Set<() => void>>()

  constructor(groupId: string) {
    this._groupId = groupId
  }

  snapshot = (ticketKey: string): GroupTicketOverviewSnapshot => this._held.get(ticketKey) ?? UNREAD

  listen = (ticketKey: string, listener: () => void): (() => void) => {
    const listeners = this._listeners.get(ticketKey) ?? new Set()
    listeners.add(listener)
    this._listeners.set(ticketKey, listeners)
    return () => listeners.delete(listener)
  }

  private _set(ticketKey: string, patch: Partial<GroupTicketOverviewSnapshot>): void {
    this._held.set(ticketKey, { ...this.snapshot(ticketKey), ...patch })
    for (const listener of this._listeners.get(ticketKey) ?? []) listener()
  }

  /** Read a ticket's overview again. */
  read = (ticketKey: string): Promise<void> => {
    const going = this._reads.get(ticketKey)
    if (going) return going
    this._set(ticketKey, { reading: true })
    const read = readGroupTicketOverview(this._groupId, ticketKey)
      .then((overview) => this._set(ticketKey, { overview, readError: undefined, reading: false }))
      .catch((err: unknown) =>
        this._set(ticketKey, {
          readError: extractErrorMessage(err, GROUP_TICKET_PAGE_TEXT.readFailed),
          reading: false,
        }),
      )
      .finally(() => this._reads.delete(ticketKey))
    this._reads.set(ticketKey, read)
    return read
  }
}
