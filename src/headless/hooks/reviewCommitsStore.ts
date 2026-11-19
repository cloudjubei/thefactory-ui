import type { ReviewCommits, ReviewCommitsState } from '../utils/reviewCommitsTypes'

const IDLE: ReviewCommitsState = { kind: 'idle' }
const LOADING: ReviewCommitsState = { kind: 'loading' }
const FAILED: ReviewCommitsState = { kind: 'failed' }

/**
 * Each ticket's commits since its review's last round, by key, for one group:
 * read on the first ask and kept, read again when its review changes, the
 * last answer still showing meanwhile. A failed read says so and is tried
 * again on the next ask. Nothing waits on it: views show it once it is read.
 */
export class ReviewCommitsStore {
  private readonly _states = new Map<string, ReviewCommitsState>()
  private readonly _reading = new Set<string>()
  private readonly _listeners = new Set<() => void>()
  private _version = 0
  private readonly _read: (ticketKey: string) => Promise<ReviewCommits>

  constructor(read: (ticketKey: string) => Promise<ReviewCommits>) {
    this._read = read
  }

  getState = (ticketKey: string): ReviewCommitsState =>
    this._states.get(ticketKey.toUpperCase()) ?? IDLE

  /** Bumped on every change, for views that read many tickets at once. */
  getVersion = (): number => this._version

  subscribe = (listener: () => void): (() => void) => {
    this._listeners.add(listener)
    return () => this._listeners.delete(listener)
  }

  /** Read a ticket's commits unless they are read or being read. */
  request = (ticketKey: string): void => {
    const kind = this.getState(ticketKey).kind
    if (kind === 'ready' || kind === 'loading') return
    this._readNow(ticketKey.toUpperCase(), LOADING)
  }

  /** Read again a ticket asked for before, keeping what it shows until the new answer. */
  refresh = (ticketKey: string): void => {
    const key = ticketKey.toUpperCase()
    const state = this._states.get(key)
    if (!state || this._reading.has(key)) return
    this._readNow(key, state.kind === 'ready' ? state : LOADING)
  }

  /** Read again every ticket asked for before. */
  refreshAll = (): void => {
    for (const key of this._states.keys()) this.refresh(key)
  }

  private _readNow(key: string, meanwhile: ReviewCommitsState): void {
    this._reading.add(key)
    this._set(key, meanwhile)
    this._read(key)
      .then(
        (commits) => this._set(key, { kind: 'ready', commits }),
        () => this._set(key, FAILED),
      )
      .finally(() => this._reading.delete(key))
  }

  private _set(key: string, next: ReviewCommitsState): void {
    this._states.set(key, next)
    this._version += 1
    for (const listener of this._listeners) listener()
  }
}
