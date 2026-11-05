import { describe, expect, it } from 'vitest'
import type { ChatContextCheckpointEvent } from 'thefactory-tools/types'

import { ChatContextCheckpointLog } from './ChatContextCheckpointLog'
import { CHAT_CONTEXT_CHECKPOINT_LOG_LIMIT } from './chatContextCheckpointLogConstants'

const event = (over: Partial<ChatContextCheckpointEvent> = {}): ChatContextCheckpointEvent => ({
  phase: 'started',
  chatContextId: 'a',
  reason: 'end-of-turn',
  at: '2026-11-05T10:00:00.000Z',
  ...over,
})

describe('ChatContextCheckpointLog', () => {
  it('has nothing for a chat it has not heard of', () => {
    expect(new ChatContextCheckpointLog().of('a')).toEqual([])
  })

  it('keeps each chat’s checkpoints apart, in the order they came', () => {
    const log = new ChatContextCheckpointLog()
    const first = event()
    const other = event({ chatContextId: 'b' })
    const last = event({ phase: 'finished', outcome: 'finished' })
    log.record(first)
    log.record(other)
    log.record(last)
    expect(log.of('a')).toEqual([first, last])
    expect(log.of('b')).toEqual([other])
  })

  it('keeps only the latest ones of a chat', () => {
    const log = new ChatContextCheckpointLog()
    for (let i = 0; i <= CHAT_CONTEXT_CHECKPOINT_LOG_LIMIT; i++) {
      log.record(event({ at: String(i) }))
    }
    const kept = log.of('a')
    expect(kept).toHaveLength(CHAT_CONTEXT_CHECKPOINT_LOG_LIMIT)
    expect(kept[0]?.at).toBe('1')
    expect(kept.at(-1)?.at).toBe(String(CHAT_CONTEXT_CHECKPOINT_LOG_LIMIT))
  })

  it('hands out a copy: reading never changes what it holds', () => {
    const log = new ChatContextCheckpointLog()
    log.record(event())
    log.of('a').pop()
    expect(log.of('a')).toHaveLength(1)
  })
})
