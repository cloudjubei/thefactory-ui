import { describe, expect, it, vi } from 'vitest'

import type { ResolvedReviewEvidence } from '../api/generated'
import type { EvidenceLink } from '../utils/evidenceReferenceTypes'
import { EvidenceReferenceStore, evidenceReferenceKey } from './evidenceReferenceStore'

const LINK: EvidenceLink = { kind: 'evidence', projectId: 'p', evidenceId: 'e1' }
const AT: EvidenceLink = { ...LINK, at: 90 }

const item = (expiresAt = '2999-01-01T00:00:00.000Z'): ResolvedReviewEvidence => ({
  projectId: 'p',
  evidenceId: 'e1',
  reference: '&p/evidence/e1',
  kind: 'screenshot',
  title: 'Shot',
  media: { kind: 'image', mediaType: 'image/png', url: '/m', expiresAt },
  runId: 'r',
  createdAt: 1,
})

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (err: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const options = (now = () => 0) => ({ capacity: 2, renewBeforeMs: 1000, now })

describe('evidenceReferenceKey', () => {
  it('keys an item by its project, id and moment', () => {
    expect(evidenceReferenceKey(LINK)).toBe('p|e1|')
    expect(evidenceReferenceKey(AT)).toBe('p|e1|90')
  })
})

describe('EvidenceReferenceStore', () => {
  it('reads an item once however many ask, telling each listener', async () => {
    const read = deferred<ResolvedReviewEvidence | undefined>()
    const load = vi.fn(() => read.promise)
    const store = new EvidenceReferenceStore(load, options())
    const heard = vi.fn()
    const off = store.listen(LINK, heard)
    expect(store.snapshot(LINK)).toEqual({ status: 'loading' })
    const first = store.read(LINK)
    const second = store.read(LINK)
    expect(load).toHaveBeenCalledTimes(1)
    read.resolve(item())
    await Promise.all([first, second])
    expect(store.snapshot(LINK)).toEqual({ status: 'ready', item: item() })
    expect(heard).toHaveBeenCalledTimes(1)
    await store.read(LINK)
    expect(load).toHaveBeenCalledTimes(1)
    off()
  })

  it('keeps an item that is gone as gone, never reading it again', async () => {
    const load = vi.fn(async () => undefined)
    const store = new EvidenceReferenceStore(load, options())
    await store.read(LINK)
    await store.read(LINK)
    expect(store.snapshot(LINK)).toEqual({ status: 'gone' })
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('says a failed read failed, and reads again at the next ask', async () => {
    const load = vi
      .fn<(link: EvidenceLink) => Promise<ResolvedReviewEvidence | undefined>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(item())
    const store = new EvidenceReferenceStore(load, options())
    await store.read(LINK)
    expect(store.snapshot(LINK)).toEqual({ status: 'failed' })
    await store.read(LINK)
    expect(store.snapshot(LINK)).toEqual({ status: 'ready', item: item() })
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('reads a held item again once its media grant is about to run out, showing it meanwhile', async () => {
    let now = Date.parse('2026-01-01T00:00:00.000Z')
    const soon = new Date(now + 5000).toISOString()
    const read = deferred<ResolvedReviewEvidence | undefined>()
    const load = vi
      .fn<(link: EvidenceLink) => Promise<ResolvedReviewEvidence | undefined>>()
      .mockResolvedValueOnce(item(soon))
      .mockReturnValueOnce(read.promise)
    const store = new EvidenceReferenceStore(
      load,
      options(() => now),
    )
    await store.read(LINK)
    await store.read(LINK)
    expect(load).toHaveBeenCalledTimes(1)
    now += 4500
    const again = store.read(LINK)
    expect(store.snapshot(LINK)).toEqual({ status: 'ready', item: item(soon) })
    read.resolve(item())
    await again
    expect(store.snapshot(LINK)).toEqual({ status: 'ready', item: item() })
  })

  it('keeps showing a held item when reading it afresh fails', async () => {
    const now = Date.parse('2026-01-01T00:00:00.000Z')
    const load = vi
      .fn<(link: EvidenceLink) => Promise<ResolvedReviewEvidence | undefined>>()
      .mockResolvedValueOnce(item(new Date(now).toISOString()))
      .mockRejectedValueOnce(new Error('offline'))
    const store = new EvidenceReferenceStore(
      load,
      options(() => now),
    )
    await store.read(LINK)
    await store.read(LINK)
    expect(store.snapshot(LINK)).toMatchObject({ status: 'ready' })
  })

  it('holds an item without media, or with an unreadable expiry, for good', async () => {
    const bare = { ...item(), media: undefined }
    const odd = item('whenever')
    const load = vi
      .fn<(link: EvidenceLink) => Promise<ResolvedReviewEvidence | undefined>>()
      .mockResolvedValueOnce(bare)
      .mockResolvedValueOnce(odd)
    const store = new EvidenceReferenceStore(
      load,
      options(() => Number.MAX_SAFE_INTEGER),
    )
    await store.read(LINK)
    await store.read(LINK)
    await store.read(AT)
    await store.read(AT)
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('keys a moment apart from its item, and forgets the oldest past its capacity', async () => {
    const load = vi.fn(async () => item())
    const store = new EvidenceReferenceStore(load, options())
    await store.read(LINK)
    await store.read(AT)
    await store.read({ ...LINK, evidenceId: 'e2' })
    expect(store.snapshot(LINK)).toEqual({ status: 'loading' })
    expect(store.snapshot(AT)).toMatchObject({ status: 'ready' })
    expect(load).toHaveBeenCalledTimes(3)
  })

  it('stops telling a listener once it leaves, and forgets everything when cleared', async () => {
    const load = vi.fn(async () => item())
    const store = new EvidenceReferenceStore(load, options())
    const heard = vi.fn()
    const kept = vi.fn()
    store.listen(LINK, kept)
    store.listen(LINK, heard)()
    await store.read(LINK)
    expect(heard).not.toHaveBeenCalled()
    expect(kept).toHaveBeenCalledTimes(1)
    store.clear()
    expect(store.snapshot(LINK)).toEqual({ status: 'loading' })
  })
})
