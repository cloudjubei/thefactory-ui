import type { ChatContextCheckpointEvent } from 'thefactory-tools/types'

import type { ChatContextReadout, ContextFillReadout } from '../../headless/api/generated'

/** What the tools store after a turn: 84k of a 200k window. */
export const fakeContextFill = (over: Partial<ContextFillReadout> = {}): ContextFillReadout => ({
  tokensUsed: 84_000,
  windowTokens: 200_000,
  fillFraction: 0.42,
  windowSource: 'catalogue',
  source: 'recorded-usage',
  turnsSinceLastContextUpdate: 1,
  ...over,
})

export const FAKE_CONTEXT_READOUT: ChatContextReadout = {
  turnsSinceLastContextUpdate: 1,
  notesUpdatedAt: '2026-11-05T09:58:00.000Z',
  contextFill: fakeContextFill(),
}

/** A chat's hidden checkpoints, as `chats:context-checkpoint` tells them. */
export const FAKE_CHAT_CHECKPOINTS: readonly ChatContextCheckpointEvent[] = [
  {
    phase: 'started',
    chatContextId: 'project_p1',
    reason: 'end-of-turn',
    at: '2026-11-05T09:58:00.000Z',
  },
  {
    phase: 'finished',
    chatContextId: 'project_p1',
    reason: 'end-of-turn',
    outcome: 'finished',
    at: '2026-11-05T09:58:12.000Z',
  },
]
