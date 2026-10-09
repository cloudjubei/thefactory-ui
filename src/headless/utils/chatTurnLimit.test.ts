import { describe, expect, it } from 'vitest'
import { applyChatTurnLimit, buildChatTurnLimit } from './chatTurnLimit'
import { CHAT_TURN_LIMIT_START } from './chatTurnLimitConstants'

describe('buildChatTurnLimit', () => {
  it('reads a chat that never set the switch as unlimited', () => {
    expect(buildChatTurnLimit(undefined)).toEqual({
      limited: false,
      maxTurns: CHAT_TURN_LIMIT_START,
    })
    expect(buildChatTurnLimit({ maxTurns: 35 })).toEqual({ limited: false, maxTurns: 35 })
  })

  it('shows a limited chat its own number of turns', () => {
    expect(buildChatTurnLimit({ limitTurns: true, maxTurns: 35 })).toEqual({
      limited: true,
      maxTurns: 35,
    })
  })

  it('keeps the number of a chat whose limit is off', () => {
    expect(buildChatTurnLimit({ limitTurns: false, maxTurns: 35 })).toEqual({
      limited: false,
      maxTurns: 35,
    })
  })
})

describe('applyChatTurnLimit', () => {
  it('switches the limit on at the chat’s own number', () => {
    expect(applyChatTurnLimit(true, { limitTurns: false, maxTurns: 35 })).toEqual({
      limitTurns: true,
      maxTurns: 35,
    })
  })

  it('switches the limit on at the starting number when the chat has none', () => {
    expect(applyChatTurnLimit(true, undefined)).toEqual({
      limitTurns: true,
      maxTurns: CHAT_TURN_LIMIT_START,
    })
  })

  it('switches the limit off and keeps the number for when it comes back on', () => {
    expect(applyChatTurnLimit(false, { limitTurns: true, maxTurns: 35 })).toEqual({
      limitTurns: false,
      maxTurns: 35,
    })
  })
})
