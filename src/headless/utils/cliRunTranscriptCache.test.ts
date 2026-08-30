import { describe, expect, it } from 'vitest'
import { CliRunTranscriptCache } from './cliRunTranscriptCache'
import type { CliRunTranscriptEntry } from '../api/generated'

const entries = (count: number): CliRunTranscriptEntry[] =>
  Array.from({ length: count }, (_, i) => ({ at: i, kind: 'assistant', payload: undefined }))

describe('CliRunTranscriptCache', () => {
  it('recalls what a previous mount streamed', () => {
    const cache = new CliRunTranscriptCache()
    cache.set('run-1', entries(3))
    expect(cache.get('run-1')).toHaveLength(3)
  })

  it('returns nothing for a run it has never seen', () => {
    expect(new CliRunTranscriptCache().get('run-x')).toBeUndefined()
  })

  it('keeps the longer copy when a shrunken record is committed', () => {
    const cache = new CliRunTranscriptCache()
    cache.set('run-1', entries(5))
    cache.set('run-1', [])
    expect(cache.get('run-1')).toHaveLength(5)
  })

  it('takes the newer copy once it has grown', () => {
    const cache = new CliRunTranscriptCache()
    cache.set('run-1', entries(2))
    cache.set('run-1', entries(4))
    expect(cache.get('run-1')).toHaveLength(4)
  })

  it('replaces an equal-length copy so a terminal reconcile lands', () => {
    const cache = new CliRunTranscriptCache()
    const first = entries(2)
    const second = entries(2)
    cache.set('run-1', first)
    cache.set('run-1', second)
    expect(cache.get('run-1')).toBe(second)
  })

  it('evicts the oldest run past the bound', () => {
    const cache = new CliRunTranscriptCache(2)
    cache.set('a', entries(1))
    cache.set('b', entries(1))
    cache.set('c', entries(1))
    expect(cache.get('a')).toBeUndefined()
    expect(cache.size).toBe(2)
  })

  it('treats a re-set as a recency touch so the touched run survives eviction', () => {
    const cache = new CliRunTranscriptCache(2)
    cache.set('a', entries(1))
    cache.set('b', entries(1))
    cache.set('a', entries(2))
    cache.set('c', entries(1))
    expect(cache.get('a')).toHaveLength(2)
    expect(cache.get('b')).toBeUndefined()
  })

  it('clears everything', () => {
    const cache = new CliRunTranscriptCache()
    cache.set('a', entries(1))
    cache.clear()
    expect(cache.size).toBe(0)
  })
})
