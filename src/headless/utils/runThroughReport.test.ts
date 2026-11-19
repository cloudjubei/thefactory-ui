import { describe, expect, it } from 'vitest'

import type { ReviewEvidenceRef } from '../api/generated'
import type { EvidenceTile } from './reviewEvidenceViewTypes'
import {
  isRunThroughFiling,
  runThroughReport,
  runThroughTickPercent,
  withoutRunThroughFilings,
} from './runThroughReport'

const tile = (ref: Partial<ReviewEvidenceRef> & Pick<ReviewEvidenceRef, 'id'>): EvidenceTile => ({
  ref: {
    runId: 'tester',
    projectId: 'p',
    kind: 'report',
    path: `${ref.id}.md`,
    mediaType: 'text/markdown',
    bytes: 1,
    createdAt: 1,
    ...ref,
  },
  caption: ref.id,
})

const record = (
  id: string,
  sections: NonNullable<ReviewEvidenceRef['runThroughSections']>,
  extra: Partial<ReviewEvidenceRef> = {},
) => tile({ id, runThroughSections: sections, ...extra })

const issue = (
  id: string,
  fields: Partial<NonNullable<ReviewEvidenceRef['issue']>> &
    Pick<NonNullable<ReviewEvidenceRef['issue']>, 'severity'>,
  extra: Partial<ReviewEvidenceRef> = {},
) =>
  tile({
    id,
    issue: { title: `${id} title`, happened: `${id} happened`, ...fields },
    ...extra,
  })

const recording = (id: string, extra: Partial<ReviewEvidenceRef> = {}) =>
  tile({ id, kind: 'recording', mediaType: 'video/webm', ...extra })

const reached = { scenario: 'Play a game', reachedEnd: true, summary: 'Played it all.' }

describe('isRunThroughFiling', () => {
  it('is a run-through record or a flagged issue', () => {
    expect(isRunThroughFiling(record('r', reached).ref)).toBe(true)
    expect(isRunThroughFiling(issue('i', { severity: 'nit' }).ref)).toBe(true)
  })

  it('is not any other filing', () => {
    expect(isRunThroughFiling(tile({ id: 'plain' }).ref)).toBe(false)
    expect(isRunThroughFiling(recording('v').ref)).toBe(false)
  })
})

describe('withoutRunThroughFilings', () => {
  it('keeps every filing but the run-through’s, in order', () => {
    const a = tile({ id: 'a' })
    const b = recording('b')
    expect(
      withoutRunThroughFilings([a, record('r', reached), issue('i', { severity: 'nit' }), b]),
    ).toEqual([a, b])
  })
})

