import { describe, expect, it } from 'vitest'
import type {
  ProcessLedgerEntry,
  ProcessOpenWork,
  ProcessPlanAmendment,
  ProcessPlanStep,
} from 'thefactory-tools/types'
import {
  processAmendmentView,
  processOpenWorkMetadata,
  processOpenWorkView,
} from './processOpenWork'
import { formatDateShort } from './time'
import {
  AMENDMENT_CLOSED_SIGN_OFF,
  AMENDMENT_REOPENED_ENDED,
  AMENDMENT_SET_ASIDE_PARK,
  OPEN_WORK_EXTEND_LABEL,
  OPEN_WORK_FRESH_LABEL,
  OPEN_WORK_NEW_ON_BRANCH_LABEL,
  OPEN_WORK_WARNING_PARALLEL,
  OPEN_WORK_WARNING_UNREVIEWED,
} from './processOpenWorkConstants'

const openWork = (over: Partial<ProcessOpenWork> = {}): ProcessOpenWork => ({
  runId: 'run-7',
  state: 'running',
  title: 'Fonts',
  branch: 'factory/fonts-run7',
  features: [
    { kind: 'feature', id: 'f1', title: 'Bundled fonts' },
    { kind: 'feature', id: 'f2', title: 'WebView fonts' },
  ],
  newFeatures: [{ kind: 'feature', id: 'f3', title: 'Icon font' }],
  options: [
    { choice: 'extend', available: true },
    { choice: 'new-on-branch', available: true },
    { choice: 'fresh', available: true },
  ],
  startedAt: 1,
  ...over,
})

describe('processOpenWorkView — where the open work stands', () => {
  it('warns that a running run and the new work would write the same files', () => {
    const view = processOpenWorkView(openWork({ state: 'running' }))
    expect(view.headline).toBe('“Fonts” is still running on this story.')
    expect(view.warnings).toEqual([
      'Running in parallel can conflict: both write to the story’s files.',
    ])
  })

  it('warns a parked run the same way — it is still live', () => {
    const view = processOpenWorkView(openWork({ state: 'parked' }))
    expect(view.headline).toBe('“Fonts” is still open on this story, waiting on a decision.')
    expect(view.warnings).toEqual([OPEN_WORK_WARNING_PARALLEL])
  })

  it('warns that unmerged work is unreviewed', () => {
    const view = processOpenWorkView(openWork({ state: 'unmerged' }))
    expect(view.headline).toBe('“Fonts” finished, but its work is not merged.')
    expect(view.warnings).toEqual([
      'That work is not merged or signed off; building on it builds on unreviewed code.',
    ])
  })

  it('warns a run waiting at its sign-off both ways — unreviewed, and still live', () => {
    const view = processOpenWorkView(openWork({ state: 'awaiting-sign-off' }))
    expect(view.headline).toBe('“Fonts” is waiting for your sign-off on this story.')
    expect(view.warnings).toEqual([OPEN_WORK_WARNING_UNREVIEWED, OPEN_WORK_WARNING_PARALLEL])
  })

  it('says what the run holds and what this launch would add', () => {
    const view = processOpenWorkView(openWork())
    expect(view.holds).toBe('Bundled fonts, WebView fonts')
    expect(view.adds).toBe('Icon font')
  })

  it('leaves out what it would add when there is nothing new', () => {
    expect(processOpenWorkView(openWork({ newFeatures: [] })).adds).toBeUndefined()
  })
})

describe('processOpenWorkView — the three ways to proceed', () => {
  it('offers them in order, each labelled, only the fresh start marked risky', () => {
    const options = processOpenWorkView(openWork()).options
    expect(options.map((o) => [o.choice, o.label, o.risky])).toEqual([
      ['extend', OPEN_WORK_EXTEND_LABEL, false],
      ['new-on-branch', OPEN_WORK_NEW_ON_BRANCH_LABEL, false],
      ['fresh', OPEN_WORK_FRESH_LABEL, true],
    ])
  })

  it('says adding to a live run signs everything off together', () => {
    const extend = processOpenWorkView(openWork()).options[0]
    expect(extend.detail).toContain('everything is signed off together')
  })

  it('says adding to a run at its sign-off closes that sign-off without a decision', () => {
    const extend = processOpenWorkView(openWork({ state: 'awaiting-sign-off' })).options[0]
    expect(extend.detail).toContain('closed without a decision')
  })

  it('says adding to unmerged work reopens the run and sets its approval aside', () => {
    const extend = processOpenWorkView(openWork({ state: 'unmerged' })).options[0]
    expect(extend.detail).toContain('the run is reopened')
    expect(extend.detail).toContain('earlier approval is set aside')
  })

  it('says a new process on the branch starts at its tip and is signed off separately', () => {
    const onBranch = processOpenWorkView(openWork()).options[1]
    expect(onBranch.detail).toContain('from the tip of factory/fonts-run7')
    expect(onBranch.detail).toContain('signed off separately')
    expect(onBranch.detail).toContain('only after that run’s work has landed')
  })

  it('says a fresh start ignores the open work and may conflict with it', () => {
    const fresh = processOpenWorkView(openWork()).options[2]
    expect(fresh.detail).toContain('as if that work did not exist')
    expect(fresh.detail).toContain('may conflict when merged')
  })

  it('carries why a way cannot be taken', () => {
    const view = processOpenWorkView(
      openWork({
        options: [
          { choice: 'extend', available: false, reason: 'Nothing new.' },
          { choice: 'new-on-branch', available: false, reason: 'Nothing new.' },
          { choice: 'fresh', available: true },
        ],
      }),
    )
    expect(view.options[0]).toMatchObject({ available: false, reason: 'Nothing new.' })
    expect(view.options[2].reason).toBeUndefined()
  })
})

