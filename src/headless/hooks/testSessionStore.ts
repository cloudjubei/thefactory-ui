import { errorStatus, extractErrorMessage } from '../api/errorMessage'
import { readTestSession, startTestSession, stopTestSession } from '../api/testSessionApi'
import type { LaunchAgentPickMetadata } from '../utils/launchAgentPickTypes'
import { TEST_SESSION_COPY } from '../utils/testSessionViewConstants'
import type {
  TestSession,
  TestSessionPending,
  TestSessionState,
  TestSessionView,
} from '../utils/testSessionViewTypes'

const EMPTY: TestSessionState = { view: undefined }

type Send = (runId: string, agent: LaunchAgentPickMetadata) => Promise<TestSessionView>

const ASKS: Record<TestSessionPending, { send: Send; failed: string }> = {
  start: { send: startTestSession, failed: TEST_SESSION_COPY.startFailed },
  stop: { send: (runId) => stopTestSession(runId), failed: TEST_SESSION_COPY.stopFailed },
}

/**
 * One run's "Test with me" session: what was read, and the person's start or stop shown at once
 * — rolled back to what it was, with why, when the backend refuses it. While one ask is unanswered
 * another press does nothing.
 */
export class TestSessionStore {
  private _state: TestSessionState = EMPTY
  private _reads = 0
  private readonly _listeners = new Set<() => void>()
  private readonly _runId: string

  constructor(runId: string) {
    this._runId = runId
  }

  subscribe = (listener: () => void): (() => void) => {
    this._listeners.add(listener)
    return () => this._listeners.delete(listener)
  }

  getState = (): TestSessionState => this._state

  private _set(next: TestSessionState): void {
    this._state = next
    for (const listener of this._listeners) listener()
  }

  refresh = async (): Promise<void> => {
    const read = ++this._reads
    try {
      const view = await readTestSession(this._runId)
      if (read === this._reads) this._set({ ...this._state, view })
    } catch (err) {
      if (read === this._reads && errorStatus(err) === 404) this._set({ view: undefined })
    }
  }

  /** Start the session and its helper, on the agent picked; the usual one when none is. */
  start = (agent: LaunchAgentPickMetadata = {}): Promise<boolean> => this._ask('start', agent)

  stop = (): Promise<boolean> => this._ask('stop', {})

  /** A session pushed by the backend: taken when it is this run's. */
  onUpdate = (data: unknown): void => {
    const pushed = data as { key?: string; session?: TestSession } | null
    const { view } = this._state
    if (!view || !pushed?.session || pushed.key !== view.key) return
    this._reads++
    this._set({ ...this._state, view: { ...view, session: pushed.session } })
  }

  private async _ask(kind: TestSessionPending, agent: LaunchAgentPickMetadata): Promise<boolean> {
    if (this._state.pending) return false
    const before = this._state.view
    this._reads++
    this._set({ view: before, pending: kind })
    try {
      const view = await ASKS[kind].send(this._runId, agent)
      this._reads++
      this._set({ view })
      return true
    } catch (err) {
      this._set({ view: before, error: extractErrorMessage(err, ASKS[kind].failed) })
      return false
    }
  }
}
