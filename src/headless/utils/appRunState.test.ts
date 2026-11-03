import { describe, expect, it } from 'vitest'
import type { ProcessRun } from 'thefactory-tools/types'
import { BRIDGE_PREFIX } from './appBridge'
import { AppRunChangeFilter, appRunQueryOf, appRunStateOf, openChildRunId } from './appRunState'
import { APP_RUN_QUERY_INVALID, APP_RUN_SIGN_OFF_ASK } from './appRunStateConstants'

const NOW = 1_000_000

function run(over: Partial<ProcessRun> = {}): ProcessRun {
  return {
    id: 'root',
    projectId: 'wargames',
    storyId: 's1',
    title: 'Official sources: apply r4',
    plan: {
      definitionId: 'd',
      definitionScope: 'global',
      definitionVersion: 1,
      name: 'D',
      steps: [
        { id: 'features:f1', name: 'Apply source revision r4', kind: 'process' },
        { id: 'sign-off', name: 'Sign-off', kind: 'gate' },
      ],
      loops: [],
      frozenAt: 0,
    },
    status: 'running',
    cursor: { stepId: 'features:f1', iteration: 1 },
    loopCounts: {},
    ledger: [],
    startedAt: 0,
    updatedAt: 10,
    input: { manager: { enabled: false } },
    ...over,
  } as ProcessRun
}

function child(over: Partial<ProcessRun> = {}): ProcessRun {
  return run({
    id: 'child',
    parentRunId: 'root',
    title: 'Apply source revision r4',
    plan: {
      definitionId: 'f',
      definitionScope: 'global',
      definitionVersion: 1,
      name: 'F',
      steps: [
        { id: 'implement', name: 'Implement', kind: 'agent', agentType: 'developer' },
        { id: 'checks', name: 'Checks', kind: 'check' },
      ],
      loops: [],
      frozenAt: 0,
    },
    cursor: { stepId: 'implement', iteration: 1 },
    updatedAt: 20,
    ...over,
  })
}

const entry = (over: Record<string, unknown>) =>
  ({
    id: 'e1',
    stepId: 'features:f1',
    iteration: 1,
    status: 'running',
    startedAt: 0,
    ...over,
  }) as never

describe('appRunStateOf', () => {
  it('says a run at work is running, on its step and its nested run’s', () => {
    expect(appRunStateOf([run(), child()], NOW)).toEqual({
      id: 'root',
      storyId: 's1',
      title: 'Official sources: apply r4',
      state: 'running',
      step: 'Apply source revision r4 · Implement',
      updatedAt: 20,
    })
  })

  it('says a run with no nested run is on its own step', () => {
    expect(appRunStateOf([run({ cursor: { stepId: 'sign-off', iteration: 1 } })], NOW).step).toBe(
      'Sign-off',
    )
  })

  it('says a run stopped on a question waits on the person, with the question', () => {
    const asked = {
      status: 'parked' as const,
      park: {
        reason: 'step-waiting',
        stepId: 'features:f1',
        childRunId: 'child',
        message: 'Waiting on you',
        parkedAt: 5,
        ask: {
          kind: 'question',
          agent: 'developer',
          title: 'The check files are missing',
          detail: '',
        },
      },
    }
    const childAsked = {
      ...asked,
      park: { ...asked.park, stepId: 'implement', childRunId: undefined },
    }
    expect(appRunStateOf([run(asked as never), child(childAsked as never)], NOW)).toMatchObject({
      state: 'waiting',
      ask: 'The check files are missing',
      step: 'Apply source revision r4 · Implement',
    })
  })

  it('says a stop with no question waits on the person for what its message says', () => {
    const parked = run({
      status: 'parked',
      park: { reason: 'step-failed', stepId: 'features:f1', message: 'Checks failed', parkedAt: 5 },
    } as never)
    expect(appRunStateOf([parked], NOW)).toMatchObject({ state: 'waiting', ask: 'Checks failed' })
  })

  it('says a run at its sign-off waits on the person to sign it off', () => {
    const atGate = run({
      status: 'parked',
      cursor: { stepId: 'sign-off', iteration: 1 },
      park: { reason: 'gate', stepId: 'sign-off', message: 'Ready', parkedAt: 5 },
    } as never)
    expect(appRunStateOf([atGate], NOW)).toMatchObject({
      state: 'waiting',
      ask: APP_RUN_SIGN_OFF_ASK,
      step: 'Sign-off',
    })
  })

  it('says a run waiting on other work, or not started, is queued', () => {
    const blocked = run({
      status: 'parked',
      park: { reason: 'waiting-on-blockers', message: 'Waiting', parkedAt: 5 },
    } as never)
    expect(appRunStateOf([blocked], NOW).state).toBe('queued')
    expect(appRunStateOf([run({ status: 'pending' })], NOW).state).toBe('queued')
  })

  it('says a stop its agent manager is on is running, not waiting on the person', () => {
    const managed = run({
      status: 'parked',
      park: { reason: 'step-failed', stepId: 'features:f1', message: 'Checks failed', parkedAt: 5 },
      input: { manager: { enabled: true } },
      manager: { turn: { startedAt: NOW - 1000, chatContextId: 'c' } },
    } as never)
    expect(appRunStateOf([managed], NOW)).toMatchObject({ state: 'running' })
    expect(appRunStateOf([managed], NOW).ask).toBeUndefined()
  })

  it.each([
    ['succeeded', 'done'],
    ['failed', 'failed'],
    ['cancelled', 'stopped'],
  ] as const)('says a run that %s is %s, with no step', (status, state) => {
    const ended = appRunStateOf([run({ status, cursor: undefined })], NOW)
    expect(ended.state).toBe(state)
    expect(ended.step).toBeUndefined()
    expect(ended.ask).toBeUndefined()
  })
})

