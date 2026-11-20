import { extractErrorMessage } from '../api/errorMessage'
import { postTicketUpdate, readTicketUpdate } from '../api/ticketUpdateApi'
import type { ProcessDeliveryTarget } from '../utils/processDeliveryTypes'
import { TICKET_UPDATE_COPY } from '../utils/ticketUpdateConstants'
import type { TicketUpdateState } from '../utils/ticketUpdateTypes'

const EMPTY: TicketUpdateState = { data: undefined, readError: null, posting: false, error: null }

/**
 * One work's ticket update: read, and posted once. The post shows on its way
 * at once and rolls back with why on a refusal; a second press while it goes
 * is the same press, and a press once posted posts nothing.
 */
export class TicketUpdateStore {
  private _state: TicketUpdateState = EMPTY
  private _reading: Promise<void> | undefined
  private _posting: Promise<boolean> | undefined
  private readonly _listeners = new Set<() => void>()
  private readonly _target: ProcessDeliveryTarget

  constructor(target: ProcessDeliveryTarget) {
    this._target = target
  }

  subscribe = (listener: () => void): (() => void) => {
    this._listeners.add(listener)
    return () => this._listeners.delete(listener)
  }

  getState = (): TicketUpdateState => this._state

  private _set(patch: Partial<TicketUpdateState>): void {
    this._state = { ...this._state, ...patch }
    for (const listener of this._listeners) listener()
  }

  refresh = (): Promise<void> => {
    this._reading ??= readTicketUpdate(this._target)
      .then(
        (data) => this._set({ data, readError: null }),
        (err: unknown) =>
          this._set({ readError: extractErrorMessage(err, TICKET_UPDATE_COPY.readFailed) }),
      )
      .finally(() => {
        this._reading = undefined
      })
    return this._reading
  }

  post = (): Promise<boolean> => {
    if (this._state.data?.posted) return Promise.resolve(true)
    this._posting ??= this._send().finally(() => {
      this._posting = undefined
    })
    return this._posting
  }

  private async _send(): Promise<boolean> {
    this._set({ posting: true, error: null })
    try {
      const data = await postTicketUpdate(this._target)
      this._set({ data, posting: false })
      return true
    } catch (err) {
      this._set({ posting: false, error: extractErrorMessage(err, TICKET_UPDATE_COPY.failed) })
      return false
    }
  }
}
