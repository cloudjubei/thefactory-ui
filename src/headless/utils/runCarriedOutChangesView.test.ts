import { describe, expect, it } from 'vitest'
import type { ProcessRun, ProcessRunCarriedOutChange } from 'thefactory-tools/types'
import { runCarriedOutChangesView } from './runCarriedOutChangesView'
import { RUN_CARRIED_OUT_CHANGES_TITLE } from './runCarriedOutChangesViewConstants'
import {
  RUN_PENDING_CHANGE_ADDED,
  RUN_PENDING_CHANGE_REWORKED,
} from './runPendingChangesViewConstants'

const reworked: ProcessRunCarriedOutChange = {
  change: {
    id: 'c1',
    kind: 'feature-changed',
    featureId: 'f1',
    title: 'Dashboard',
    summary: 'Acceptance changed — show the week first',
    at: 1,
  },
  at: 10,
  runId: 'r1',
  entryId: 'e1',
}

const added: ProcessRunCarriedOutChange = {
  change: {
    id: 'c2',
    kind: 'feature-added',
    featureId: 'f3',
    title: 'Gap links',
    summary: 'Add “Gap links” to this run',
    at: 2,
  },
  at: 20,
  runId: 'r1',
  entryId: 'e2',
}

const run = (carriedOutChanges?: ProcessRunCarriedOutChange[]): ProcessRun =>
  ({ id: 'r1', projectId: 'p', status: 'parked', carriedOutChanges }) as ProcessRun

describe('runCarriedOutChangesView', () => {
  it('lists every feature edit the run carried out itself, oldest first, with its kind', () => {
    expect(runCarriedOutChangesView(run([reworked, added]))).toEqual({
      title: RUN_CARRIED_OUT_CHANGES_TITLE,
      items: [
        {
          id: 'c1',
          featureId: 'f1',
          name: 'Dashboard',
          kindWord: RUN_PENDING_CHANGE_REWORKED,
          summary: reworked.change.summary,
        },
        {
          id: 'c2',
          featureId: 'f3',
          name: 'Gap links',
          kindWord: RUN_PENDING_CHANGE_ADDED,
          summary: added.change.summary,
        },
      ],
    })
  })

  it('keeps one change as a list of one', () => {
    expect(runCarriedOutChangesView(run([added]))?.items.map((i) => i.id)).toEqual(['c2'])
  })

  it('is nothing when the run carried out none', () => {
    expect(runCarriedOutChangesView(run(undefined))).toBeUndefined()
    expect(runCarriedOutChangesView(run([]))).toBeUndefined()
  })
})
