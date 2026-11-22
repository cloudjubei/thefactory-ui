import { describe, expect, it } from 'vitest'

import type { ReviewEvidenceRef } from '../api/generated'
import type { EvidenceTile } from './reviewEvidenceViewTypes'
import {
  isSameRunThroughIssueAnswer,
  runThroughIssueReviewAfter,
  runThroughIssueReviewEntry,
  runThroughIssueReviewFirstAt,
  runThroughIssueReviewKey,
  runThroughIssueReviewStep,
  runThroughIssueReviewView,
  runThroughIssueStanding,
  runThroughReportOfRun,
  withRunThroughIssueAnswer,
} from './runThroughIssueReview'
import type { RunThroughIssueAnswers } from './runThroughIssueReviewTypes'
import type { RunThroughIssueRow } from './runThroughReportTypes'

const row = (
  key: string,
  severity: RunThroughIssueRow['severity'] = 'minor',
  extra: Partial<RunThroughIssueRow> = {},
): RunThroughIssueRow => ({
  key,
  severity,
  tone: 'review',
  title: `Issue ${key}`,
  happened: `${key} happened`,
  expected: undefined,
  doing: undefined,
  view: undefined,
  atSec: undefined,
  time: undefined,
  screenshot: undefined,
  ...extra,
})

const ISSUES = [row('a', 'blocker'), row('b', 'major'), row('c'), row('d', 'nit')]

const answers = (
  given: Record<string, ['fix' | 'not-an-issue', string?]>,
): RunThroughIssueAnswers =>
  Object.fromEntries(
    Object.entries(given).map(([issueId, [answer, note]]) => [
      issueId,
      { issueId, answer, ...(note !== undefined ? { note } : {}), at: 1 },
    ]),
  )

describe('runThroughIssueStanding', () => {
  it('reads no answer as open, a fix with words as a reply, and blank words as a plain fix', () => {
    expect(runThroughIssueStanding(undefined)).toBe('open')
    expect(runThroughIssueStanding(answers({ a: ['fix'] }).a)).toBe('fix')
    expect(runThroughIssueStanding(answers({ a: ['fix', 'Say it plainly'] }).a)).toBe('reply')
    expect(runThroughIssueStanding(answers({ a: ['fix', '   '] }).a)).toBe('fix')
    expect(runThroughIssueStanding(answers({ a: ['not-an-issue', 'fine'] }).a)).toBe('not-an-issue')
  })
})

describe('withRunThroughIssueAnswer', () => {
  it('replaces an earlier answer and leaves the others', () => {
    const before = answers({ a: ['fix'], b: ['fix'] })
    const after = withRunThroughIssueAnswer(before, 'a', 'not-an-issue', undefined, 9)
    expect(after.a).toEqual({ issueId: 'a', answer: 'not-an-issue', at: 9 })
    expect(after.b).toBe(before.b)
    expect(before.a?.answer).toBe('fix')
  })

  it('keeps the words trimmed, and drops words that are only blanks', () => {
    expect(withRunThroughIssueAnswer({}, 'a', 'fix', '  Use names  ', 1).a?.note).toBe('Use names')
    expect(withRunThroughIssueAnswer({}, 'a', 'fix', '  ', 1).a).not.toHaveProperty('note')
  })
})

describe('isSameRunThroughIssueAnswer', () => {
  it('matches the same answer with the same words only', () => {
    const given = answers({ a: ['fix', 'Use names'] }).a
    expect(isSameRunThroughIssueAnswer(given, 'fix', ' Use names ')).toBe(true)
    expect(isSameRunThroughIssueAnswer(given, 'fix', undefined)).toBe(false)
    expect(isSameRunThroughIssueAnswer(given, 'not-an-issue', 'Use names')).toBe(false)
    expect(isSameRunThroughIssueAnswer(undefined, 'fix', undefined)).toBe(false)
    expect(isSameRunThroughIssueAnswer(answers({ a: ['fix'] }).a, 'fix', '')).toBe(true)
  })
})

