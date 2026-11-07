import { extractErrorMessage } from '../api/errorMessage'
import { TICKET_TRANSITION_FIELD } from '../utils/ticketConnectionConstants'
import type { TicketStatusList } from '../utils/ticketConnectionTypes'

const READING: TicketStatusList = { kind: 'reading' }

/**
 * The statuses of the connection a binding uses, read again when it or its project
 * keys change. A read a newer one overtook is dropped, and one that gets no list
 * says why, so the setting can fall back to typing a name.
 */
export class TicketStatusesReader {
  private _state: TicketStatusList = READING
  private _reads = 0
  private readonly _listeners = new Set<() => void>()
  private readonly _list: (
    connectionId: string,
    projectKeys: readonly string[],
  ) => Promise<readonly string[]>

  constructor(
    list: (connectionId: string, projectKeys: readonly string[]) => Promise<readonly string[]>,
  ) {
    this._list = list
  }

  getState = (): TicketStatusList => this._state

  subscribe = (listener: () => void): (() => void) => {
    this._listeners.add(listener)
    return () => this._listeners.delete(listener)
  }

  /** Marks the list as being read, for the wait before `read` is called. */
  begin = (): void => {
    this._reads += 1
    this._set(READING)
  }

  /** There is no connection to read. */
  none = (): void => {
    this._reads += 1
    this._set({ kind: 'failed', reason: TICKET_TRANSITION_FIELD.noConnection })
  }

  read = async (connectionId: string, projectKeys: readonly string[]): Promise<void> => {
    const read = ++this._reads
    this._set(READING)
    try {
      const statuses = await this._list(connectionId, projectKeys)
      if (read !== this._reads) return
      this._set(
        statuses.length
          ? { kind: 'ready', statuses }
          : { kind: 'failed', reason: TICKET_TRANSITION_FIELD.noStatuses },
      )
    } catch (err) {
      if (read !== this._reads) return
      const reason = extractErrorMessage(err, TICKET_TRANSITION_FIELD.listFailed)
      this._set({ kind: 'failed', reason })
    }
  }

  private _set(next: TicketStatusList): void {
    this._state = next
    for (const listener of this._listeners) listener()
  }
}
