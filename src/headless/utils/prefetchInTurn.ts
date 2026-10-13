/**
 * Read ahead the first `limit` of `ids`, one at a time and in order — ahead of
 * where the person is likely to go, without crowding the few connections a
 * host gets. A failed read moves on to the next. Returns the cancel: nothing
 * more starts after it (a read already on its way finishes).
 */
export function prefetchInTurn(
  ids: readonly string[],
  prefetch: (id: string) => Promise<void>,
  limit: number,
): () => void {
  let cancelled = false
  const queue = ids.slice(0, Math.max(0, limit))
  const next = (): void => {
    if (cancelled) return
    const id = queue.shift()
    if (id === undefined) return
    void prefetch(id).then(next, next)
  }
  next()
  return () => {
    cancelled = true
  }
}