describe('where the panel opens and moves', () => {
  it('opens on the first open issue, or on the answers when all are answered', () => {
    expect(runThroughIssueReviewFirstAt(ISSUES, {})).toBe(0)
    expect(runThroughIssueReviewFirstAt(ISSUES, answers({ a: ['fix'], b: ['fix'] }))).toBe(2)
    const all = answers({ a: ['fix'], b: ['fix'], c: ['fix'], d: ['not-an-issue'] })
    expect(runThroughIssueReviewFirstAt(ISSUES, all)).toBe('summary')
    expect(runThroughIssueReviewFirstAt([], {})).toBe('summary')
  })

  it('moves after an answer to the next open issue, round to the first, then to the answers', () => {
    expect(runThroughIssueReviewAfter(ISSUES, answers({ a: ['fix'] }), 0)).toBe(1)
    expect(runThroughIssueReviewAfter(ISSUES, answers({ a: ['fix'], b: ['fix'] }), 1)).toBe(2)
    expect(runThroughIssueReviewAfter(ISSUES, answers({ b: ['fix'], d: ['fix'] }), 3)).toBe(0)
    const all = answers({ a: ['fix'], b: ['fix'], c: ['fix'], d: ['fix'] })
    expect(runThroughIssueReviewAfter(ISSUES, all, 2)).toBe('summary')
    expect(runThroughIssueReviewAfter([row('a')], answers({ a: ['fix'] }), 0)).toBe('summary')
  })

  it('steps Back and Next one issue at a time, Next past the last onto the answers', () => {
    expect(runThroughIssueReviewStep(4, 0, 1)).toBe(1)
    expect(runThroughIssueReviewStep(4, 0, -1)).toBe(0)
    expect(runThroughIssueReviewStep(4, 3, 1)).toBe('summary')
    expect(runThroughIssueReviewStep(4, 'summary', -1)).toBe(3)
    expect(runThroughIssueReviewStep(4, 'summary', 1)).toBe('summary')
    expect(runThroughIssueReviewStep(0, 0, 1)).toBe('summary')
  })

  it('answers with 1, 2 and 3, moves with the arrows, and ignores other keys', () => {
    expect(runThroughIssueReviewKey('1')).toEqual({ kind: 'answer', choice: 'fix' })
    expect(runThroughIssueReviewKey('2')).toEqual({ kind: 'answer', choice: 'not-an-issue' })
    expect(runThroughIssueReviewKey('3')).toEqual({ kind: 'answer', choice: 'reply' })
    expect(runThroughIssueReviewKey('ArrowRight')).toEqual({ kind: 'move', by: 1 })
    expect(runThroughIssueReviewKey('ArrowLeft')).toEqual({ kind: 'move', by: -1 })
    expect(runThroughIssueReviewKey('4')).toBeUndefined()
    expect(runThroughIssueReviewKey('Enter')).toBeUndefined()
  })
})

describe('runThroughIssueReviewView', () => {
  it('shows an issue with nothing answered: its place, open dots, and the first marked', () => {
    const view = runThroughIssueReviewView(ISSUES, {}, 0)
    expect(view).toMatchObject({
      total: 4,
      answered: 0,
      open: 4,
      allAnswered: false,
      heading: 'Issue 1 of 4',
      progress: '0 of 4 answered',
      current: { index: 0, number: 1, standing: 'open', answer: undefined, note: undefined },
    })
    expect(view.dots.map((d) => [d.standing, d.current])).toEqual([
      ['open', true],
      ['open', false],
      ['open', false],
      ['open', false],
    ])
  })

  it('colours each dot by its answer, a reply as a fix in the person’s words', () => {
    const view = runThroughIssueReviewView(
      ISSUES,
      answers({ a: ['fix'], b: ['not-an-issue'], c: ['fix', 'One format'] }),
      2,
    )
    expect(view.dots.map((d) => d.standing)).toEqual(['fix', 'not-an-issue', 'reply', 'open'])
    expect(view.dots.map((d) => d.tone)).toEqual(['running', 'empty', 'running', 'empty'])
    expect(view.dots[2]?.label).toBe('Issue 3 · Fix · your words')
    expect(view.current).toMatchObject({ standing: 'reply', answer: 'fix', note: 'One format' })
    expect(view).toMatchObject({ answered: 3, open: 1, fixes: 2, notIssues: 1 })
    expect(view.progress).toBe('3 of 4 answered')
  })

  it('groups the answers on the last screen: open first while any are, then fixes, then not issues', () => {
    const view = runThroughIssueReviewView(
      ISSUES,
      answers({ a: ['fix'], c: ['not-an-issue'], d: ['fix', 'Shorter'] }),
      'summary',
    )
    expect(view.heading).toBe('Answers')
    expect(view.current).toBeUndefined()
    expect(view.groups.map((g) => g.heading)).toEqual(['Open · 1', 'Fix · 2', 'Not an issue · 1'])
    expect(view.groups[1]?.rows.map((r) => [r.number, r.badge, r.note])).toEqual([
      [1, 'Fix it', undefined],
      [4, 'Fix · your words', 'Shorter'],
    ])
    expect(view.dots.every((d) => !d.current)).toBe(true)
  })

  it('says all are answered, and leaves out a group nothing is in', () => {
    const view = runThroughIssueReviewView(
      ISSUES,
      answers({ a: ['fix'], b: ['fix'], c: ['fix'], d: ['fix'] }),
      'summary',
    )
    expect(view).toMatchObject({ allAnswered: true, heading: 'All 4 answered' })
    expect(view.groups.map((g) => g.answer)).toEqual(['fix'])
    expect(view.tally).toBe('Fix 4 · Not an issue 0')
  })

  it('counts no answer to an issue it does not list, and holds a place past the end on the last issue', () => {
    const view = runThroughIssueReviewView(ISSUES, answers({ gone: ['fix'], a: ['fix'] }), 9)
    expect(view.answered).toBe(1)
    expect(view.fixes).toBe(1)
    expect(view.current?.index).toBe(3)
    expect(view.heading).toBe('Issue 4 of 4')
  })

  it('has nothing to show and nothing answered with no issues', () => {
    const view = runThroughIssueReviewView([], {}, 0)
    expect(view).toMatchObject({ total: 0, at: 'summary', allAnswered: false, groups: [] })
  })
})