describe('openChildRunId', () => {
  it('is the nested run the current step is working, or the one its stop mirrors', () => {
    expect(openChildRunId(run({ ledger: [entry({ childRunId: 'c1' })] }))).toBe('c1')
    expect(
      openChildRunId(
        run({
          status: 'parked',
          park: { reason: 'step-waiting', childRunId: 'c2', message: '', parkedAt: 1 },
        } as never),
      ),
    ).toBe('c2')
  })

  it('is none for a step whose nested run finished, or another step’s', () => {
    expect(openChildRunId(run({ ledger: [entry({ childRunId: 'c1', status: 'done' })] }))).toBe(
      undefined,
    )
    expect(
      openChildRunId(run({ ledger: [entry({ childRunId: 'c1', stepId: 'sign-off' })] })),
    ).toBeUndefined()
    expect(
      openChildRunId(run({ status: 'succeeded', ledger: [entry({ childRunId: 'c1' })] })),
    ).toBe(undefined)
  })
})

describe('appRunQueryOf', () => {
  it('reads a run id or a story id, trimmed', () => {
    expect(appRunQueryOf({ runId: ' r1 ' })).toEqual({ runId: 'r1' })
    expect(appRunQueryOf({ storyId: 's1' })).toEqual({ storyId: 's1' })
    expect(appRunQueryOf({ runId: 'r1', storyId: 's1' })).toEqual({ runId: 'r1' })
  })

  it.each([undefined, null, 'r1', {}, { runId: ' ' }, { runId: 7 }])('refuses %j', (payload) => {
    expect(appRunQueryOf(payload)).toEqual({ error: APP_RUN_QUERY_INVALID })
  })
})

describe('AppRunChangeFilter', () => {
  const push = (payload: unknown) => ({ type: `${BRIDGE_PREFIX}run.changed`, payload })

  it('pushes a run of the project the first time, then only when its state, step or ask changes', () => {
    const filter = new AppRunChangeFilter()
    const first = run()
    expect(filter.next('wargames', { runId: 'root', run: first }, NOW)).toEqual(
      push({ runId: 'root', storyId: 's1' }),
    )
    expect(
      filter.next('wargames', { runId: 'root', run: { ...first, updatedAt: 99 } }, NOW),
    ).toBeNull()
    const nextStep = run({ cursor: { stepId: 'sign-off', iteration: 1 } })
    expect(filter.next('wargames', { runId: 'root', run: nextStep }, NOW)).toEqual(
      push({ runId: 'root', storyId: 's1' }),
    )
  })

  it('names the parent of a nested run, so the app following the top run reads it again', () => {
    const filter = new AppRunChangeFilter()
    expect(filter.next('wargames', { runId: 'child', run: child() }, NOW)).toEqual(
      push({ runId: 'child', storyId: 's1', parentRunId: 'root' }),
    )
    const asked = child({
      status: 'parked',
      park: {
        reason: 'step-waiting',
        message: 'm',
        parkedAt: 1,
        ask: { kind: 'question', agent: 'developer', title: 'A', detail: '' },
      },
    } as never)
    expect(filter.next('wargames', { runId: 'child', run: asked }, NOW)).not.toBeNull()
    const askedAgain = child({
      status: 'parked',
      park: {
        reason: 'step-waiting',
        message: 'm',
        parkedAt: 1,
        ask: { kind: 'question', agent: 'developer', title: 'B', detail: '' },
      },
    } as never)
    expect(filter.next('wargames', { runId: 'child', run: askedAgain }, NOW)).not.toBeNull()
  })

  it('never pushes another project’s run', () => {
    const filter = new AppRunChangeFilter()
    expect(
      filter.next('wargames', { runId: 'x', run: run({ id: 'x', projectId: 'other' }) }, NOW),
    ).toBeNull()
    expect(
      filter.next('wargames', { runId: 'x', projectId: 'other', deleted: true }, NOW),
    ).toBeNull()
  })

  it('pushes a deleted run of the project once', () => {
    const filter = new AppRunChangeFilter()
    filter.next('wargames', { runId: 'root', run: run() }, NOW)
    expect(
      filter.next('wargames', { runId: 'root', projectId: 'wargames', deleted: true }, NOW),
    ).toEqual(push({ runId: 'root' }))
    expect(filter.next('wargames', { runId: 'root', run: run() }, NOW)).not.toBeNull()
  })

  it('ignores an update that is not a run', () => {
    const filter = new AppRunChangeFilter()
    expect(filter.next('wargames', null, NOW)).toBeNull()
    expect(filter.next('wargames', { runId: 7 }, NOW)).toBeNull()
  })
})
