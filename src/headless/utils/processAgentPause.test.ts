import { describe, expect, it } from 'vitest'
import type { ProcessRun } from 'thefactory-tools/types'

import {
  agentPauseCanDecide,
  agentPauseClockTime,
  agentPauseDecision,
  agentPauseShownRun,
  agentPauseStepView,
  processAgentPauseOf,
} from './processAgentPause'
import { AGENT_PAUSE_COPY } from './processAgentPauseConstants'
import type {
  AgentPauseDecisionState,
  ProcessAgentPause,
  ProcessRunWithPause,
} from './processAgentPauseTypes'

const PAUSE: ProcessAgentPause = {
  stepId: 'build',
  entryId: 'build#3',
  runner: 'cli',
  cause: 'asleep',
  reason: 'The computer went to sleep during Build.',
  since: 1,
  canResume: true,
  actions: ['resume', 'retry', 'stop'],
}
const AT = new Date(2026, 10, 20, 14, 9).getTime()
const run = (over: Partial<ProcessRunWithPause> = {}) =>
  ({ id: 'r', status: 'running', ...over }) as ProcessRunWithPause

const seen = (state: AgentPauseDecisionState, pause: ProcessAgentPause | undefined) =>
  agentPauseDecision(state, { type: 'seen', pause, at: AT })

describe('processAgentPauseOf', () => {
  it('reads the paused agent a run view carries, and none on a run without one', () => {
    expect(processAgentPauseOf(run({ agentPause: PAUSE }))).toBe(PAUSE)
    expect(processAgentPauseOf(run())).toBeUndefined()
    expect(processAgentPauseOf({ id: 'r' } as ProcessRun)).toBeUndefined()
  })
})

describe('agentPauseClockTime', () => {
  it('says a moment of the day as the clock does', () => {
    expect(agentPauseClockTime(AT)).toBe('14:09')
    expect(agentPauseClockTime(new Date(2026, 0, 1, 7, 5).getTime())).toBe('07:05')
  })
})

describe('agentPauseDecision', () => {
  it('holds the pause it sees', () => {
    expect(seen({}, PAUSE)).toEqual({ pause: PAUSE })
  })

  it('takes one action at a time on a pause that offers it; repeats change nothing', () => {
    const paused = seen({}, PAUSE)
    const resuming = agentPauseDecision(paused, { type: 'decide', action: 'resume' })
    expect(resuming).toEqual({
      pause: PAUSE,
      pending: { action: 'resume', entryId: 'build#3', stepId: 'build' },
    })
    expect(agentPauseDecision(resuming, { type: 'decide', action: 'resume' })).toBe(resuming)
    expect(agentPauseDecision(resuming, { type: 'decide', action: 'retry' })).toBe(resuming)
  })

  it('refuses an action with nothing paused, or one the pause does not offer', () => {
    expect(agentPauseDecision({}, { type: 'decide', action: 'resume' })).toEqual({})
    const lost = seen({}, { ...PAUSE, canResume: false, actions: ['retry', 'stop'] })
    expect(agentPauseDecision(lost, { type: 'decide', action: 'resume' })).toBe(lost)
  })

  it('clears a refusal when the next action is taken', () => {
    const refused = { pause: PAUSE, error: 'No' }
    expect(agentPauseDecision(refused, { type: 'decide', action: 'retry' })).toEqual({
      pause: PAUSE,
      pending: { action: 'retry', entryId: 'build#3', stepId: 'build' },
    })
  })

  it('puts the pause back with the reason when an action is refused', () => {
    const resuming = agentPauseDecision(seen({}, PAUSE), { type: 'decide', action: 'resume' })
    expect(agentPauseDecision(resuming, { type: 'failed', error: 'Busy' })).toEqual({
      pause: PAUSE,
      error: 'Busy',
    })
  })

  it('keeps the action going while the same pause still shows, and drops it on a new one', () => {
    const resuming = agentPauseDecision(seen({}, PAUSE), { type: 'decide', action: 'resume' })
    expect(seen(resuming, PAUSE)).toBe(resuming)
    const next = { ...PAUSE, entryId: 'build#4' }
    expect(seen(resuming, next)).toEqual({ pause: next })
  })

  it('keeps the action, or its refusal, across a fresh read of the same pause', () => {
    const again = { ...PAUSE }
    const resuming = agentPauseDecision(seen({}, PAUSE), { type: 'decide', action: 'resume' })
    expect(seen(resuming, again)).toEqual({ ...resuming, pause: again })
    const refused = agentPauseDecision(resuming, { type: 'failed', error: 'Busy' })
    expect(seen(refused, again)).toEqual({ pause: again, error: 'Busy' })
  })

  it('ends quietly when the pause clears after the person’s action', () => {
    const resuming = agentPauseDecision(seen({}, PAUSE), { type: 'decide', action: 'resume' })
    expect(seen(resuming, undefined)).toEqual({})
  })

  it('notes the agent came back by itself when the pause clears untouched, until the note is done', () => {
    const back = seen(seen({}, PAUSE), undefined)
    expect(back).toEqual({ cleared: { stepId: 'build', at: AT } })
    expect(seen(back, undefined)).toBe(back)
    expect(agentPauseDecision(back, { type: 'note-done' })).toEqual({})
    expect(seen(back, PAUSE)).toEqual({ pause: PAUSE })
  })

  it('says a refusal even when the pause went meanwhile', () => {
    expect(agentPauseDecision({}, { type: 'failed', error: 'Gone' })).toEqual({ error: 'Gone' })
  })

  it('stays as it is with nothing paused before or after', () => {
    const idle = {}
    expect(seen(idle, undefined)).toBe(idle)
  })
})

