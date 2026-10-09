import { describe, expect, it } from 'vitest'
import type { ProcessRun, ProcessRunPendingChange } from 'thefactory-tools/types'
import { runPendingChangesView } from './runPendingChangesView'
import {
  RUN_PENDING_CHANGES_START_HINT,
  RUN_PENDING_CHANGE_ADDED,
  RUN_PENDING_CHANGE_RERUN,
  RUN_PENDING_CHANGE_REWORKED,
} from './runPendingChangesViewConstants'

const reworked: ProcessRunPendingChange = {
  id: 'c1',
  kind: 'feature-changed',
  featureId: 'f1',
  title: 'Dashboard',
  summary: 'Acceptance changed — make it the landing screen',
  at: 1,
}
const added: ProcessRunPendingChange = {
  id: 'c2',
  kind: 'feature-added',
  featureId: 'f3',
  title: 'Gap links',
  summary: 'Add “Gap links” to this run',
  at: 2,
}

const rerun: ProcessRunPendingChange = {
  id: 'c3',
  kind: 'step-rerun',
  stepId: 'code-review',
  title: 'Code review',
  summary: 'Read the whole diff this time.',
  note: 'Read the whole diff this time.',
  at: 3,
}

const run = (over: Partial<ProcessRun> = {}): ProcessRun =>
  ({
    id: 'r1',
    projectId: 'p',
    title: 'Run',
    status: 'parked',
    park: { reason: 'gate', stepId: 'sign-off', message: 'Waiting at Sign-off.', parkedAt: 0 },
    plan: {
      definitionId: 'd',
      definitionScope: 'global',
      definitionVersion: 1,
      name: 'Story',
      frozenAt: 0,
      loops: [],
      steps: [{ id: 'sign-off', name: 'Sign-off', kind: 'gate' }],
    },
    ledger: [{ id: 'g', stepId: 'sign-off', iteration: 1, status: 'running', startedAt: 0 }],
    loopCounts: {},
    startedAt: 0,
    updatedAt: 0,
    pendingChanges: [reworked, added],
    ...over,
  }) as ProcessRun

describe('runPendingChangesView', () => {
  it('lists every waiting change with its kind, and offers to start them all at the sign-off', () => {
    expect(runPendingChangesView(run())).toEqual({
      headline: '2 changes waiting to start',
      items: [
        {
          id: 'c1',
          featureId: 'f1',
          name: 'Dashboard',
          kindWord: RUN_PENDING_CHANGE_REWORKED,
          summary: reworked.summary,
        },
        {
          id: 'c2',
          featureId: 'f3',
          name: 'Gap links',
          kindWord: RUN_PENDING_CHANGE_ADDED,
          summary: added.summary,
        },
      ],
      changeIds: ['c1', 'c2'],
      startLabel: 'Start work on 2 changes',
      canStart: true,
      hint: RUN_PENDING_CHANGES_START_HINT,
    })
  })

  it('names a step re-run by its step, with no feature and no kind word after it', () => {
    const view = runPendingChangesView(run({ pendingChanges: [reworked, rerun] }))!
    expect(view.items[1]).toEqual({
      id: 'c3',
      featureId: undefined,
      name: RUN_PENDING_CHANGE_RERUN('Code review'),
      kindWord: undefined,
      summary: rerun.summary,
    })
    expect(view.items[1].name).toBe('Re-run Code review')
    expect(view.changeIds).toEqual(['c1', 'c3'])
    expect(view.startLabel).toBe('Start work on 2 changes')
  })

  it('names one change in the singular', () => {
    const view = runPendingChangesView(run({ pendingChanges: [added] }))!
    expect(view.headline).toBe('1 change waiting to start')
    expect(view.startLabel).toBe('Start work on this change')
  })

  it('says why they cannot start while the run works', () => {
    const view = runPendingChangesView(run({ status: 'running', park: undefined }))!
    expect(view.canStart).toBe(false)
    expect(view.hint).toContain('working right now')
  })

  it('is nothing with no changes waiting, or once the run ended', () => {
    expect(runPendingChangesView(run({ pendingChanges: undefined }))).toBeUndefined()
    expect(runPendingChangesView(run({ pendingChanges: [] }))).toBeUndefined()
    expect(runPendingChangesView(run({ status: 'failed', park: undefined }))).toBeUndefined()
  })
})
