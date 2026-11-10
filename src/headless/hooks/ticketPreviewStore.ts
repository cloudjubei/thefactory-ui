import { TICKET_CARD_TEXT } from '../utils/ticketCardConstants'
import type { TicketPreview, TicketPreviewState } from '../utils/ticketCardTypes'

const IDLE: TicketPreviewState = { kind: 'idle' }
const LOADING: TicketPreviewState = { kind: 'loading' }
const FAILED: TicketPreviewState = { kind: 'failed', reason: TICKET_CARD_TEXT.failed }

/**
 * The ticket previews one scope has read, by key: each read once, on the first
 * ask for it, and kept. A read that failed says so and is tried again on the
 * next ask.
 */
export class TicketPreviewStore {
  private readonly _states = new Map<string, TicketPreviewState>()
  private readonly _listeners = new Set<() => void>()
  private readonly _read: (key: string) => Promise<TicketPreview>

  constructor(read: (key: string) => Promise<TicketPreview>) {
    this._read = read
  }

  getState = (key: string): TicketPreviewState => this._states.get(key.toUpperCase()) ?? IDLE

  subscribe = (listener: () => void): (() => void) => {
    this._listeners.add(listener)
    return () => this._listeners.delete(listener)
  }

  /** Read a key's preview unless it is read or being read. */
  request = (key: string): void => {
    const id = key.toUpperCase()
    const kind = this.getState(id).kind
    if (kind === 'loading' || kind === 'ready') return
    this._set(id, LOADING)
    this._read(id).then(
      (preview) => this._set(id, { kind: 'ready', preview }),
      () => this._set(id, FAILED),
    )
  }

  private _set(key: string, next: TicketPreviewState): void {
    this._states.set(key, next)
    for (const listener of this._listeners) listener()
  }
}

const stores = new Map<string, TicketPreviewStore>()

/** The store of one scope (`group:<id>`, `project:<id>`), made on first use and kept for the session. */
export function ticketPreviewStoreFor(
  scope: string,
  read: (key: string) => Promise<TicketPreview>,
): TicketPreviewStore {
  const kept = stores.get(scope)
  if (kept) return kept
  const store = new TicketPreviewStore(read)
  stores.set(scope, store)
  return store
}
