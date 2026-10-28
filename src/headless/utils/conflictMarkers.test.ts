import { describe, expect, it } from 'vitest'
import {
  hasConflictMarkers,
  parseConflictSegments,
  resolveConflict,
  serializeSegments,
  type Segment,
  type SegmentConflict,
} from './conflictMarkers'

const CONFLICT = `before
<<<<<<< HEAD
our line
=======
their line
>>>>>>> feature
after
`

describe('hasConflictMarkers', () => {
  it('detects each of the three markers', () => {
    expect(hasConflictMarkers('<<<<<<< HEAD')).toBe(true)
    expect(hasConflictMarkers('>>>>>>> branch')).toBe(true)
    expect(hasConflictMarkers('=======')).toBe(true)
  })

  it('returns false for clean content', () => {
    expect(hasConflictMarkers('just some normal text\nwith lines')).toBe(false)
    expect(hasConflictMarkers('')).toBe(false)
  })
})

describe('parseConflictSegments', () => {
  it('splits a single conflict into text / conflict / text', () => {
    const segs = parseConflictSegments(CONFLICT)
    expect(segs.map((s) => s.type)).toEqual(['text', 'conflict', 'text'])
    const conflict = segs[1] as SegmentConflict
    expect(conflict.oursLabel).toBe('HEAD')
    expect(conflict.theirsLabel).toBe('feature')
    expect(conflict.ours).toBe('our line')
    expect(conflict.theirs).toBe('their line')
    expect((segs[0] as Segment & { text: string }).text).toBe('before\n')
    expect((segs[2] as Segment & { text: string }).text).toBe('after\n')
  })

  it('returns a single text segment for clean content', () => {
    const segs = parseConflictSegments('no conflicts here')
    expect(segs).toEqual([{ type: 'text', text: 'no conflicts here' }])
  })

  it('normalises CRLF to LF', () => {
    const segs = parseConflictSegments(CONFLICT.replace(/\n/g, '\r\n'))
    const conflict = segs[1] as SegmentConflict
    expect(conflict.ours).toBe('our line')
    expect(conflict.theirs).toBe('their line')
  })

  it('parses multiple conflict hunks in one file', () => {
    const raw = `<<<<<<< HEAD\na\n=======\nb\n>>>>>>> x\nmid\n<<<<<<< HEAD\nc\n=======\nd\n>>>>>>> x\n`
    const segs = parseConflictSegments(raw)
    expect(segs.filter((s) => s.type === 'conflict')).toHaveLength(2)
  })

  it('handles empty sides', () => {
    const raw = `<<<<<<< HEAD\n=======\ntheirs\n>>>>>>> x\n`
    const conflict = parseConflictSegments(raw)[0] as SegmentConflict
    expect(conflict.ours).toBe('')
    expect(conflict.theirs).toBe('theirs')
  })

  it('emits an unterminated conflict block verbatim instead of throwing', () => {
    const raw = 'ok\n<<<<<<< HEAD\ndangling'
    const segs = parseConflictSegments(raw)
    expect(segs.map((s) => s.type)).toEqual(['text', 'text'])
    expect((segs[1] as Segment & { text: string }).text).toBe('<<<<<<< HEAD\ndangling')
  })
})

describe('serializeSegments', () => {
  it('round-trips an unresolved conflict losslessly', () => {
    const segs = parseConflictSegments(CONFLICT)
    expect(serializeSegments(segs)).toBe(CONFLICT)
  })

  it('emits a resolved (text-only) file with no markers', () => {
    const resolved: Segment[] = [{ type: 'text', text: 'final content\n' }]
    const out = serializeSegments(resolved)
    expect(out).toBe('final content\n')
    expect(hasConflictMarkers(out)).toBe(false)
  })
})

describe('resolveConflict', () => {
  const seg: SegmentConflict = {
    type: 'conflict',
    oursLabel: 'HEAD',
    theirsLabel: 'feature',
    ours: 'OURS',
    theirs: 'THEIRS',
  }

  it('picks a single side', () => {
    expect(resolveConflict(seg, 'ours')).toBe('OURS')
    expect(resolveConflict(seg, 'theirs')).toBe('THEIRS')
  })

  it('joins both sides honouring order', () => {
    expect(resolveConflict(seg, 'both', 'ours-then-theirs')).toBe('OURS\nTHEIRS')
    expect(resolveConflict(seg, 'both', 'theirs-then-ours')).toBe('THEIRS\nOURS')
  })

  it('does not insert a blank line when one side is empty', () => {
    expect(resolveConflict({ ...seg, theirs: '' }, 'both')).toBe('OURS')
    expect(resolveConflict({ ...seg, ours: '' }, 'both')).toBe('THEIRS')
  })
})
