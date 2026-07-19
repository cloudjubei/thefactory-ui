import { describe, it, expect } from 'vitest'
import { toolResultResourceLinks } from './toolResultLinks'

describe('toolResultResourceLinks', () => {
  it('extracts a link + label per record from a queryProjectData result', () => {
    const result = {
      total: 2,
      records: [
        { key: 'r1', content: { title: 'Run one' }, resourceLink: 'overseer://projects/p/app?run=r1' },
        { key: 'r2', content: { name: 'Run two' }, resourceLink: 'overseer://projects/p/app?run=r2' },
      ],
    }
    expect(toolResultResourceLinks(result)).toEqual([
      { link: 'overseer://projects/p/app?run=r1', label: 'Run one' },
      { link: 'overseer://projects/p/app?run=r2', label: 'Run two' },
    ])
  })

  it('falls back to the record key when content has no title/name', () => {
    const result = { records: [{ key: 'r9', content: {}, resourceLink: 'overseer://projects/p/app' }] }
    expect(toolResultResourceLinks(result)).toEqual([
      { link: 'overseer://projects/p/app', label: 'r9' },
    ])
  })

  it('falls back to the record type when there is no key', () => {
    const result = {
      records: [{ key: null, type: 'run', content: {}, resourceLink: 'overseer://projects/p/app' }],
    }
    expect(toolResultResourceLinks(result)).toEqual([
      { link: 'overseer://projects/p/app', label: 'run' },
    ])
  })

  it('handles a single updateProjectRecord result (record, not records)', () => {
    const result = {
      record: { key: 'h1', content: { title: 'Hypo' }, resourceLink: 'overseer://projects/p/app?x=1' },
    }
    expect(toolResultResourceLinks(result)).toEqual([
      { link: 'overseer://projects/p/app?x=1', label: 'Hypo' },
    ])
  })

  it('skips records without a resourceLink', () => {
    const result = {
      records: [
        { key: 'r1', content: {}, resourceLink: 'overseer://projects/p/app' },
        { key: 'r2', content: {} },
      ],
    }
    expect(toolResultResourceLinks(result)).toEqual([
      { link: 'overseer://projects/p/app', label: 'r1' },
    ])
  })

  it('dedupes by link, keeping the first label', () => {
    const result = {
      records: [
        { key: 'r1', content: { title: 'A' }, resourceLink: 'overseer://projects/p/app' },
        { key: 'r2', content: { title: 'B' }, resourceLink: 'overseer://projects/p/app' },
      ],
    }
    expect(toolResultResourceLinks(result)).toEqual([{ link: 'overseer://projects/p/app', label: 'A' }])
  })

  it('returns [] for shapes with no links', () => {
    expect(toolResultResourceLinks(undefined)).toEqual([])
    expect(toolResultResourceLinks('nope')).toEqual([])
    expect(toolResultResourceLinks({ error: 'boom' })).toEqual([])
    expect(toolResultResourceLinks({ records: 'not-an-array' })).toEqual([])
    expect(toolResultResourceLinks({ records: [42, null] })).toEqual([])
  })
})
