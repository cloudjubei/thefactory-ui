import { describe, expect, it } from 'vitest'
import { chatCloseAction } from './chatCloseAction'
import type { ChatContext } from '../api/generated'

const ctx = (type: string) => ({ type }) as Pick<ChatContext, 'type'>
const open = { locked: false, closed: false }

describe('chatCloseAction', () => {
  it('NEVER offers clear on an agent-run chat — those messages are the record', () => {
    for (const type of ['AGENT_RUN_STORY', 'AGENT_RUN_FEATURE']) {
      const action = chatCloseAction(ctx(type), open)
      expect(action.kind).toBe('consolidate')
      expect(action.confirm).toMatch(/nothing is deleted/i)
    }
  })

  it('keeps clear for an ordinary chat', () => {
    expect(chatCloseAction(ctx('USER'), open).kind).toBe('clear')
  })

  it('reads as already done once the chat is locked', () => {
    const action = chatCloseAction(ctx('AGENT_RUN_STORY'), { locked: true, closed: true })
    expect(action.done).toBe(true)
    expect(action.label).toBe('Closed')
  })

  it('promises history is kept, not that it is destroyed', () => {
    // The confirm text is the only thing the user reads before committing.
    const archive = chatCloseAction(ctx('AGENT_RUN_STORY'), open)
    expect(archive.confirm).not.toMatch(/cannot be undone/i)
    expect(chatCloseAction(ctx('USER'), open).confirm).toMatch(/cannot be undone/i)
  })
})