describe('processOpenWorkMetadata', () => {
  it('names the choice, the run and where it stood', () => {
    expect(processOpenWorkMetadata(openWork({ state: 'unmerged' }), 'extend')).toEqual({
      openWork: 'extend',
      runId: 'run-7',
      state: 'unmerged',
    })
  })

  it('is nothing until a choice is made', () => {
    expect(processOpenWorkMetadata(openWork(), undefined)).toBeUndefined()
  })

  it('is nothing for a choice that cannot be taken', () => {
    const blocked = openWork({
      options: [
        { choice: 'extend', available: false, reason: 'Nothing new.' },
        { choice: 'new-on-branch', available: true },
        { choice: 'fresh', available: true },
      ],
    })
    expect(processOpenWorkMetadata(blocked, 'extend')).toBeUndefined()
  })
})

describe('processAmendmentView', () => {
  const at = Date.UTC(2026, 8, 29, 12)
  const date = formatDateShort(new Date(at))
  const step = (id: string, name: string, kind: ProcessPlanStep['kind'] = 'process') => ({
    id,
    name,
    kind,
  })
  const run = (amendments: ProcessPlanAmendment[], ledger: ProcessLedgerEntry[] = []) => ({
    plan: {
      definitionId: 'story-default',
      definitionScope: 'global' as const,
      definitionVersion: 1,
      name: 'Story',
      steps: [
        step('features:f1', 'Bundled fonts'),
        step('features:f3', 'Icon font'),
        step('walkthrough', 'Walkthrough', 'capture'),
        step('sign-off', 'Sign-off', 'gate'),
      ],
      loops: [],
      frozenAt: 0,
      amendments,
    },
    ledger,
  })
  const entry = (id: string, stepId: string): ProcessLedgerEntry => ({
    id,
    stepId,
    iteration: 1,
    status: 'done',
    startedAt: 0,
  })

  it('is nothing for a run no work was added to', () => {
    expect(processAmendmentView(run([]))).toEqual({ addedSteps: {}, notes: [] })
  })

  it('tags each added step with when it came in, and says what came in', () => {
    const view = processAmendmentView(
      run([{ at, stepIds: ['features:f3'], afterStepId: 'features:f1' }]),
    )
    expect(view.addedSteps).toEqual({ 'features:f3': `Added ${date}` })
    expect(view.notes).toEqual([`Added ${date}: Icon font.`])
  })

  it('says a sign-off the addition closed was closed without a decision', () => {
    const view = processAmendmentView(
      run(
        [{ at, stepIds: ['features:f3'], afterStepId: 'features:f1', closedEntryId: 'g1' }],
        [entry('g1', 'sign-off')],
      ),
    )
    expect(view.notes[0]).toContain(AMENDMENT_CLOSED_SIGN_OFF)
  })

  it('says a step the run was parked on was set aside', () => {
    const view = processAmendmentView(
      run(
        [{ at, stepIds: ['features:f3'], afterStepId: 'features:f1', closedEntryId: 'w1' }],
        [entry('w1', 'walkthrough')],
      ),
    )
    expect(view.notes[0]).toContain(AMENDMENT_SET_ASIDE_PARK)
  })

  it('says a reopened run had its earlier approval set aside', () => {
    const view = processAmendmentView(
      run([
        {
          at,
          stepIds: ['features:f3'],
          afterStepId: 'features:f1',
          reopened: { status: 'succeeded', approvalEntryId: 'g1' },
        },
      ]),
    )
    expect(view.notes[0]).toContain('its earlier approval was set aside')
  })

  it('says a run that ended without an approval was reopened', () => {
    const view = processAmendmentView(
      run([
        {
          at,
          stepIds: ['features:f3'],
          afterStepId: 'features:f1',
          reopened: { status: 'failed', error: 'Changes requested.' },
        },
      ]),
    )
    expect(view.notes[0]).toContain(AMENDMENT_REOPENED_ENDED)
  })
})
