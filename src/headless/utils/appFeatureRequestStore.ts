import type {
  AppFeatureRequestAsk,
  AppFeatureRequestDraft,
  AppFeatureRequestListener,
  AppFeatureRequestReply,
} from './appFeatureRequestTypes'

type Entry = Omit<AppFeatureRequestAsk, 'waiting'> & {
  resolve: (reply: AppFeatureRequestReply) => void
}

/**
 * The `feature.request` asks of one mounted app, first come first shown. An ask settles only when
 * the person answers it — Send or Cancel — or the app goes away ({@link declineAll}); it never
 * expires. Every change makes a new {@link current} snapshot, so React reads it with
 * `useSyncExternalStore`.
 */
export class AppFeatureRequestStore {
  private _queue: Entry[] = []
  private readonly _listeners = new Set<AppFeatureRequestListener>()
  private _nextId = 1
  private _snapshot: AppFeatureRequestAsk | null = null

  enqueue(draft: AppFeatureRequestDraft): Promise<AppFeatureRequestReply> {
    return new Promise((resolve) => {
      this._queue.push({ id: this._nextId++, draft, busy: false, error: null, resolve })
      this._emit()
    })
  }

  current(): AppFeatureRequestAsk | null {
    return this._snapshot
  }

  subscribe(listener: AppFeatureRequestListener): () => void {
    this._listeners.add(listener)
    return () => {
      this._listeners.delete(listener)
    }
  }

  edit(id: number, draft: AppFeatureRequestDraft): void {
    this._update(id, (entry) => (entry.busy ? null : { draft }))
  }

  setBusy(id: number, busy: boolean): void {
    this._update(id, () => (busy ? { busy, error: null } : { busy }))
  }

  fail(id: number, error: string): void {
    this._update(id, () => ({ busy: false, error }))
  }

  settle(id: number, reply: AppFeatureRequestReply): void {
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
          busy: head.busy,
          error: head.error,
          waiting: this._queue.length - 1,
        }
      : null
    for (const listener of this._listeners) listener()
  }
}
