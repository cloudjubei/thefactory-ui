import { describe, expect, it } from 'vitest'
import type { JourneyDayLogEntry, ReviewEvidenceRef } from 'thefactory-tools/types'
import {
  JOURNEY_DAY_LOG_LABEL,
  JOURNEY_RECORDING_LABEL,
  JOURNEY_STOPPED_SCREENSHOT_LABEL,
} from 'thefactory-tools/constants'

import { journeyDays, journeyStepView } from './journeyDaysView'
import type { EvidenceTile } from './reviewEvidenceViewTypes'

const AT = '2026-11-09T08:00:00.000Z'

const line = (day: number, rest: Record<string, unknown>) =>
  ({ at: AT, day, ...rest }) as JourneyDayLogEntry

const DAY_TWO_FIRST: JourneyDayLogEntry[] = [
  line(2, { kind: 'day-start' }),
  line(2, {
    kind: 'goals-offered',
    goals: [{ id: 'g4', text: 'Call the bank' }, { text: 'Clear the inbox' }],
  }),
  line(2, {
    kind: 'decision',
    decision: 'morning-review',
    source: 'live',
    answer: {},
    model: 'sonnet',
    costUsd: 0.012,
  }),
  line(2, { kind: 'goal-removed', goal: 'Clear the inbox' }),
  line(2, {
    kind: 'take-over',
    goal: 'Accept the goals',
    saw: 'A dialog asking to rate the app',
    outcome: 'failed',
    turns: 25,
    costUsd: 0.4,
  }),
  line(2, {
    kind: 'take-over',
    goal: 'Open the evening check-in',
    saw: 'The check-in button was hidden',
    outcome: 'handed-back',
  }),
  line(1, { kind: 'day-start' }),
  line(1, { kind: 'goals-offered', goals: [{ text: 'Walk 20 minutes' }, { text: 'Read' }] }),
  line(1, { kind: 'decision', decision: 'energy', source: 'plan', answer: {} }),
  line(1, {
    kind: 'goal-replaced',
    from: 'Read',
    to: 'Stretch for 5 minutes',
    reason: 'Too tired to read tonight',
  }),
  line(1, { kind: 'goals-accepted', goals: [{ text: 'Walk 20 minutes' }] }),
  line(1, { kind: 'goals-accepted' }),
  line(1, { kind: 'goal-status', goal: 'Walk 20 minutes', status: 'done' }),
  line(1, { kind: 'goal-status', goal: 'Stretch for 5 minutes', status: 'skipped' }),
  line(1, { kind: 'journal', wrote: false }),
  line(1, { kind: 'journal', wrote: true, text: '  Felt good after the walk.  ' }),
  line(1, { kind: 'probe', question: 'Did today feel lighter?', choice: 'A bit', note: 'Rain' }),
  line(1, { kind: 'card', card: 'Sleep tip', reaction: 'Useful' }),
  line(1, { kind: 'card', card: 'Weekly recap' }),
  line(1, {
    kind: 'decision',
    decision: 'probe',
    source: 'live',
    answer: {},
    costUsd: Number.NaN,
  }),
  line(1, { kind: 'day-end' }),
]

