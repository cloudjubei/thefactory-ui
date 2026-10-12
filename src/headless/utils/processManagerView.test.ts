import { describe, expect, it } from 'vitest'
import { PROCESS_MANAGER_STATUS_LOOKING } from 'thefactory-tools/constants'
import type { ProcessRun, ProcessRunManager } from 'thefactory-tools/types'

import { projectManagerSettingsOf, processRunManagerView } from './processManagerView'
import {
  PROCESS_MANAGER_SWITCH_DETAIL_OFF,
  PROCESS_MANAGER_SWITCH_DETAIL_ON,
  PROCESS_MANAGER_SWITCH_DETAIL_REVERSED,
} from './processManagerViewConstants'

function run(over: Partial<ProcessRun> = {}, manager?: ProcessRunManager): ProcessRun {
  return {
    id: 'run-1',
    projectId: 'p',
    title: 'Story',
    plan: {
      definitionId: 'd',
      definitionScope: 'global',
      definitionVersion: 1,
      name: 'd',
      frozenAt: 0,
      steps: [],
      loops: [],
    },
    status: 'parked',
    park: { reason: 'step-failed', stepId: 'implement', message: 'Implement failed.', parkedAt: 1 },
    loopCounts: {},
    ledger: [],
    startedAt: 0,
    updatedAt: 0,
    ...(manager ? { manager } : {}),
    ...over,
  }
}

const turn = { runId: 'run-1', parkedAt: 1, signature: 's', startedAt: 100, chatContextId: 'c' }

describe('processRunManagerView', () => {
  it('is on by default, doing nothing yet, with nothing handled', () => {
    expect(processRunManagerView(run(), 200)).toEqual({
      enabled: true,
      switchLabel: 'Manager on',
      switchDetail: PROCESS_MANAGER_SWITCH_DETAIL_ON,
      handled: { title: 'Handled for you: 0', lines: [] },
    })
  })

  it('says it is looking while its turn is under way', () => {
    expect(processRunManagerView(run({}, { turn }), 200).status).toEqual({
      state: 'looking',
      text: PROCESS_MANAGER_STATUS_LOOKING,
    })
  })

  it('says what it is holding the run for', () => {
    const hold = {
      runId: 'run-1',
      parkedAt: 1,
      dependsOn: { kind: 'run' as const, runId: 'fixrun123456' },
      resume: 'retry' as const,
      why: 'red base',
      at: 1,
      until: 2,
    }
    expect(processRunManagerView(run({}, { hold }), 200).status).toEqual({
      state: 'holding',
      text: 'Manager is holding this until run fixrun12 lands.',
    })
  })

  it('shows its card when it handed the park to you', () => {
    const view = processRunManagerView(
      run(
        {},
        {
          escalation: {
            runId: 'run-1',
            parkedAt: 1,
            at: 1,
            signature: 's',
            why: 'scope',
            what: 'Implement failed.\nunit: a › b\n',
            found: 'The work belongs to the tools project.',
            tried: ['Retried fresh — Did not help'],
            recommendation: 'File it there.',
            recommendedChoice: 'continue',
          },
        },
      ),
      200,
    )
    expect(view.status).toEqual({
      state: 'escalated',
      text: 'It is a choice about scope or the product',
    })
    expect(view.escalation).toEqual({
      reason: 'It is a choice about scope or the product',
      what: ['Implement failed.', 'unit: a › b'],
      found: 'The work belongs to the tools project.',
      tried: ['Retried fresh — Did not help'],
      recommendation: 'File it there.',
      recommendedChoice: 'continue',
    })
  })

  it('shows nothing of a park once the run is at work again', () => {
    const view = processRunManagerView(run({ status: 'running' }, { turn }), 200)
    expect(view.status).toBeUndefined()
    expect(view.escalation).toBeUndefined()
  })

  it('lists what it handled, coloured by how each came out', () => {
    const view = processRunManagerView(
      run(
        {},
        {
          interventions: [
            {
              id: 'i1',
              at: 5,
              runId: 'run-1',
              parkedAt: 1,
              signature: 's',
              tool: 'answerRunPark',
              move: 'answer-park',
              what: 'Tried “Implement” again with a fresh agent',
              why: 'it ran out of turns',
              result: 'The run moved on.',
              outcome: 'settled',
              actionKey: 'k',
              targetKey: 't',
            },
            {
              id: 'i2',
              at: 6,
              runId: 'run-1',
              parkedAt: 1,
              signature: 's',
              tool: 'proposeStepRerun',
              move: 'stage-rerun',
              what: 'Put a re-run on the run',
              why: 'w',
              outcome: 'reversed',
              actionKey: 'k2',
              targetKey: 't2',
            },
          ],
        },
      ),
      200,
    )
    expect(view.handled.title).toBe('Handled for you: 2')
    expect(view.handled.lines).toEqual([
      {
        key: '5-0',
        what: 'Tried “Implement” again with a fresh agent',
        why: 'it ran out of turns',
        result: 'The run moved on.',
        tone: 'done',
      },
      {
        key: '6-1',
        what: 'Put a re-run on the run',
        why: 'w',
        result: 'You undid it',
        tone: 'empty',
      },
    ])
  })

  it('shows its pre-read only while the run waits at its sign-off', () => {
    const preRead = {
      runId: 'run-1',
      parkedAt: 1,
      at: 1,
      summary: 'Small change.',
      items: [{ itemId: 'ny-1', finding: 'Moot.', recommendation: 'Close it.' }],
    }
    const atGate = run(
      { park: { reason: 'gate', stepId: 'sign-off', message: 'm', parkedAt: 1 } },
      { preRead },
    )
    expect(processRunManagerView(atGate, 200).preRead).toEqual({
      summary: 'Small change.',
      items: preRead.items,
    })
    expect(processRunManagerView(run({}, { preRead }), 200).preRead).toBeUndefined()
  })

  it('is off when the launch or the person switched it off, saying why', () => {
    const launched = processRunManagerView(run({ input: { manager: { enabled: false } } }), 200)
    expect(launched).toMatchObject({
      enabled: false,
      switchLabel: 'Manager off',
      switchDetail: PROCESS_MANAGER_SWITCH_DETAIL_OFF,
    })
    const undone = processRunManagerView(run({}, { off: { at: 1, reason: 'reversed' } }), 200)
    expect(undone.switchDetail).toBe(PROCESS_MANAGER_SWITCH_DETAIL_REVERSED)
  })
})

describe('projectManagerSettingsOf', () => {
  it('reads a project’s setting, on and acting where it says nothing', () => {
    expect(projectManagerSettingsOf(undefined)).toEqual({ enabled: true, autonomy: 'act' })
    expect(projectManagerSettingsOf({ processManager: { autonomy: 'observe' } })).toEqual({
      enabled: true,
      autonomy: 'observe',
    })
  })

  it('ignores a setting that is not one', () => {
    expect(projectManagerSettingsOf({ processManager: { autonomy: 'full' } })).toEqual({
      enabled: true,
      autonomy: 'act',
    })
  })
})
