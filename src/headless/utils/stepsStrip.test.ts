import { describe, expect, it } from 'vitest'
import type { ProcessLedgerEntry, ProcessRun } from 'thefactory-tools/types'

import {
  featureStripEntries,
  processRunStripEntries,
  stepsStripView,
  storyStatusTone,
  storyStripEntries,
} from './stepsStrip'
import { STEPS_STRIP_FULL_MAX } from './stepsStripConstants'
import type { StepsStripEntry, StepsStripPhase } from './stepsStripTypes'

function entries(phases: readonly StepsStripPhase[]): StepsStripEntry[] {
  return phases.map((phase, i) => ({
    key: `s${i}`,
    label: `Step ${i}`,
    phase,
    tone: phase === 'done' ? 'done' : phase === 'current' ? 'review' : 'queued',
  }))
}

const kinds = (view: ReturnType<typeof stepsStripView>) =>
  view.items.map((i) => (i.kind === 'step' ? `${i.key}${i.emphasis ? '*' : ''}` : i.label))

describe('stepsStripView', () => {
  it('draws nothing for no steps', () => {
    expect(stepsStripView([])).toEqual({ items: [], folded: false })
    expect(stepsStripView([], { narrow: true })).toEqual({ items: [], folded: false })
  })

  it('shows every step of a short list, emphasising the current one', () => {
    const view = stepsStripView(entries(['done', 'done', 'current', 'upcoming']))
    expect(view.folded).toBe(false)
    expect(kinds(view)).toEqual(['s0', 's1', 's2*', 's3'])
  })

  it('shows a list of exactly the full maximum in full and folds one longer', () => {
    const atMax = entries(Array.from({ length: STEPS_STRIP_FULL_MAX }, () => 'upcoming' as const))
    expect(stepsStripView(atMax).folded).toBe(false)
    const over = entries([...atMax.map((e) => e.phase), 'upcoming'])
    expect(stepsStripView(over).folded).toBe(true)
  })

  it('folds a long list: done chip, the current step, the next, and the rest', () => {
    const view = stepsStripView(
      entries([
        'done',
        'done',
        'done',
        'done',
        'done',
        'done',
        'done',
        'done',
        'done',
        'current',
        'upcoming',
        'upcoming',
      ]),
    )
    expect(view.folded).toBe(true)
    expect(kinds(view)).toEqual(['✓ 9 done', 's9*', 's10', '+1 more'])
    expect(view.items[0]).toMatchObject({ kind: 'done', count: 9 })
    expect(view.items[3]).toMatchObject({ kind: 'more', count: 1 })
  })

  it('folds every list on a narrow strip, without the next step', () => {
    const view = stepsStripView(entries(['done', 'done', 'current', 'upcoming', 'upcoming']), {
      narrow: true,
    })
    expect(view.folded).toBe(true)
    expect(kinds(view)).toEqual(['✓ 2/5', 's2*', '+2'])
  })

  it('leaves out the done chip when nothing before the current step finished', () => {
    const view = stepsStripView(entries(['current', ...Array(8).fill('upcoming')]))
    expect(kinds(view)).toEqual(['s0*', 's1', '+7 more'])
  })

  it('leaves out the more chip when the current step is the last or the next is the only one left', () => {
    expect(kinds(stepsStripView(entries([...Array(8).fill('done'), 'current'])))).toEqual([
      '✓ 8 done',
      's8*',
    ])
    expect(
      kinds(stepsStripView(entries([...Array(7).fill('done'), 'current', 'upcoming']))),
    ).toEqual(['✓ 7 done', 's7*', 's8'])
  })

  it('anchors on the first unfinished step when none is current', () => {
    const view = stepsStripView(entries([...Array(4).fill('done'), ...Array(4).fill('upcoming')]))
    expect(kinds(view)).toEqual(['✓ 4 done', 's4*', 's5', '+2 more'])
  })

  it('anchors on the last step of a finished list', () => {
    const view = stepsStripView(entries(Array(9).fill('done')), { narrow: true })
    expect(kinds(view)).toEqual(['✓ 8/9', 's8*'])
  })

  it('counts only finished steps before the current one in the done chip', () => {
    const view = stepsStripView(
      entries(['done', 'upcoming', 'done', 'current', 'upcoming', 'upcoming', 'upcoming']),
    )
    expect(view.items[0]).toMatchObject({ kind: 'done', count: 2, label: '✓ 2 done' })
  })

  it('carries the entry of each step it shows', () => {
    const list = entries(['done', 'current'])
    list[1] = { ...list[1], attempt: 'attempt 3 of 3' }
    const view = stepsStripView(list, { narrow: true })
    const step = view.items.find((i) => i.kind === 'step')
    expect(step).toMatchObject({ entry: { attempt: 'attempt 3 of 3', label: 'Step 1' } })
  })
})