describe('journeyDays', () => {
  const [one, two] = journeyDays({ entries: DAY_TWO_FIRST, problems: [] })

  it('groups the lines by day, in day order, whatever order they came in', () => {
    expect(journeyDays({ entries: DAY_TWO_FIRST, problems: [] }).map((d) => d.title)).toEqual([
      'Day 1',
      'Day 2',
    ])
    expect(journeyDays({ entries: [], problems: [] })).toEqual([])
  })

  it('says what each day offered, kept, removed and replaced, and why', () => {
    expect(one!.offered).toEqual(['Walk 20 minutes', 'Read'])
    expect(one!.accepted).toEqual(['Walk 20 minutes'])
    expect(one!.replaced).toEqual([
      {
        key: 'replaced-0',
        from: 'Read',
        to: 'Stretch for 5 minutes',
        reason: 'Too tired to read tonight',
      },
    ])
    expect(two!.removed).toEqual([{ key: 'removed-0', goal: 'Clear the inbox', reason: undefined }])
    expect(two!.offered).toEqual(['Call the bank', 'Clear the inbox'])
  })

  it('says each status, a status it does not know as the log has it', () => {
    expect(one!.statuses.map((s) => s.status)).toEqual([
      { label: 'Done', tone: 'done' },
      { label: 'skipped', tone: 'empty' },
    ])
  })

  it('takes the last journal line of the day, and says when nothing was written', () => {
    expect(one!.journal).toBe('Felt good after the walk.')
    expect(two!.journal).toBeUndefined()
    const blank = journeyDays({
      entries: [
        line(3, { kind: 'journal', wrote: true }),
        line(4, { kind: 'journal', wrote: false }),
      ],
      problems: [],
    })
    expect(blank.map((d) => d.journal)).toEqual(['Wrote an entry.', 'Wrote nothing.'])
  })

  it('keeps the evening question and the cards with what was picked', () => {
    expect(one!.probes).toEqual([
      { key: 'probe-0', question: 'Did today feel lighter?', choice: 'A bit', note: 'Rain' },
    ])
    expect(one!.cards.map((c) => [c.card, c.reaction])).toEqual([
      ['Sleep tip', 'Useful'],
      ['Weekly recap', undefined],
    ])
  })

  it('marks each decision plan or live, with its model and cost', () => {
    expect(one!.decisions.map((d) => [d.label, d.badge.label])).toEqual([
      ['Energy', 'Plan'],
      ['Evening question', 'Live'],
    ])
    expect(two!.decisions[0]).toMatchObject({
      kind: 'morning-review',
      source: 'live',
      badge: { label: 'Live', tone: 'running' },
      model: 'sonnet',
      cost: '$0.01',
    })
    expect(one!.decisions[0]!.cost).toBeUndefined()
  })

  it('marks each take-over by how it ended, and the day by the worst of them', () => {
    expect(two!.takeOvers.map((t) => [t.badge.label, t.turns, t.cost])).toEqual([
      ['Failed', '25 turns', '$0.40'],
      ['Handed back', undefined, undefined],
    ])
    expect(two!.takeOverBadge).toEqual({ label: 'Failed', tone: 'stuck' })
    expect(one!.takeOverBadge).toBeUndefined()
    const handed = journeyDays({ entries: DAY_TWO_FIRST.slice(5, 6), problems: [] })
    expect(handed[0]!.takeOverBadge).toEqual({ label: 'Handed back', tone: 'done' })
  })

  it('sums what a day cost from its decisions and take-overs, skipping what is no number', () => {
    expect(two!.costUsd).toBeCloseTo(0.412)
    expect(two!.cost).toBe('$0.41')
    expect(one!.costUsd).toBeUndefined()
    expect(one!.cost).toBeUndefined()
  })

  it('says a day in a line: decisions, live ones and take-overs', () => {
    expect(one!.line).toBe('2 decisions · 1 live')
    expect(two!.line).toBe('1 decision · 1 live · 2 take-overs')
    const quiet = journeyDays({ entries: [line(5, { kind: 'day-start' })], problems: [] })
    expect(quiet[0]!.line).toBe('0 decisions')
  })
})

const ref = (id: string, over: Partial<ReviewEvidenceRef>): ReviewEvidenceRef =>
  ({
    id,
    kind: 'log',
    path: `${id}.txt`,
    mediaType: 'text/plain',
    createdAt: 1500,
    runId: 'run-1',
    projectId: 'p',
    ...over,
  }) as ReviewEvidenceRef

const tile = (r: ReviewEvidenceRef, text?: string): EvidenceTile => ({
  ref: r,
  caption: r.label ?? r.kind,
  ...(text !== undefined ? { text } : {}),
})

const LOG_TEXT = [
  ...DAY_TWO_FIRST.map((one) => JSON.stringify(one)),
  '',
  'not json',
  JSON.stringify({ at: AT, day: 0, kind: 'day-start' }),
].join('\n')

const ENTRY = { startedAt: 1000, endedAt: 2000, status: 'done' as const }

