import { describe, expect, it } from 'vitest'
import type { ProcessLedgerEntry } from 'thefactory-tools/types'

import {
  attemptUiImpactNote,
  reviewUiImpactNote,
  screensDecisionNote,
  screensDecisionUiImpact,
} from './uiImpactView'

let n = 0
const entry = (over: Partial<ProcessLedgerEntry> = {}): ProcessLedgerEntry => {
  n += 1
  return {
    id: `e${n}`,
    stepId: 'implement',
    iteration: 1,
    status: 'done',
    startedAt: n,
    endedAt: n,
    ...over,
  }
}
const judged = (visible: boolean, by: 'developer' | 'verifier' | 'fixer' | 'developer-verifier') =>
  entry({ uiImpact: { visible, reason: 'Only the parser.', reportedAt: 1, by } })
const review = (visible: boolean) =>
  entry({
    stepId: 'code-review',
    review: { verdict: 'approved', uiImpact: { visible, reason: 'The empty state text.' } },
  })

describe('attemptUiImpactNote', () => {
  it.each([
    [false, 'developer', 'hidden', 'Nothing on screen', 'Judged by the developer'],
    [true, 'verifier', 'shows', 'Shows on screen', 'Judged by the verifier'],
    [true, 'fixer', 'shows', 'Shows on screen', 'Judged by the fixer'],
    [false, 'developer-verifier', 'hidden', 'Nothing on screen', 'Judged by the developer'],
  ] as const)(
    'says what was judged, who judged it and why (%s, %s)',
    (visible, by, tone, label, who) => {
      expect(attemptUiImpactNote(judged(visible, by))).toEqual({
        tone,
        label,
        by: who,
        reason: 'Only the parser.',
      })
    },
  )

  it('says nothing of an attempt whose agent judged nothing', () => {
    expect(attemptUiImpactNote(entry())).toBeUndefined()
  })
})

describe('reviewUiImpactNote', () => {
  it('says the code review disagrees with a judgement before it the other way', () => {
    const r = review(true)
    expect(reviewUiImpactNote(r, [judged(false, 'developer'), r])).toEqual({
      tone: 'shows',
      label: 'Code review disagrees: shows on screen',
      reason: 'The empty state text.',
    })
  })

  it('reads only the newest judgement before it', () => {
    const r = review(true)
    expect(
      reviewUiImpactNote(r, [judged(false, 'developer'), judged(true, 'developer'), r])?.label,
    ).toBe('Code review: shows on screen')
  })

  it('names no disagreement when nobody judged it before', () => {
    const r = review(false)
    expect(reviewUiImpactNote(r, [entry(), r])?.label).toBe('Code review: nothing on screen')
  })

  it('reads no judgement filed after the review', () => {
    const r = review(false)
    expect(reviewUiImpactNote(r, [r, judged(true, 'developer')])?.label).toBe(
      'Code review: nothing on screen',
    )
  })

  it('says nothing of a review that filed no view', () => {
    const r = entry({ stepId: 'code-review', review: { verdict: 'approved' } })
    expect(reviewUiImpactNote(r, [r])).toBeUndefined()
    expect(reviewUiImpactNote(entry(), [])).toBeUndefined()
  })
})

describe('screensDecisionNote', () => {
  it.each([
    ['required', 'needed', 'Screens needed'],
    ['not-required', 'not-needed', 'No screens needed'],
    ['unknown', 'unknown', 'Screens unknown'],
  ] as const)('says %s with its reason', (need, tone, label) => {
    expect(
      screensDecisionNote({
        need,
        basis: 'files',
        reason: 'None of its files changes what users see.',
      }),
    ).toEqual({
      tone,
      label,
      reason: 'None of its files changes what users see.',
      disputedUiPaths: [],
    })
  })

  it('keeps every file a not-visible judgement left unshown', () => {
    expect(
      screensDecisionNote({
        need: 'not-required',
        basis: 'judgement',
        reason: 'The developer judged …',
        disputedUiPaths: ['src/A.tsx', 'src/b.css'],
      })?.disputedUiPaths,
    ).toEqual(['src/A.tsx', 'src/b.css'])
  })

  it('says nothing when nothing decided it', () => {
    expect(screensDecisionNote(undefined)).toBeUndefined()
  })
})

describe('screensDecisionUiImpact', () => {
  it.each([
    ['judgement', 'not-required', { visible: false, reason: 'r' }],
    ['review', 'required', { visible: true, reason: 'r' }],
  ] as const)(
    'reads a decision the %s made as how the change was judged',
    (basis, need, stance) => {
      expect(screensDecisionUiImpact({ need, basis, reason: 'r' })).toEqual(stance)
    },
  )

  it.each(['plan', 'files', 'work', 'nothing'] as const)(
    'reads no judgement from a decision its %s made',
    (basis) => {
      expect(screensDecisionUiImpact({ need: 'required', basis, reason: 'r' })).toBeUndefined()
    },
  )

  it('reads nothing when nothing decided it', () => {
    expect(screensDecisionUiImpact(undefined)).toBeUndefined()
  })
})