function run(over: Partial<ProcessRun> = {}): ProcessRun {
  return {
    id: 'r',
    projectId: 'p',
    title: 'Story',
    plan: {
      definitionId: 'd',
      definitionScope: 'global',
      definitionVersion: 1,
      name: 'Story delivery',
      steps: [
        { id: 'impl', name: 'Implement', kind: 'agent', agentType: 'developer' },
        { id: 'verify', name: 'Verify', kind: 'agent', agentType: 'verifier' },
        { id: 'signoff', name: 'Sign-off', kind: 'gate' },
        { id: 'cleanup', name: 'Cleanup', kind: 'report' },
      ],
      loops: [{ id: 'fix', from: 'verify', to: 'impl', when: ['failed'], maxIterations: 3 }],
      frozenAt: 0,
    },
    status: 'running',
    loopCounts: {},
    ledger: [],
    startedAt: 0,
    updatedAt: 0,
    ...over,
  }
}

function entry(stepId: string, over: Partial<ProcessLedgerEntry> = {}): ProcessLedgerEntry {
  return {
    id: `${stepId}-${Math.random()}`,
    stepId,
    iteration: 1,
    status: 'done',
    outcome: 'passed',
    startedAt: 0,
    ...over,
  } as ProcessLedgerEntry
}

describe('stepsStripView — steps accepted unchecked', () => {
  it('counts the folded steps accepted unchecked on the done chip', () => {
    const list: StepsStripEntry[] = [
      { key: 'a', label: 'A', phase: 'done', tone: 'done' },
      {
        key: 'b',
        label: 'B',
        phase: 'done',
        tone: 'review',
        acceptedUnchecked: 'Verify accepted by you — never proven',
      },
      { key: 'c', label: 'C', phase: 'current', tone: 'running' },
      { key: 'd', label: 'D', phase: 'upcoming', tone: 'queued' },
    ]
    expect(stepsStripView(list, { narrow: true }).items[0]).toMatchObject({
      kind: 'done',
      count: 2,
      acceptedUnchecked: 1,
    })
  })

  it('counts none when every folded step proved itself', () => {
    const view = stepsStripView(entries(['done', 'done', 'current']), { narrow: true })
    expect(view.items[0]).toMatchObject({ kind: 'done', count: 2, acceptedUnchecked: 0 })
  })
})

describe('processRunStripEntries', () => {
  it('draws a step carried on past unproven as done in gold, saying who accepted it', () => {
    const r = run({
      status: 'parked',
      park: { reason: 'gate', stepId: 'signoff', message: '', parkedAt: 0 },
      ledger: [
        entry('impl'),
        entry('verify', {
          outcome: 'unchecked',
          override: { choice: 'continue', at: 1, decidedBy: 'manager', decidedVia: 'manager' },
        }),
      ],
    })
    const [impl, verify] = processRunStripEntries(r)
    expect(impl).toEqual({ key: 'impl', label: 'Implement', phase: 'done', tone: 'done' })
    expect(verify).toEqual({
      key: 'verify',
      label: 'Verify',
      phase: 'done',
      tone: 'review',
      acceptedUnchecked: 'Accepted by the manager — never proven',
    })
  })

  it('names every planned step in order', () => {
    expect(processRunStripEntries(run()).map((e) => [e.key, e.label])).toEqual([
      ['impl', 'Implement'],
      ['verify', 'Verify'],
      ['signoff', 'Sign-off'],
      ['cleanup', 'Cleanup'],
    ])
  })

  it('makes the running step current and the finished ones done', () => {
    const r = run({
      cursor: { stepId: 'verify' } as ProcessRun['cursor'],
      ledger: [entry('impl'), entry('verify', { status: 'running', outcome: undefined })],
    })
    expect(processRunStripEntries(r).map((e) => [e.key, e.phase, e.tone])).toEqual([
      ['impl', 'done', 'done'],
      ['verify', 'current', 'running'],
      ['signoff', 'upcoming', 'queued'],
      ['cleanup', 'upcoming', 'queued'],
    ])
  })

  it('makes a parked gate current in the review tone', () => {
    const r = run({
      status: 'parked',
      park: { reason: 'gate', stepId: 'signoff', message: '', parkedAt: 0 },
      ledger: [
        entry('impl'),
        entry('verify'),
        entry('signoff', { status: 'running', outcome: undefined }),
      ],
    })
    const signoff = processRunStripEntries(r).find((e) => e.key === 'signoff')
    expect(signoff).toMatchObject({ phase: 'current', tone: 'review' })
  })

  it('draws a stop its agent manager has as work going on, gate or not — current, in the running tone', () => {
    const failed = run({
      status: 'parked',
      park: { reason: 'step-failed', stepId: 'verify', message: '', parkedAt: 0 },
      ledger: [entry('impl'), entry('verify', { outcome: 'failed' })],
    })
    const gate = run({
      status: 'parked',
      park: { reason: 'gate', stepId: 'signoff', message: '', parkedAt: 0 },
      ledger: [entry('impl'), entry('verify')],
    })
    expect(processRunStripEntries(failed, 'manager')[1]).toMatchObject({
      phase: 'current',
      tone: 'running',
    })
    expect(processRunStripEntries(gate, 'manager')[2]).toMatchObject({
      phase: 'current',
      tone: 'running',
    })
    expect(processRunStripEntries(failed, 'person')[1]).toMatchObject({
      phase: 'current',
      tone: 'on_hold',
    })
    expect(processRunStripEntries(gate)[2]).toMatchObject({ phase: 'current', tone: 'review' })
  })

  it('makes a step parked on a question current in the on-hold tone', () => {
    const r = run({
      status: 'parked',
      park: { reason: 'step-waiting', stepId: 'impl', message: '', parkedAt: 0 },
      ledger: [entry('impl', { outcome: 'waiting' })],
    })
    expect(processRunStripEntries(r)[0]).toMatchObject({ phase: 'current', tone: 'on_hold' })
  })

  it('keeps a failed step done in the stuck tone once the run moved past it', () => {
    const r = run({
      status: 'failed',
      ledger: [entry('impl'), entry('verify', { outcome: 'failed' })],
    })
    expect(processRunStripEntries(r)[1]).toMatchObject({ phase: 'done', tone: 'stuck' })
  })

  it('makes a step a send-back went back over upcoming, with its next attempt', () => {
    const r = run({
      cursor: { stepId: 'impl' } as ProcessRun['cursor'],
      loopCounts: { fix: 1 },
      ledger: [
        entry('impl'),
        entry('verify', { outcome: 'failed' }),
        entry('impl', { status: 'running', outcome: undefined }),
      ],
    })
    const [impl, verify] = processRunStripEntries(r)
    expect(impl).toMatchObject({ phase: 'current', attempt: 'attempt 2 of 3' })
    expect(verify).toMatchObject({ phase: 'upcoming', attempt: 'attempt 2 of 3 · next' })
  })

  it('makes the step the cursor is on current before it starts', () => {
    const r = run({ status: 'pending', cursor: { stepId: 'impl' } as ProcessRun['cursor'] })
    expect(processRunStripEntries(r)[0]).toMatchObject({ phase: 'current', tone: 'queued' })
  })

  it('carries no attempt pill on a step that ran once', () => {
    const r = run({ ledger: [entry('impl')] })
    expect(processRunStripEntries(r)[0].attempt).toBeUndefined()
  })
})