describe('runThroughIssueReviewEntry', () => {
  const parked = {
    projectId: 'p',
    status: 'parked' as const,
    park: { reason: 'gate' as const, stepId: 'sign-off', message: 'Sign off.', parkedAt: 0 },
  }

  it('offers going over the issues while the run waits at a gate with some', () => {
    expect(runThroughIssueReviewEntry(parked, 3)).toEqual({
      kind: 'start',
      label: 'Go over the issues (3)',
      count: 3,
    })
  })

  it('offers nothing with no issues, away from a gate, or with no run', () => {
    expect(runThroughIssueReviewEntry(parked, 0)).toBeUndefined()
    expect(
      runThroughIssueReviewEntry(
        { ...parked, park: { ...parked.park, reason: 'step-failed' as const } },
        3,
      ),
    ).toBeUndefined()
    expect(runThroughIssueReviewEntry({ ...parked, status: 'running' }, 3)).toBeUndefined()
    expect(runThroughIssueReviewEntry(undefined, 3)).toBeUndefined()
  })

  it('says how the issues were gone over once they were, with the story they made', () => {
    expect(
      runThroughIssueReviewEntry(
        {
          projectId: 'p',
          status: 'succeeded',
          issueReview: { projectId: 'app', storyId: 's9', fixes: 18, notIssues: 1, at: 5 },
        },
        19,
      ),
    ).toEqual({
      kind: 'reviewed',
      line: 'Gone over · 18 fixes · 1 not an issue',
      projectId: 'app',
      storyId: 's9',
    })
    expect(
      runThroughIssueReviewEntry(
        {
          ...parked,
          issueReview: { projectId: 'app', fixes: 1, notIssues: 2, at: 5 },
        },
        3,
      ),
    ).toMatchObject({ line: 'Gone over · 1 fix · 2 not issues', storyId: undefined })
  })
})

describe('runThroughReportOfRun', () => {
  const tile = (ref: Partial<ReviewEvidenceRef> & Pick<ReviewEvidenceRef, 'id'>): EvidenceTile => ({
    ref: {
      runId: 'r',
      projectId: 'p',
      kind: 'screenshot',
      path: `${ref.id}.png`,
      mediaType: 'image/png',
      bytes: 1,
      createdAt: 1,
      ...ref,
    },
    caption: ref.id,
  })

  it('reads the issues across every group a run filed, worst first', () => {
    const view = runThroughReportOfRun([
      { tiles: [tile({ id: 'n', issue: { severity: 'nit', title: 'N', happened: 'n' } })] },
      { tiles: [tile({ id: 'b', issue: { severity: 'blocker', title: 'B', happened: 'b' } })] },
    ])
    expect(view?.issues.map((r) => r.key)).toEqual(['b', 'n'])
  })

  it('is absent when nothing of a run-through was filed', () => {
    expect(runThroughReportOfRun([{ tiles: [tile({ id: 'x' })] }])).toBeUndefined()
  })
})
