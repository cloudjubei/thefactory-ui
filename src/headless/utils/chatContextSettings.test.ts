import { describe, expect, it } from 'vitest'

import {
  applyChatHistoryShare,
  applyChatNotesTurns,
  buildChatContextSettings,
} from './chatContextSettings'
import {
  CHAT_HISTORY_SHARE_MAX,
  CHAT_HISTORY_SHARE_MIN,
  CHAT_NOTES_TURNS_MAX,
} from './chatContextSettingsConstants'

describe('buildChatContextSettings', () => {
  it('reads the defaults for a chat that has never set them', () => {
    expect(buildChatContextSettings(undefined)).toEqual({ historyShare: 50, notesTurns: 3 })
    expect(buildChatContextSettings({})).toEqual({ historyShare: 50, notesTurns: 3 })
  })

  it('reads a share as a percent and keeps 0 turns as off', () => {
    expect(
      buildChatContextSettings({ seedCeilingFraction: 0.25, cliContextStaleTurns: 0 }),
    ).toEqual({ historyShare: 25, notesTurns: 0 })
  })

  it('holds what the slider shows inside its range, whatever was stored', () => {
    expect(
      buildChatContextSettings({ seedCeilingFraction: 0.01, cliContextStaleTurns: 400 }),
    ).toEqual({ historyShare: CHAT_HISTORY_SHARE_MIN, notesTurns: CHAT_NOTES_TURNS_MAX })
  })
})

describe('applyChatHistoryShare', () => {
  it('writes a percent as the fraction the backend takes', () => {
    expect(applyChatHistoryShare(35)).toEqual({ seedCeilingFraction: 0.35 })
  })

  it('never writes outside what the backend accepts: above 0, at most 1', () => {
    expect(applyChatHistoryShare(0)).toEqual({ seedCeilingFraction: CHAT_HISTORY_SHARE_MIN / 100 })
    expect(applyChatHistoryShare(140)).toEqual({
      seedCeilingFraction: CHAT_HISTORY_SHARE_MAX / 100,
    })
  })
})

describe('applyChatNotesTurns', () => {
  it('writes whole turns, 0 turning it off', () => {
    expect(applyChatNotesTurns(0)).toEqual({ cliContextStaleTurns: 0 })
    expect(applyChatNotesTurns(4.6)).toEqual({ cliContextStaleTurns: 5 })
  })

  it('never writes a negative count, which the backend refuses', () => {
    expect(applyChatNotesTurns(-2)).toEqual({ cliContextStaleTurns: 0 })
  })
})
