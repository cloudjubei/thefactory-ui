import { saveChatFileToProject } from '../api/chatFileSaveApi'
import { chatFileSaveIsRepeat, chatFileSaveKey } from '../utils/chatFileSave'
import type {
  ChatFileSaveCall,
  ChatFileSaveOutcome,
  ChatFileSaveState,
} from '../utils/chatFileSaveTypes'

const IDLE: ChatFileSaveState = { status: 'idle' }

/**
 * How each shown file's save stands, shared by every place the file shows — its
 * chip and its full-size view — so a press in one reads in the other, and a
 * press again while one is under way does nothing.
 */
export class ChatFileSaveStore {
  private readonly _states = new Map<string, ChatFileSaveState>()
  private readonly _listeners = new Set<() => void>()

  stateOf(projectId: string, source: string): ChatFileSaveState {
    return this._states.get(chatFileSaveKey(projectId, source)) ?? IDLE
  }

  subscribe(listener: () => void): () => void {
    this._listeners.add(listener)
    return () => {
      this._listeners.delete(listener)
    }
  }

  async save(input: {
    projectId: string
    source: string
    destination: string
    overwrite?: boolean
    call?: ChatFileSaveCall
  }): Promise<ChatFileSaveOutcome | undefined> {
    const { projectId, source, destination, overwrite = false } = input
    const key = chatFileSaveKey(projectId, source)
    if (chatFileSaveIsRepeat(this.stateOf(projectId, source), destination, overwrite)) {
      return undefined
    }
    this._set(key, { status: 'saving', destination })
    const call = input.call ?? saveChatFileToProject
    const outcome = await call(projectId, {
      source,
      destination,
      ...(overwrite ? { overwrite: true } : {}),
    }).catch(
      (err: unknown): ChatFileSaveOutcome => ({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        exists: false,
      }),
    )
    this._set(
      key,
      outcome.ok
        ? { status: 'saved', destination: outcome.path }
        : { status: 'failed', destination, error: outcome.error, exists: outcome.exists },
    )
    return outcome
  }

  /** Put a failure away once its dialog is closed, so the file offers Save again. */
  dismiss(projectId: string, source: string): void {
    const key = chatFileSaveKey(projectId, source)
    if (this._states.get(key)?.status === 'failed') this._set(key, IDLE)
  }

  private _set(key: string, state: ChatFileSaveState): void {
    this._states.set(key, state)
    for (const listener of this._listeners) listener()
  }
}

export const chatFileSaveStore = new ChatFileSaveStore()
