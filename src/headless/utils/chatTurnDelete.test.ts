import { describe, expect, it } from 'vitest'

import { isInDeleteRange, lastMessageDeleteFromIndex } from './chatTurnDelete'

const msgs = (...roles: string[]) => roles.map((role) => ({ role }))

describe('lastMessageDeleteFromIndex', () => {
  it('takes only the last message when it is not a tool result', () => {
    expect(lastMessageDeleteFromIndex(msgs('user', 'assistant'))).toBe(1)
  })

  it('takes a trailing tool run TOGETHER with the assistant that produced it', () => {
    // Half a tool round-trip is not a state the model can resume from.
    expect(lastMessageDeleteFromIndex(msgs('user', 'assistant', 'tool', 'tool'))).toBe(1)
  })

  it('takes a single trailing tool result with its assistant', () => {
    expect(lastMessageDeleteFromIndex(msgs('user', 'assistant', 'tool'))).toBe(1)
  })

  it('never reaches back past the assistant into the user message', () => {
    // Deleting a turn removes the reply and leaves the request that prompted it.
    const from = lastMessageDeleteFromIndex(msgs('user', 'assistant', 'tool'))
    expect(from).toBe(1)
    expect(from).toBeGreaterThan(0)
  })

  it('takes only the tool run when no assistant precedes it', () => {
    expect(lastMessageDeleteFromIndex(msgs('tool', 'tool'))).toBe(0)
  })

  it('stops at a user message rather than swallowing it before a tool run', () => {
    expect(lastMessageDeleteFromIndex(msgs('assistant', 'user', 'tool'))).toBe(2)
  })

  it('is undefined for an empty chat', () => {
    expect(lastMessageDeleteFromIndex([])).toBeUndefined()
  })

  it('takes the whole list when every message is a tool result', () => {
    expect(lastMessageDeleteFromIndex(msgs('tool'))).toBe(0)
  })

  it('takes only the background results the host posted after a tool tail, never the tail', () => {
    const results = {
      role: 'user',
      backgroundResults: [{ jobId: 'job-1', toolName: 'askKnowledge', status: 'succeeded' }],
    }
    const chat = [...msgs('user', 'assistant', 'tool'), results]
    expect(lastMessageDeleteFromIndex(chat)).toBe(3)
    expect(lastMessageDeleteFromIndex(chat.slice(0, 3))).toBe(1)
  })

  describe('under messages no client draws', () => {
    const card = { role: 'assistant', openChangesCard: { kind: 'waiting' } }

    it('takes the last drawn message together with the undrawn ones under it', () => {
      const turn = { role: 'assistant', cliRunId: 'r0' }
      expect(lastMessageDeleteFromIndex([{ role: 'user' }, turn, card, card])).toBe(1)
    })

    it('takes a tool tail with its assistant and the undrawn ones under it', () => {
      expect(lastMessageDeleteFromIndex([...msgs('user', 'assistant', 'tool'), card])).toBe(1)
    })

    it('takes the whole list when no message is drawn', () => {
      expect(lastMessageDeleteFromIndex([card])).toBe(0)
    })
  })
})

describe('isInDeleteRange', () => {
  it('lights every row from the start of the range to the end', () => {
    expect(isInDeleteRange(1, 1, true)).toBe(true)
    expect(isInDeleteRange(3, 1, true)).toBe(true)
  })

  it('leaves rows before the range alone', () => {
    expect(isInDeleteRange(0, 1, true)).toBe(false)
  })

  it('lights nothing while the control is not hovered', () => {
    expect(isInDeleteRange(2, 1, false)).toBe(false)
  })

  it('lights nothing when there is no range', () => {
    expect(isInDeleteRange(0, undefined, true)).toBe(false)
  })
})
