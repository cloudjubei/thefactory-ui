import { workStartEditable } from './appWorkStart'
import type {
  AppWorkStartAsk,
  AppWorkStartDraft,
  AppWorkStartListener,
  AppWorkStartProgress,
  AppWorkStartReply,
} from './appWorkStartTypes'

type Entry = Omit<AppWorkStartAsk, 'waiting'> & { resolve: (reply: AppWorkStartReply) => void }

/**
 * The `work.start` asks of one mounted app, first come first shown. An ask settles only when the
 * person answers it — Start or Cancel — or the app goes away ({@link declineAll}); it never expires.
 * Every change makes a new {@link current} snapshot, so React reads it with `useSyncExternalStore`.
 */
export class AppWorkStartStore {
  private _queue: Entry[] = []
  private readonly _listeners = new Set<AppWorkStartListener>()
  private _nextId = 1
  private _snapshot: AppWorkStartAsk | null = null

  enqueue(draft: AppWorkStartDraft): Promise<AppWorkStartReply> {
    return new Promise((resolve) => {
      this._queue.push({
        id: this._nextId++,
        draft,
        progress: {},
        busy: false,
        error: null,
        resolve,
      })
      this._emit()
    })
  }

  current(): AppWorkStartAsk | null {
    return this._snapshot
  }

  subscribe(listener: AppWorkStartListener): () => void {
    this._listeners.add(listener)
    return () => {
      this._listeners.delete(listener)
    }
  }

  edit(id: number, draft: AppWorkStartDraft): void {
    this._update(id, (entry) => (workStartEditable(entry) ? { draft } : null))
  }

  setBusy(id: number, busy: boolean): void {
    this._update(id, () => (busy ? { busy, error: null } : { busy }))
  }

  setProgress(id: number, progress: AppWorkStartProgress): void {
    this._update(id, () => ({ progress }))
  }

  fail(id: number, error: string): void {
    this._update(id, () => ({ busy: false, error }))
  }

  settle(id: number, reply: AppWorkStartReply): void {
    const head = this._queue[0]
    if (!head || head.id !== id) return
    this._queue = this._queue.slice(1)
    head.resolve(reply)
    this._emit()
  }

  declineAll(reason: string): void {
    if (this._queue.length === 0) return
    const queue = this._queue
    this._queue = []
    for (const entry of queue) entry.resolve({ status: 'declined', reason })
    this._emit()
  }

  private _update(id: number, change: (entry: Entry) => Partial<Entry> | null): void {
    const head = this._queue[0]
    if (!head || head.id !== id) return
    const patch = change(head)
    if (!patch) return
    this._queue = [{ ...head, ...patch }, ...this._queue.slice(1)]
    this._emit()
  }

  private _emit(): void {
    const head = this._queue[0]
    this._snapshot = head
      ? {
          id: head.id,
          draft: head.draft,
          progress: head.progress,
          busy: head.busy,
          error: head.error,
          waiting: this._queue.length - 1,
        }
      : null
    for (const listener of this._listeners) listener()
  }
}