describe('journeyStepView', () => {
  const log = tile(ref('log', { label: JOURNEY_DAY_LOG_LABEL }), LOG_TEXT)
  const video = tile(
    ref('video', { kind: 'recording', label: JOURNEY_RECORDING_LABEL, mediaType: 'video/webm' }),
  )
  const shot = tile(
    ref('shot', {
      kind: 'screenshot',
      label: JOURNEY_STOPPED_SCREENSHOT_LABEL,
      mediaType: 'image/png',
    }),
  )

  it('reads the days, recording and stopping point the attempt filed', () => {
    const view = journeyStepView([log, video, shot], ENTRY)
    expect(view.days.map((d) => d.day)).toEqual([1, 2])
    expect(view.recording).toBe(video)
    expect(view.stoppedAt).toBe(shot)
    expect(view.openDay).toBe(2)
    expect(view.empty).toBeUndefined()
  })

  it('totals the days, decisions, live ones, take-overs and cost', () => {
    const view = journeyStepView([log], ENTRY)
    expect(view.totalLine).toBe('2 days · 2 decisions, 1 live · 2 take-overs')
    expect(view.totalCost).toBe('$0.41')
    const planOnly = tile(
      ref('plan', { label: JOURNEY_DAY_LOG_LABEL }),
      JSON.stringify(line(1, { kind: 'decision', decision: 'energy', source: 'plan', answer: {} })),
    )
    expect(journeyStepView([planOnly], ENTRY).totalLine).toBe('1 day · 1 decision')
  })

  it('says how many lines could not be read', () => {
    expect(journeyStepView([log], ENTRY).unread).toBe('3 lines of the day log could not be read.')
    const onlyBad = tile(ref('bad', { label: JOURNEY_DAY_LOG_LABEL }), 'not json')
    const view = journeyStepView([onlyBad], ENTRY)
    expect(view.unread).toBe('1 line of the day log could not be read.')
    expect(view.empty).toBeUndefined()
    expect(view.totalLine).toBeUndefined()
  })

  it('takes only what this attempt filed, and the newest of each', () => {
    const before = tile(ref('old', { label: JOURNEY_DAY_LOG_LABEL, createdAt: 900 }), LOG_TEXT)
    const newer = tile(
      ref('newer', { label: JOURNEY_DAY_LOG_LABEL, createdAt: 1900 }),
      JSON.stringify(line(7, { kind: 'day-start' })),
    )
    expect(journeyStepView([before], ENTRY).days).toEqual([])
    expect(journeyStepView([log, newer], ENTRY).days.map((d) => d.day)).toEqual([7])
  })

  it('takes nothing filed under another label or kind', () => {
    const other = tile(ref('other', { label: 'Server log' }), LOG_TEXT)
    const asReport = tile(ref('report', { kind: 'report', label: JOURNEY_DAY_LOG_LABEL }), LOG_TEXT)
    const otherVideo = tile(ref('v', { kind: 'recording', label: 'Day 1' }))
    const view = journeyStepView([other, asReport, otherVideo], ENTRY)
    expect(view.days).toEqual([])
    expect(view.recording).toBeUndefined()
  })

  it('says why there are no days', () => {
    expect(journeyStepView([], ENTRY).empty).toBe('No day log was filed for this step.')
    expect(journeyStepView([], { ...ENTRY, endedAt: undefined, status: 'running' }).empty).toBe(
      'The days are being lived. The day log shows once the script ends.',
    )
    const unread = tile(ref('log', { label: JOURNEY_DAY_LOG_LABEL }))
    expect(journeyStepView([unread], ENTRY).empty).toBe('The day log could not be read.')
    expect(journeyStepView([log], undefined).empty).toBe('No day log was filed for this step.')
  })

  it('has no total cost when nothing was priced', () => {
    const view = journeyStepView(
      [tile(ref('l', { label: JOURNEY_DAY_LOG_LABEL }), JSON.stringify(DAY_TWO_FIRST[6]))],
      ENTRY,
    )
    expect(view.totalCost).toBeUndefined()
    expect(view.openDay).toBe(1)
  })
})
