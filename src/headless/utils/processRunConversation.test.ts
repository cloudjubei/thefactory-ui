import { describe, expect, it } from 'vitest'
import type { ProcessRun } from 'thefactory-tools/types'

import {
  isRunChatStep,
  runConversationOpenKey,
  runConversationView,
} from './processRunConversation'
import { RUN_CONVERSATION_COPY } from './processRunConversationConstants'

const STEPS = [
  { id: 'review', name: 'Review', kind: 'agent', inChat: true },
  { id: 'approval', name: 'Your approval', kind: 'gate' },
  { id: 'update-branches', name: 'Bring the base in', kind: 'action' },
]

const run = (over: Partial<ProcessRun> = {}, steps: unknown[] = STEPS): ProcessRun =>
  ({
    id: 'run-1',
    status: 'running',
    cursor: { stepId: 'review', iteration: 0 },
    plan: { steps, loops: [] },
    ledger: [],
    ...over,
  }) as unknown as ProcessRun

describe('isRunChatStep', () => {
  it('is a step that works as turns of the run’s own chat', () => {
    expect(isRunChatStep(run(), 'review')).toBe(true)
    expect(isRunChatStep(run(), 'approval')).toBe(false)
    expect(isRunChatStep(run(), 'update-branches')).toBe(false)
    expect(isRunChatStep(run(), 'gone')).toBe(false)
  })

  it('is no step of a run that works in agent runs of their own', () => {
    const own = run({}, [{ id: 'build', name: 'Build', kind: 'agent' }])
    expect(isRunChatStep(own, 'build')).toBe(false)
  })
})

describe('runConversationView', () => {
  it('is nothing for a run with no step in its chat, whatever waits there', () => {
    const own = run({ cursor: { stepId: 'build', iteration: 0 } } as never, [
      { id: 'build', name: 'Build', kind: 'agent' },
    ])
    expect(runConversationView(own, 0)).toBeUndefined()
    expect(runConversationView(own, 2)).toBeUndefined()
  })

  it('says the step working in the chat, due while it works', () => {
    expect(runConversationView(run(), 0)).toEqual({
      stepId: 'review',
      title: 'Review',
      state: 'working',
      line: RUN_CONVERSATION_COPY.working,
      asks: 0,
      due: true,
    })
  })

  it('says an ask waiting in the chat first, on whatever step the run is', () => {
    expect(runConversationView(run(), 1)).toEqual({
      stepId: 'review',
      title: 'Review',
      state: 'asks',
      line: RUN_CONVERSATION_COPY.asks(1),
      asks: 1,
      due: true,
    })
    const fixing = run({ cursor: { stepId: 'update-branches', iteration: 0 } } as never)
    expect(runConversationView(fixing, 2)).toMatchObject({
      stepId: 'review',
      state: 'asks',
      line: RUN_CONVERSATION_COPY.asks(2),
      due: true,
    })
  })

  it('is there but not due once the run is past the step, stopped or ended', () => {
    const idle = {
      stepId: 'review',
      title: 'Review',
      state: 'idle',
      line: RUN_CONVERSATION_COPY.idle,
      asks: 0,
      due: false,
    }
    const past = run({ cursor: { stepId: 'update-branches', iteration: 0 } } as never)
    expect(runConversationView(past, 0)).toEqual(idle)
    expect(runConversationView(run({ status: 'parked' }), 0)).toEqual(idle)
    expect(runConversationView(run({ status: 'succeeded' }), 0)).toEqual(idle)
  })
})

describe('runConversationOpenKey', () => {
  it('names each time the conversation falls due, so it opens once for it', () => {
    expect(runConversationOpenKey(run(), 0)).toBe('run-1:working:review:0')
    expect(
      runConversationOpenKey(run({ cursor: { stepId: 'review', iteration: 1 } } as never), 0),
    ).toBe('run-1:working:review:1')
    expect(runConversationOpenKey(run(), 1)).toBe('run-1:asks')
    expect(runConversationOpenKey(run({ status: 'parked' }), 3)).toBe('run-1:asks')
  })

  it('is nothing while it is not due', () => {
    expect(runConversationOpenKey(run({ status: 'parked' }), 0)).toBeUndefined()
    expect(
      runConversationOpenKey(run({}, [{ id: 'review', name: 'Review', kind: 'agent' }]), 4),
    ).toBeUndefined()
  })
})