describe('agentPauseCanDecide', () => {
  it('says whether an action would be sent now', () => {
    const paused = seen({}, PAUSE)
    expect(agentPauseCanDecide(paused, 'stop')).toBe(true)
    expect(agentPauseCanDecide({}, 'stop')).toBe(false)
    const busy = agentPauseDecision(paused, { type: 'decide', action: 'stop' })
    expect(agentPauseCanDecide(busy, 'retry')).toBe(false)
  })
})

describe('agentPauseShownRun', () => {
  it('shows the run as running once an action is on its way', () => {
    const paused = run({ agentPause: PAUSE })
    const resuming = agentPauseDecision(seen({}, PAUSE), { type: 'decide', action: 'resume' })
    expect(agentPauseShownRun(paused, resuming)).toEqual(run())
    expect(agentPauseShownRun(paused, seen({}, PAUSE))).toBe(paused)
  })

  it('leaves a run without a pause as it is', () => {
    const plain = run()
    expect(
      agentPauseShownRun(plain, { pending: { action: 'resume', entryId: 'x', stepId: 'build' } }),
    ).toBe(plain)
    expect(agentPauseShownRun(undefined, {})).toBeUndefined()
  })
})

describe('agentPauseStepView', () => {
  it('says why the step paused, with Resume, Retry step and Stop run', () => {
    expect(agentPauseStepView(seen({}, PAUSE), 'Build')).toEqual({
      kind: 'paused',
      stepId: 'build',
      line: 'Paused · computer asleep',
      headline: 'The computer went to sleep during Build.',
      body: AGENT_PAUSE_COPY.canResume,
      buttons: [
        { action: 'resume', label: 'Resume', title: AGENT_PAUSE_COPY.resumeTitle },
        { action: 'retry', label: 'Retry step', title: AGENT_PAUSE_COPY.retryTitle('Build') },
      ],
      stop: { label: 'Stop run', ask: 'Stop the run?', confirm: 'Stop run', keep: 'Keep it' },
    })
  })

  it('offers only what the pause allows, and says its session cannot be picked up', () => {
    const view = agentPauseStepView(
      seen({}, { ...PAUSE, cause: 'host-lost', reason: '', canResume: false, actions: ['retry'] }),
      'Build',
    )
    expect(view).toEqual({
      kind: 'paused',
      stepId: 'build',
      line: 'Paused · agent stopped answering',
      headline: 'The agent stopped answering during Build.',
      body: AGENT_PAUSE_COPY.cannotResume,
      buttons: [
        { action: 'retry', label: 'Retry step', title: AGENT_PAUSE_COPY.retryTitle('Build') },
      ],
    })
  })

  it('never offers Resume when the session cannot be carried on, whatever the actions say', () => {
    const view = agentPauseStepView(
      seen({}, { ...PAUSE, cause: 'cli-stopped', reason: ' ', canResume: false }),
      'Build',
    )
    expect(view).toMatchObject({
      line: 'Paused · CLI stopped',
      headline: 'The agent’s CLI stopped during Build.',
    })
    expect(view?.kind === 'paused' && view.buttons.map((b) => b.action)).toEqual(['retry'])
  })

  it('says why the last action was refused', () => {
    expect(agentPauseStepView({ pause: PAUSE, error: 'Busy' }, 'Build')).toMatchObject({
      kind: 'paused',
      error: 'Busy',
    })
  })

  it('says what is happening once an action is on its way', () => {
    const paused = seen({}, PAUSE)
    const working = (action: 'resume' | 'retry' | 'stop') =>
      agentPauseStepView(agentPauseDecision(paused, { type: 'decide', action }), 'Build')
    expect(working('resume')).toEqual({
      kind: 'working',
      stepId: 'build',
      text: 'Resuming the same session…',
    })
    expect(working('retry')).toMatchObject({ text: 'Starting a new agent on Build…' })
    expect(working('stop')).toMatchObject({ text: 'Stopping the run…' })
  })

  it('says the agent came back by itself, and when', () => {
    expect(agentPauseStepView({ cleared: { stepId: 'build', at: AT } }, 'Build')).toEqual({
      kind: 'cleared',
      stepId: 'build',
      title: 'Back on its own',
      text: 'The agent picked up again at 14:09. Nothing to do.',
    })
  })

  it('shows nothing with nothing paused', () => {
    expect(agentPauseStepView({}, 'Build')).toBeUndefined()
  })
})
