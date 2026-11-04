import { extractErrorMessage } from '../api/errorMessage'
import type { ChatAttachmentFile } from '../api/chatAttachmentUploadTypes'
import {
  attachRunWalkthroughFile,
  attachRunWalkthroughLink,
  readRunWalkthrough,
  type AttachRunWalkthroughFileOptions,
} from '../api/runWalkthroughApi'
import { loomLinkProblem } from '../utils/runWalkthrough'
import { LOOM_WALKTHROUGH_TEXT } from '../utils/runWalkthroughConstants'
import type {
  RunWalkthroughItem,
  RunWalkthroughSending,
  RunWalkthroughState,
} from '../utils/runWalkthroughTypes'

const EMPTY: RunWalkthroughState = { items: undefined, sending: {}, errors: {} }

const without = <T>(map: Readonly<Record<string, T>>, key: string): Record<string, T> => {
  const { [key]: _gone, ...rest } = map
  return rest
}

type FileSender = () => Omit<AttachRunWalkthroughFileOptions, 'onProgress'>

/**
 * One run's Loom walkthrough, as its sign-off shows it: what is left to record
 * and what was attached. One attachment at a time to an item; a run with no
 * checkout to read simply has nothing to show.
 */
export class RunWalkthroughStore {
  private _state: RunWalkthroughState = EMPTY
  private _reads = 0
  private readonly _listeners = new Set<() => void>()
  private readonly _runId: string
  private readonly _fileSender: FileSender

  constructor(runId: string, fileSender: FileSender) {
    this._runId = runId
    this._fileSender = fileSender
  }

  subscribe = (listener: () => void): (() => void) => {
    this._listeners.add(listener)
    return () => this._listeners.delete(listener)
  }

  getState = (): RunWalkthroughState => this._state

  private _set(patch: Partial<RunWalkthroughState>): void {
    this._state = { ...this._state, ...patch }
    for (const listener of this._listeners) listener()
  }

  refresh = async (): Promise<void> => {
    const read = ++this._reads
    try {
      const items = await readRunWalkthrough(this._runId)
      if (read === this._reads) this._set({ items })
    } catch {
      return
    }
  }

  private _begin(itemId: string, sending: RunWalkthroughSending): void {
    this._reads++
    this._set({
      sending: { ...this._state.sending, [itemId]: sending },
      errors: without(this._state.errors, itemId),
    })
  }

  private _filed(item: RunWalkthroughItem): void {
    this._reads++
    this._set({
      items: this._state.items?.map((held) => (held.id === item.id ? item : held)),
      sending: without(this._state.sending, item.id),
    })
  }

  private _failed(itemId: string, reason: string): void {
    this._set({
      sending: without(this._state.sending, itemId),
      errors: { ...this._state.errors, [itemId]: reason },
    })
  }

  attachLink = async (itemId: string, url: string): Promise<boolean> => {
    const link = url.trim()
    if (!link || this._state.sending[itemId]) return false
    const problem = loomLinkProblem(link)
    if (problem) {
      this._failed(itemId, problem)
      return false
    }
    this._begin(itemId, { kind: 'link' })
    try {
      this._filed(await attachRunWalkthroughLink(this._runId, itemId, link))
      return true
    } catch (err) {
      this._failed(itemId, extractErrorMessage(err, LOOM_WALKTHROUGH_TEXT.linkFailed))
      return false
    }
  }

  attachFile = async (itemId: string, file: ChatAttachmentFile): Promise<boolean> => {
    if (this._state.sending[itemId]) return false
    this._begin(itemId, { kind: 'file' })
    const onProgress = (sentBytes: number, totalBytes: number | undefined) => {
      if (!this._state.sending[itemId]) return
      this._set({
        sending: {
          ...this._state.sending,
          [itemId]: {
            kind: 'file',
            sentBytes,
            ...(totalBytes !== undefined ? { totalBytes } : {}),
          },
        },
      })
    }
    try {
      this._filed(
        await attachRunWalkthroughFile(this._runId, itemId, file, {
          ...this._fileSender(),
          onProgress,
        }),
      )
      return true
    } catch (err) {
      this._failed(itemId, extractErrorMessage(err, LOOM_WALKTHROUGH_TEXT.fileFailed))
      return false
    }
  }
}