describe('storyStripEntries', () => {
  const feature = (
    id: string,
    status: 'pending' | 'in_progress' | 'reviewable' | 'done' | 'blocked' | 'deferred',
  ) => ({
    id,
    title: `Feature ${id}`,
    status,
    description: '',
    context: [],
    createdAt: '',
    updatedAt: '',
  })

  it('names each feature by its reference and title', () => {
    const story = { features: [feature('a', 'done'), feature('b', 'pending')] }
    expect(
      storyStripEntries(story, (id) => `#4.${id === 'a' ? 1 : 2}`).map((e) => e.label),
    ).toEqual(['#4.1 Feature a', '#4.2 Feature b'])
  })

  it('reads a feature’s status as its phase and tone', () => {
    const story = {
      features: [
        feature('a', 'done'),
        feature('b', 'reviewable'),
        feature('c', 'in_progress'),
        feature('d', 'pending'),
        feature('e', 'blocked'),
        feature('f', 'deferred'),
      ],
    }
    expect(storyStripEntries(story, (id) => `#${id}`).map((e) => [e.phase, e.tone])).toEqual([
      ['done', 'done'],
      ['done', 'review'],
      ['current', 'working'],
      ['upcoming', 'queued'],
      ['upcoming', 'stuck'],
      ['upcoming', 'on_hold'],
    ])
  })

  it('lists nothing for a story without features', () => {
    expect(storyStripEntries({ features: [] }, () => '#1')).toEqual([])
  })
})

describe('featureStripEntries', () => {
  it('lists each done-when line, bullets dropped', () => {
    const list = featureStripEntries({
      status: 'in_progress',
      acceptance: '- Card shows sender\n2. Shows target chat\n\n* [ ] Deny keeps it unsent',
    })
    expect(list.map((e) => [e.key, e.label, e.phase, e.tone])).toEqual([
      ['criterion-0', 'Card shows sender', 'upcoming', 'queued'],
      ['criterion-1', 'Shows target chat', 'upcoming', 'queued'],
      ['criterion-2', 'Deny keeps it unsent', 'upcoming', 'queued'],
    ])
  })

  it('marks every line met once the feature is done or verified', () => {
    expect(featureStripEntries({ status: 'done', acceptance: 'One' })[0]).toMatchObject({
      phase: 'done',
      tone: 'done',
    })
    expect(featureStripEntries({ status: 'reviewable', acceptance: 'One' })[0]).toMatchObject({
      phase: 'done',
      tone: 'review',
    })
  })

  it('is empty when the feature states no done-when', () => {
    expect(featureStripEntries({ status: 'pending' })).toEqual([])
    expect(featureStripEntries({ status: 'pending', acceptance: '  \n ' })).toEqual([])
  })
})

describe('storyStatusTone', () => {
  it('maps the on-hold status to the package’s on_hold tone', () => {
    expect(storyStatusTone('deferred')).toBe('on_hold')
    expect(storyStatusTone('in_progress')).toBe('working')
  })
})
