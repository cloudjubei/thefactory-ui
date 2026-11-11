import { describe, expect, it } from 'vitest'
import type { ReviewEvidenceRef, ScriptLogLine } from 'thefactory-tools/types'
import {
  SCRIPT_LOG_LABEL,
  SCRIPT_RECORDING_LABEL,
  SCRIPT_STOPPED_SCREENSHOT_LABEL,
} from 'thefactory-tools/constants'

import type { EvidenceTile } from './reviewEvidenceViewTypes'
import { scriptLogSections, scriptStepLogView } from './scriptStepLogView'

const AT = '2026-11-09T08:00:00.000Z'

const line = (section: string, kind: string, title: string, rest: Partial<ScriptLogLine> = {}) =>
  ({ at: AT, section, kind, title, ...rest }) as ScriptLogLine

const LINES: ScriptLogLine[] = [
  line('Sign in', 'step', 'Opened the sign-in page'),
  line('Sign in', 'ask', 'Picked a user name', { source: 'pinned', detail: 'kept from before' }),
  line('Settings', 'step', 'Opened settings', { items: ['Theme', 'Language'] }),
  line('Sign in', 'ask', 'Wrote a password hint', {
    source: 'live',
    costUsd: 0.012,
    model: 'sonnet',
  }),
  line('Settings', 'take-over', 'Closed a tip', {
    detail: 'A tip covered the save button.',
    outcome: 'handed-back',
    costUsd: 0.2,
  }),
  line('Settings', 'take-over', 'Saved the form', { outcome: 'failed' }),
  line('Settings', 'take-over', 'Retried the form'),
  line('Settings', 'ask', 'Picked a theme', { source: 'live', costUsd: 0.01 }),
]

