import { chatDraftStorageKey, parseChatDraft, serializeChatDraft } from './chatDraft'
import { CHAT_DRAFT_WRITE_DEBOUNCE_MS, EMPTY_CHAT_DRAFT } from './chatDraftConstants'
import type { SyncKVStorage } from '../hooks/useStorageBackedState'
import type { ChatDraft, ChatDraftListener, ChatDraftStoreOptions } from './chatDraftTypes'

/**
 * Every chat's unsent draft, keyed by chat context key. Reads are served from
 * memory (loaded from storage the first time a chat asks, dropping a stale or
 * unreadable entry); writes show at once and reach storage debounced, so typing
 * never writes per keystroke. {@link flush} writes what is still waiting — the
 * host calls it as the app is hidden, so a crash or a closed tab keeps the text.
 */
export class ChatDraftStore {
  private readonly _storage: SyncKVStorage | undefined
  private readonly _now: () => number
  private readonly _debounceMs: number
  private readonly _drafts = new Map<string, ChatDraft>()
  private readonly _dirty = new Set<string>()
  private readonly _listeners = new Map<string, Set<ChatDraftListener>>()
  private _timer: ReturnType<typeof setTimeout> | null = null

  constructor(options: ChatDraftStoreOptions = {}) {
    this._storage = options.storage
    this._now = options.now ?? Date.now
    this._debounceMs = options.debounceMs ?? CHAT_DRAFT_WRITE_DEBOUNCE_MS
  }

  get(chatKey: string): ChatDraft {
    const cached = this._drafts.get(chatKey)
    if (cached) return cached
    const loaded = this._load(chatKey)
    this._drafts.set(chatKey, loaded)
    return loaded
  }

  update(chatKey: string, update: (prev: ChatDraft) => ChatDraft): void {
    const prev = this.get(chatKey)
    const next = update(prev)
    if (next === prev) return
    this._drafts.set(chatKey, next)
    this._dirty.add(chatKey)
    this._schedule()
    for (const listener of this._listeners.get(chatKey) ?? []) listener()
  }

  subscribe(chatKey: string, listener: ChatDraftListener): () => void {
    let listeners = this._listeners.get(chatKey)
    if (!listeners) {
      listeners = new Set()
      this._listeners.set(chatKey, listeners)
    }
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
      if (listeners.size === 0) this._listeners.delete(chatKey)
    }
  }

  flush(): void {
    if (this._timer) {
      clearTimeout(this._timer)
      this._timer = null
    }
    const keys = [...this._dirty]
    this._dirty.clear()
    for (const chatKey of keys) this._write(chatKey, this._drafts.get(chatKey) ?? EMPTY_CHAT_DRAFT)
  }

  dispose(): void {
    this.flush()
  }

  private _schedule(): void {
    if (!this._storage) {
      this._dirty.clear()
      return
    }
    if (this._timer) clearTimeout(this._timer)
    this._timer = setTimeout(() => {
      this._timer = null
      this.flush()
    }, this._debounceMs)
  }

  private _load(chatKey: string): ChatDraft {
    if (!this._storage) return EMPTY_CHAT_DRAFT
    const storageKey = chatDraftStorageKey(chatKey)
    let raw: string | null
    try {
      raw = this._storage.get(storageKey)
    } catch {
      return EMPTY_CHAT_DRAFT
    }
    const draft = parseChatDraft(raw, this._now())
    if (draft) return draft
    if (raw) this._remove(storageKey)
    return EMPTY_CHAT_DRAFT
  }

  private _write(chatKey: string, draft: ChatDraft): void {
    if (!this._storage) return
    const storageKey = chatDraftStorageKey(chatKey)
    const raw = serializeChatDraft(draft, this._now())
    if (raw === null) {
      this._remove(storageKey)
      return
    }
    try {
      this._storage.set(storageKey, raw)
    } catch {
      return
    }
  }

  private _remove(storageKey: string): void {
    if (!this._storage) return
    try {
      if (this._storage.remove) this._storage.remove(storageKey)
      else this._storage.set(storageKey, '')
    } catch {
      return
    }
  }
}