describe('runThroughReport', () => {
  it('is absent when nothing of a run-through was filed', () => {
    expect(runThroughReport([tile({ id: 'plain' })], [recording('v')])).toBeUndefined()
  })

  it('reads a clean run that reached the end as passed', () => {
    const view = runThroughReport([record('r', reached)], [])
    expect(view).toEqual({
      record: {
        scenario: 'Play a game',
        reachedEnd: true,
        endLine: 'Reached the end',
        summary: 'Played it all.',
      },
      issues: [],
      issuesSummary: 'No issues',
      state: 'passed',
      proof: { text: 'Run-through: reached the end — no issues', status: 'proven' },
      recording: undefined,
    })
  })

  it('lists issues worst first, then by when they happened, with every detail', () => {
    const shot = issue(
      'turn',
      {
        severity: 'major',
        expected: 'The turn waits',
        doing: 'Ending the turn',
        view: '/game',
        at: 94,
      },
      { kind: 'screenshot', mediaType: 'image/png' },
    )
    const view = runThroughReport(
      [
        issue('title', { severity: 'nit', at: 8 }),
        issue('tip', { severity: 'minor', at: 201 }),
        issue('score', { severity: 'major', at: 431 }),
        shot,
        record('r', reached),
      ],
      [],
    )
    expect(view?.issues.map((i) => i.key)).toEqual(['turn', 'score', 'tip', 'title'])
    expect(view?.issues[0]).toEqual({
      key: 'turn',
      severity: 'major',
      tone: 'stuck',
      title: 'turn title',
      happened: 'turn happened',
      expected: 'The turn waits',
      doing: 'Ending the turn',
      view: '/game',
      atSec: 94,
      time: '01:34',
      screenshot: shot,
    })
    expect(view?.issues[3]).toMatchObject({
      tone: 'neutral',
      expected: undefined,
      doing: undefined,
      view: undefined,
      screenshot: undefined,
      time: '00:08',
    })
    expect(view?.issuesSummary).toBe('2 major · 1 minor · 1 nit')
    expect(view?.state).toBe('flagged')
    expect(view?.proof).toEqual({
      text: 'Run-through: reached the end — 2 major · 1 minor · 1 nit',
      status: 'unproven',
    })
  })

  it('puts an issue with no moment after the timed ones of its severity, then by filing order', () => {
    const view = runThroughReport(
      [
        issue('late-untimed', { severity: 'minor' }, { createdAt: 5 }),
        issue('early-untimed', { severity: 'minor' }, { createdAt: 2 }),
        issue('timed', { severity: 'minor', at: 300 }),
        record('r', reached),
      ],
      [],
    )
    expect(view?.issues.map((i) => [i.key, i.time])).toEqual([
      ['timed', '05:00'],
      ['early-untimed', undefined],
      ['late-untimed', undefined],
    ])
  })

  it('reads a run that stopped short as failed, saying where', () => {
    const view = runThroughReport(
      [
        record('r', {
          scenario: 'Play a game',
          reachedEnd: false,
          stoppedAt: 'turn 3',
          summary: 'The board froze.',
        }),
        issue('tip', { severity: 'minor', at: 201 }),
      ],
      [],
    )
    expect(view?.record?.endLine).toBe('Stopped at turn 3')
    expect(view?.state).toBe('failed')
    expect(view?.proof).toEqual({
      text: 'Run-through: stopped at turn 3 — 1 minor',
      status: 'failed',
    })
  })

  it('says a run stopped part-way when it did not say where', () => {
    const view = runThroughReport(
      [record('r', { scenario: 's', reachedEnd: false, summary: 'x' })],
      [],
    )
    expect(view?.record?.endLine).toBe('Stopped part-way')
    expect(view?.proof.text).toBe('Run-through: stopped part-way — no issues')
  })

  it('fails on a blocker even when the run reached the end', () => {
    const view = runThroughReport(
      [
        record('r', reached),
        issue('b', { severity: 'blocker' }),
        issue('c', { severity: 'blocker' }),
      ],
      [],
    )
    expect(view?.state).toBe('failed')
    expect(view?.issuesSummary).toBe('2 blockers')
  })

  it('passes with nits alone', () => {
    expect(
      runThroughReport([record('r', reached), issue('n', { severity: 'nit' })], [])?.state,
    ).toBe('passed')
  })

  it('reads the newest record, and only the issues and recording of its run', () => {
    const view = runThroughReport(
      [
        record('old', { ...reached, summary: 'old' }, { runId: 'first', createdAt: 1 }),
        record('new', { ...reached, summary: 'new' }, { runId: 'second', createdAt: 9 }),
        issue('mine', { severity: 'minor' }, { runId: 'second' }),
        issue('theirs', { severity: 'major' }, { runId: 'first' }),
      ],
      [
        recording('other-run', { runId: 'first', createdAt: 20 }),
        recording('older', { runId: 'second', createdAt: 3 }),
        recording('newest', { runId: 'second', createdAt: 7 }),
        tile({ id: 'trace', kind: 'trace', runId: 'second', createdAt: 30 }),
      ],
    )
    expect(view?.record?.summary).toBe('new')
    expect(view?.issues.map((i) => i.key)).toEqual(['mine'])
    expect(view?.recording?.ref.id).toBe('newest')
  })

  it('shows the issues flagged before any record, with no record and no recording', () => {
    const view = runThroughReport(
      [issue('a', { severity: 'major' }, { runId: 'x' }), issue('b', { severity: 'nit' })],
      [recording('v')],
    )
    expect(view?.record).toBeUndefined()
    expect(view?.issues.map((i) => i.key)).toEqual(['a', 'b'])
    expect(view?.recording).toBeUndefined()
    expect(view?.proof).toEqual({ text: 'Run-through: 1 major · 1 nit', status: 'unproven' })
  })
})

describe('runThroughTickPercent', () => {
  it('places a moment along the recording', () => {
    expect(runThroughTickPercent(94, 452)).toBeCloseTo(20.796, 2)
  })

  it('keeps a moment past either end on the bar', () => {
    expect(runThroughTickPercent(-3, 100)).toBe(0)
    expect(runThroughTickPercent(130, 100)).toBe(100)
  })

  it('has no place without a moment or a known length', () => {
    expect(runThroughTickPercent(undefined, 100)).toBeUndefined()
    expect(runThroughTickPercent(10, 0)).toBeUndefined()
    expect(runThroughTickPercent(10, Number.NaN)).toBeUndefined()
    expect(runThroughTickPercent(10, Number.POSITIVE_INFINITY)).toBeUndefined()
  })
})
