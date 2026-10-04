/**
 * A string-keyed cache that holds at most `capacity` entries, dropping the one
 * least recently read or written when a new one would exceed it. Pure: no
 * React, no I/O — a module that wants a cache outliving its views owns one.
 */
export class BoundedCache<V> {
  private readonly _entries = new Map<string, V>()
  private readonly _capacity: number

  constructor(capacity: number) {
    this._capacity = Math.max(1, Math.floor(capacity))
  }

  get size(): number {
    return this._entries.size
  }

  /** The entry for `key`, marked as just used; `undefined` when there is none. */
  get(key: string): V | undefined {
    if (!this._entries.has(key)) return undefined
    const value = this._entries.get(key) as V
    this._entries.delete(key)
    this._entries.set(key, value)
    return value
  }

  /** Every entry, least recently used first, without marking any as used. */
  values(): V[] {
    return [...this._entries.values()]
  }

  set(key: string, value: V): void {
    this._entries.delete(key)
    this._entries.set(key, value)
    while (this._entries.size > this._capacity) {
      const oldest = this._entries.keys().next().value as string
      this._entries.delete(oldest)
    }
  }

  delete(key: string): void {
    this._entries.delete(key)
  }

  clear(): void {
    this._entries.clear()
  }
}
