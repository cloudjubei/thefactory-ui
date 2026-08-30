import { describe, expect, it } from 'vitest'
import { describeLastUserMessageRestart, isRestartableChatTail } from './chatMessageRestart'
import { MESSAGE_RESTART_BUSY_LABEL, MESSAGE_RESTART_LABEL } from './chatMessageRestartConstants'
import type { MessageRestartInput } from './chatMessageRestartTypes'

const base: MessageRestartInput = {
  hasRestartAction: true,
  isLast: true,
  role: 'user',
  turnInFlight: false,
}

describe('describeLastUserMessageRestart', () => {
  it('offers nothing when the host wired no restart action', () => {
    expect(describeLastUserMessageRestart({ ...base, hasRestartAction: false })).toBeUndefined()
  })

  it('offers nothing on a row that is not the last message', () => {
    expect(describeLastUserMessageRestart({ ...base, isLast: false })).toBeUndefined()
  })

  it('offers nothing on a trailing assistant reply', () => {
    expect(describeLastUserMessageRestart({ ...base, role: 'assistant' })).toBeUndefined()
  })

  it('offers nothing on a trailing system row, which is what a persisted error is', () => {
    expect(describeLastUserMessageRestart({ ...base, role: 'system' })).toBeUndefined()
  })

  it('offers nothing on a trailing tool row', () => {
    expect(describeLastUserMessageRestart({ ...base, role: 'tool' })).toBeUndefined()
  })

  it('describes the trailing user message as re-runnable', () => {
    expect(describeLastUserMessageRestart(base)).toEqual({
      label: MESSAGE_RESTART_LABEL,
      disabled: false,
    })
  })

  it('refuses while a turn is in flight, and says so', () => {
    expect(describeLastUserMessageRestart({ ...base, turnInFlight: true })).toEqual({
      label: MESSAGE_RESTART_BUSY_LABEL,
      disabled: true,
    })
  })

  it('still renders the refusal rather than hiding the control mid-turn', () => {
    expect(describeLastUserMessageRestart({ ...base, turnInFlight: true })).toBeDefined()
  })

  it('names a distinct reason when refusing, so the busy state is not silent', () => {
    expect(MESSAGE_RESTART_BUSY_LABEL).not.toBe(MESSAGE_RESTART_LABEL)
  })
})

describe('isRestartableChatTail', () => {
  it('accepts a conversation that ends on the user message', () => {
    expect(isRestartableChatTail([{ role: 'assistant' }, { role: 'user' }])).toBe(true)
  })

  it('refuses a conversation that ends on an assistant reply', () => {
    expect(isRestartableChatTail([{ role: 'user' }, { role: 'assistant' }])).toBe(false)
  })

  it('refuses a conversation that ends on a persisted error row', () => {
    expect(isRestartableChatTail([{ role: 'user' }, { role: 'system' }])).toBe(false)
  })

  it('refuses an empty conversation', () => {
    expect(isRestartableChatTail([])).toBe(false)
  })

  it('refuses a chat whose messages have not loaded', () => {
    expect(isRestartableChatTail(undefined)).toBe(false)
  })

  it('looks at the tail only, not at whether a user message appears anywhere', () => {
    expect(isRestartableChatTail([{ role: 'user' }, { role: 'user' }, { role: 'tool' }])).toBe(
      false,
    )
  })
})
