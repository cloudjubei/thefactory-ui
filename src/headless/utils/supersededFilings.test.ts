import { describe, expect, it } from 'vitest'

import {
  filingSupersededBy,
  isSupersededFiling,
  partitionFilings,
  supersededFilingsHeading,
  supersededFilingsSummary,
} from './supersededFilings'
import { SUPERSEDED_FILINGS_LABEL } from './supersededFilingsConstants'

const item = (id: string, createdAt: number, kind = 'report', attemptId?: string) => ({
  ref: {
    id,
    kind,
    createdAt,
    ...(attemptId ? { supersededBy: { attemptId } } : {}),
  },
})

describe('filingSupersededBy', () => {
  it('reads the attempt that replaced the filing', () => {
    expect(filingSupersededBy({ supersededBy: { attemptId: ' attempt-2 ' } })).toEqual({
      attemptId: 'attempt-2',
    })
  })

  it('treats a missing or blank mark as current', () => {
    expect(filingSupersededBy({})).toBeUndefined()
    expect(filingSupersededBy({ supersededBy: { attemptId: '  ' } })).toBeUndefined()
    expect(filingSupersededBy({ supersededBy: 'attempt-2' })).toBeUndefined()
    expect(isSupersededFiling({})).toBe(false)
  })
})

describe('partitionFilings', () => {
  it('keeps an unmarked filing current, however old', () => {
    const older = item('old', 1)
    const newer = item('new', 2)
    expect(partitionFilings([newer, older])).toEqual({ current: [newer, older], superseded: [] })
  })

  it('puts a filing a fresh retry replaced after the current ones, newest first', () => {
    const current = item('now', 3)
    const older = item('old', 1, 'screenshot', 'attempt-2')
    const later = item('later', 2, 'report', 'attempt-2')
    const split = partitionFilings([older, current, later])
    expect(split.current.map((t) => t.ref.id)).toEqual(['now'])
    expect(split.superseded.map((t) => t.ref.id)).toEqual(['later', 'old'])
  })
})

describe('supersededFilingsSummary', () => {
  it('counts each kind', () => {
    const filings = [item('a', 2, 'report', 'attempt-2'), item('b', 1, 'screenshot', 'attempt-2')]
    expect(supersededFilingsSummary(filings)).toBe('1 report · 1 screenshot')
    expect(supersededFilingsHeading(filings)).toBe(
      `${SUPERSEDED_FILINGS_LABEL} · 1 report · 1 screenshot`,
    )
  })
})
