import { describe, expect, it } from 'vitest'
import {
  PROCESS_MANAGER_CLAIM_STALE_MS,
  PROCESS_MANAGER_TURN_STALE_MS,
} from 'thefactory-tools/constants'
import type { ProcessPark, ProcessRun, ProcessRunManager } from 'thefactory-tools/types'

import { processRunManagerLine } from './processRunStop'

const run = (over: Partial<ProcessRun> = {}, park?: Partial<ProcessPark> | null): ProcessRun => ({
  id: 'r',
  projectId: 'p',
  title: 'Watch files',
  status: park === null ? 'running' : 'parked',
  loopCounts: {},
  ledger: [],
  startedAt: 0,
  updatedAt: 0,
  plan: {
    definitionId: 'story',
    definitionScope: 'global',
    definitionVersion: 1,
    name: 'Story',
    steps: [
      { id: 'implement', name: 'Implement', kind: 'agent', agentType: 'developer' },
      { id: 'f1', name: '35.1 Fonts', kind: 'process' },
      { id: 'sign-off', name: 'Sign-off', kind: 'gate' },
    ],
    loops: [],
    frozenAt: 0,
  },
  ...(park === null
    ? {}
    : {
        park: {
          reason: 'step-failed',
          stepId: 'implement',
          message: 'Implement failed.',
          parkedAt: 100,
          ...park,
        },
      }),
  ...over,
})

const turn = { runId: 'r', parkedAt: 100, signature: 's', startedAt: 110, chatContextId: 'c' }
const withManager = (manager: ProcessRunManager, park?: Partial<ProcessPark>) =>
  run({ manager }, park)

const nestedQuestion = {
  reason: 'step-waiting' as const,
  stepId: 'f1',
  childRunId: 'child',
  ask: {
    kind: 'question' as const,
    agent: 'developer',
    title: 'The developer has a question',
    detail: 'A or B?',
  },
  message: 'Waiting on you: The developer has a question',
}

describe('processRunManagerLine', () => {
  it('names the step the manager is looking at', () => {
    expect(processRunManagerLine(withManager({ turn }), 120)).toBe(
      'Manager: looking at “Implement”',
    )
  })

  it('names what a nested run asked, from the moment the manager claims it', () => {
    const claim = { runId: 'child', parkedAt: 90, at: 100 }
    expect(processRunManagerLine(withManager({ claim }, nestedQuestion), 120)).toBe(
      'Manager: looking at “The developer has a question”',
    )
  })

  it('says what a hold waits to be brought in', () => {
    const hold = {
      runId: 'r',
      parkedAt: 100,
      dependsOn: { kind: 'run' as const, runId: 'fixrun1234abcd' },
      resume: 'retry' as const,
      why: 'red base',
      at: 110,
      until: 999_999,
    }
    expect(processRunManagerLine(withManager({ hold }), 120)).toBe(
      'Manager: holding until run fixrun12 is brought in',
    )
  })

  it('names the sign-off while the manager pre-reads it, and nothing once its pre-read is filed', () => {
    const gate = { reason: 'gate' as const, stepId: 'sign-off', message: 'Sign off.' }
    expect(processRunManagerLine(withManager({ turn }, gate), 120)).toBe(
      'Manager: looking at “Sign-off”',
    )
    const preRead = { runId: 'r', parkedAt: 100, at: 115, summary: 's', items: [] }
    expect(processRunManagerLine(withManager({ turn, preRead }, gate), 120)).toBeUndefined()
  })

  it('is nothing once the stop is the person’s: handed on, waiting on a card, stale, off, or never engaged', () => {
    const escalation = {
      runId: 'r',
      parkedAt: 100,
      at: 115,
      signature: 's',
      why: 'judgement' as const,
      what: 'w',
      found: 'f',
      tried: [],
      recommendation: 'r',
    }
    const waitingOn = [{ actionId: 'a', toolName: 'askUser', kind: 'question', at: 115 }]
    const claim = { runId: 'r', parkedAt: 100, at: 100 }
    expect(processRunManagerLine(withManager({ escalation, turn }), 120)).toBeUndefined()
    expect(
      processRunManagerLine(withManager({ turn: { ...turn, waitingOn } }), 120),
    ).toBeUndefined()
    expect(
      processRunManagerLine(withManager({ turn }), 110 + PROCESS_MANAGER_TURN_STALE_MS),
    ).toBeUndefined()
    expect(
      processRunManagerLine(withManager({ claim }), 100 + PROCESS_MANAGER_CLAIM_STALE_MS),
    ).toBeUndefined()
    expect(
      processRunManagerLine(
        run({ input: { manager: { enabled: false } }, manager: { turn } }),
        120,
      ),
    ).toBeUndefined()
    expect(processRunManagerLine(run(), 120)).toBeUndefined()
    expect(processRunManagerLine(run({ manager: { turn } }, null), 120)).toBeUndefined()
  })
})
