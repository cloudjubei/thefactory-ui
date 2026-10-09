import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatDraftStore } from './chatDraftStore'
import { chatDraftStorageKey, serializeChatDraft } from './chatDraft'
import { CHAT_DRAFT_MAX_AGE_MS, EMPTY_CHAT_DRAFT } from './chatDraftConstants'
import type { SyncKVStorage } from '../hooks/useStorageBackedState'
import type { ChatDraft } from './chatDraftTypes'

const NOW = 1_800_000_000_000
const KEY = '/projects/p1'

class MemoryStorage implements SyncKVStorage {
  readonly values = new Map<string, string>()
  sets = 0
  get(key: string): string | null {
    return this.values.get(key) ?? null
  }
  set(key: string, value: string): void {
    this.sets += 1
    this.values.set(key, value)
  }
  remove(key: string): void {
    this.values.delete(key)
  }
}

function withText(text: string): (prev: ChatDraft) => ChatDraft {
  return (prev) => ({ ...prev, text })
}

describe('ChatDraftStore', () => {
  let storage: MemoryStorage
  let now: number

  beforeEach(() => {
    vi.useFakeTimers()
    storage = new MemoryStorage()
    now = NOW
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function store(debounceMs = 300): ChatDraftStore {
    return new ChatDraftStore({ storage, now: () => now, debounceMs })
  }

  it('reads an empty draft for a chat with nothing stored', () => {
    expect(store().get(KEY)).toEqual(EMPTY_CHAT_DRAFT)
  })

  it('restores a stored draft', () => {
    const stored: ChatDraft = { ...EMPTY_CHAT_DRAFT, text: 'saved', attachments: ['a.png'] }
    storage.set(chatDraftStorageKey(KEY), serializeChatDraft(stored, NOW)!)
    expect(store().get(KEY)).toEqual(stored)
  })

  it('drops an expired draft and its entry on load', () => {
    storage.set(
      chatDraftStorageKey(KEY),
      serializeChatDraft({ ...EMPTY_CHAT_DRAFT, text: 'old' }, NOW)!,
    )
    now = NOW + CHAT_DRAFT_MAX_AGE_MS + 1
    expect(store().get(KEY)).toEqual(EMPTY_CHAT_DRAFT)
    expect(storage.values.has(chatDraftStorageKey(KEY))).toBe(false)
  })

  it('drops an unreadable entry on load', () => {
    storage.set(chatDraftStorageKey(KEY), '{broken')
    expect(store().get(KEY)).toEqual(EMPTY_CHAT_DRAFT)
    expect(storage.values.has(chatDraftStorageKey(KEY))).toBe(false)
  })

  it('returns the same object until the draft changes', () => {
    const s = store()
    const first = s.get(KEY)
    expect(s.get(KEY)).toBe(first)
    s.update(KEY, withText('x'))
    expect(s.get(KEY)).not.toBe(first)
  })

  it('shows an update at once and writes it only after the debounce', () => {
    const s = store()
    s.update(KEY, withText('typed'))
    expect(s.get(KEY).text).toBe('typed')
    expect(storage.values.has(chatDraftStorageKey(KEY))).toBe(false)
    vi.advanceTimersByTime(299)
    expect(storage.values.has(chatDraftStorageKey(KEY))).toBe(false)
    vi.advanceTimersByTime(1)
    expect(JSON.parse(storage.get(chatDraftStorageKey(KEY))!)).toMatchObject({
      text: 'typed',
      savedAt: NOW,
    })
  })

  it('coalesces a burst of keystrokes into one write', () => {
    const s = store()
    for (const text of ['h', 'he', 'hel', 'hell', 'hello']) {
      s.update(KEY, withText(text))
      vi.advanceTimersByTime(100)
    }
    vi.advanceTimersByTime(300)
    expect(storage.sets).toBe(1)
    expect(JSON.parse(storage.get(chatDraftStorageKey(KEY))!).text).toBe('hello')
  })

  it('removes the entry once the draft is emptied', () => {
    const s = store()
    s.update(KEY, withText('typed'))
    s.flush()
    s.update(KEY, () => EMPTY_CHAT_DRAFT)
    s.flush()
    expect(storage.values.has(chatDraftStorageKey(KEY))).toBe(false)
  })

  it('falls back to a blank entry on storage with no remove', () => {
    const plain: SyncKVStorage = {
      get: (key) => storage.get(key),
      set: (key, value) => storage.set(key, value),
    }
    const s = new ChatDraftStore({ storage: plain, now: () => now })
    s.update(KEY, withText('typed'))
    s.flush()
    s.update(KEY, () => EMPTY_CHAT_DRAFT)
    s.flush()
    expect(storage.get(chatDraftStorageKey(KEY))).toBe('')
    expect(new ChatDraftStore({ storage: plain, now: () => now }).get(KEY)).toEqual(
      EMPTY_CHAT_DRAFT,
    )
  })

  it('writes everything pending on flush, without waiting', () => {
    const s = store()
    s.update(KEY, withText('one'))
    s.update('/projects/p2', withText('two'))
    s.flush()
    expect(JSON.parse(storage.get(chatDraftStorageKey(KEY))!).text).toBe('one')
    expect(JSON.parse(storage.get(chatDraftStorageKey('/projects/p2'))!).text).toBe('two')
    vi.advanceTimersByTime(1000)
    expect(storage.sets).toBe(2)
  })

  it('tells only that chat’s subscribers about a change, until they unsubscribe', () => {
    const s = store()
    const mine = vi.fn()
    const other = vi.fn()
    const off = s.subscribe(KEY, mine)
    s.subscribe('/projects/p2', other)
    s.update(KEY, withText('x'))
    expect(mine).toHaveBeenCalledTimes(1)
    expect(other).not.toHaveBeenCalled()
    off()
    s.update(KEY, withText('y'))
    expect(mine).toHaveBeenCalledTimes(1)
  })

  it('skips the write and the notification when an update changes nothing', () => {
    const s = store()
    const listener = vi.fn()
    s.subscribe(KEY, listener)
    s.update(KEY, (prev) => prev)
    vi.advanceTimersByTime(1000)
    expect(listener).not.toHaveBeenCalled()
    expect(storage.sets).toBe(0)
  })

  it('keeps drafts in memory when no storage is given', () => {
    const s = new ChatDraftStore()
    s.update(KEY, withText('x'))
    s.flush()
    expect(s.get(KEY).text).toBe('x')
  })

  it('survives storage that throws', () => {
    const failing: SyncKVStorage = {
      get: () => {
        throw new Error('blocked')
      },
      set: () => {
        throw new Error('quota')
      },
    }
    const s = new ChatDraftStore({ storage: failing, now: () => now })
    expect(s.get(KEY)).toEqual(EMPTY_CHAT_DRAFT)
    s.update(KEY, withText('x'))
    expect(() => s.flush()).not.toThrow()
    expect(s.get(KEY).text).toBe('x')
  })

  it('flushes on dispose and stops the timer', () => {
    const s = store()
    s.update(KEY, withText('x'))
    s.dispose()
    expect(JSON.parse(storage.get(chatDraftStorageKey(KEY))!).text).toBe('x')
    vi.advanceTimersByTime(1000)
    expect(storage.sets).toBe(1)
  })
})
