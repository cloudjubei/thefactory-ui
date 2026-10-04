/**
 * One request per key at a time: a caller asking for a key already being
 * fetched shares that fetch's answer — or its failure — instead of starting
 * another. Nothing is kept once it settles, so the next ask fetches afresh.
 */
export class InflightRequests<T> {
  private readonly _byKey = new Map<string, Promise<T>>()

  run(key: string, start: () => Promise<T>): Promise<T> {
    const existing = this._byKey.get(key)
    if (existing) return existing
    const request = start().finally(() => {
      if (this._byKey.get(key) === request) this._byKey.delete(key)
    })
    this._byKey.set(key, request)
    return request
  }
}