describe('scriptLogSections', () => {
  const [signIn, settings] = scriptLogSections({ lines: LINES, problems: [] })

  it('groups lines by section, in the order each section first came', () => {
    expect(scriptLogSections({ lines: LINES, problems: [] }).map((s) => s.title)).toEqual([
      'Sign in',
      'Settings',
    ])
    expect(signIn!.rows.map((row) => row.title)).toEqual([
      'Opened the sign-in page',
      'Picked a user name',
      'Wrote a password hint',
    ])
  })

  it('keys each section and row apart', () => {
    expect(signIn!.key).not.toBe(settings!.key)
    const keys = settings!.rows.map((row) => row.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('shows each line’s kind, title, detail, items, source and cost', () => {
    expect(signIn!.rows[0]).toMatchObject({
      kind: 'step',
      kindBadge: { label: 'step', tone: 'empty' },
      detail: undefined,
      items: [],
      sourceBadge: undefined,
      cost: undefined,
    })
    expect(signIn!.rows[1]).toMatchObject({
      kindBadge: { label: 'Ask', tone: 'empty' },
      detail: 'kept from before',
      sourceBadge: { label: 'Pinned', tone: 'empty' },
    })
    expect(signIn!.rows[2]).toMatchObject({
      sourceBadge: { label: 'Live', tone: 'running' },
      cost: '$0.01',
    })
    expect(settings!.rows[0]).toMatchObject({ items: ['Theme', 'Language'] })
  })

  it('says how each take-over ended, when its line says', () => {
    expect(settings!.rows.slice(1, 4).map((row) => row.kindBadge)).toEqual([
      { label: 'Handed back', tone: 'done' },
      { label: 'Take-over failed', tone: 'stuck' },
      { label: 'Take-over', tone: 'review' },
    ])
  })

  it('counts lines, asks, live ones and take-overs on the folded row', () => {
    expect(signIn!.line).toBe('3 lines · 2 asks, 1 live')
    expect(settings!.line).toBe('5 lines · 1 ask, 1 live · 3 take-overs')
    const plain = scriptLogSections({ lines: [line('Start', 'step', 'Began')], problems: [] })
    expect(plain[0]!.line).toBe('1 line')
    const pinnedOnly = scriptLogSections({
      lines: [line('Start', 'ask', 'Asked', { source: 'pinned' })],
      problems: [],
    })
    expect(pinnedOnly[0]!.line).toBe('1 line · 1 ask')
  })

  it('marks a section by its worst take-over', () => {
    expect(signIn!.takeOverBadge).toBeUndefined()
    expect(settings!.takeOverBadge).toEqual({ label: 'Take-over failed', tone: 'stuck' })
    const handedBack = scriptLogSections({ lines: [LINES[4]!], problems: [] })
    expect(handedBack[0]!.takeOverBadge).toEqual({ label: 'Handed back', tone: 'done' })
  })

  it('adds up what each section cost, skipping what is not a price', () => {
    expect(signIn!.costUsd).toBeCloseTo(0.012)
    expect(settings!.costUsd).toBeCloseTo(0.21)
    expect(settings!.cost).toBe('$0.21')
    const unpriced = scriptLogSections({
      lines: [
        line('Start', 'step', 'Began'),
        line('Start', 'ask', 'Asked', { costUsd: Number.NaN }),
      ],
      problems: [],
    })
    expect(unpriced[0]).toMatchObject({ costUsd: undefined, cost: undefined })
    expect(unpriced[0]!.rows[1]!.cost).toBeUndefined()
  })

  it('has no sections for an empty log', () => {
    expect(scriptLogSections({ lines: [], problems: [] })).toEqual([])
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
  ...LINES.map((one) => JSON.stringify(one)),
  '',
  'not json',
  JSON.stringify({ at: AT, section: ' ', kind: 'step', title: 'Blank section' }),
].join('\n')

const ENTRY = { startedAt: 1000, endedAt: 2000, status: 'done' as const }

describe('scriptStepLogView', () => {
  const log = tile(ref('log', { label: SCRIPT_LOG_LABEL }), LOG_TEXT)
  const video = tile(
    ref('video', { kind: 'recording', label: SCRIPT_RECORDING_LABEL, mediaType: 'video/webm' }),
  )
  const shot = tile(
    ref('shot', {
      kind: 'screenshot',
      label: SCRIPT_STOPPED_SCREENSHOT_LABEL,
      mediaType: 'image/png',
    }),
  )

  it('reads the sections, recording and stopping point the attempt filed', () => {
    const view = scriptStepLogView([log, video, shot], ENTRY)
    expect(view.sections.map((s) => s.title)).toEqual(['Sign in', 'Settings'])
    expect(view.recording).toBe(video)
    expect(view.stoppedAt).toBe(shot)
    expect(view.openSection).toBe(view.sections[1]!.key)
    expect(view.empty).toBeUndefined()
  })

  it('sums up sections, asks, live ones, take-overs and cost', () => {
    const view = scriptStepLogView([log], ENTRY)
    expect(view.summaryLine).toBe('2 sections · 3 asks, 2 live · 3 take-overs')
    expect(view.totalCost).toBe('$0.22')
    const one = tile(ref('one', { label: SCRIPT_LOG_LABEL }), JSON.stringify(LINES[0]))
    expect(scriptStepLogView([one], ENTRY).summaryLine).toBe('1 section · 0 asks')
  })

  it('says how many lines could not be read', () => {
    expect(scriptStepLogView([log], ENTRY).unread).toBe(
      '2 lines of the step log could not be read.',
    )
    const onlyBad = tile(ref('bad', { label: SCRIPT_LOG_LABEL }), 'not json')
    const view = scriptStepLogView([onlyBad], ENTRY)
    expect(view.unread).toBe('1 line of the step log could not be read.')
    expect(view.empty).toBeUndefined()
    expect(view.summaryLine).toBeUndefined()
    expect(view.openSection).toBeUndefined()
  })

  it('takes only what this attempt filed, and the newest of each', () => {
    const before = tile(ref('old', { label: SCRIPT_LOG_LABEL, createdAt: 900 }), LOG_TEXT)
    const newer = tile(
      ref('newer', { label: SCRIPT_LOG_LABEL, createdAt: 1900 }),
      JSON.stringify(line('Later', 'step', 'Came back')),
    )
    expect(scriptStepLogView([before], ENTRY).sections).toEqual([])
    expect(scriptStepLogView([log, newer], ENTRY).sections.map((s) => s.title)).toEqual(['Later'])
  })

  it('takes nothing filed under another label or kind', () => {
    const other = tile(ref('other', { label: 'Server log' }), LOG_TEXT)
    const asReport = tile(ref('report', { kind: 'report', label: SCRIPT_LOG_LABEL }), LOG_TEXT)
    const otherVideo = tile(ref('v', { kind: 'recording', label: 'Another recording' }))
    const view = scriptStepLogView([other, asReport, otherVideo], ENTRY)
    expect(view.sections).toEqual([])
    expect(view.recording).toBeUndefined()
  })

  it('says why there are no sections', () => {
    expect(scriptStepLogView([], ENTRY).empty).toBe('No step log was filed for this step.')
    expect(scriptStepLogView([], { ...ENTRY, endedAt: undefined, status: 'running' }).empty).toBe(
      'The script is running. The step log shows once it ends.',
    )
    const unread = tile(ref('log', { label: SCRIPT_LOG_LABEL }))
    expect(scriptStepLogView([unread], ENTRY).empty).toBe('The step log could not be read.')
    expect(scriptStepLogView([log], undefined).empty).toBe('No step log was filed for this step.')
  })

  it('has no total cost when nothing was priced', () => {
    const view = scriptStepLogView(
      [tile(ref('l', { label: SCRIPT_LOG_LABEL }), JSON.stringify(LINES[0]))],
      ENTRY,
    )
    expect(view.totalCost).toBeUndefined()
    expect(view.openSection).toBe(view.sections[0]!.key)
  })
})
