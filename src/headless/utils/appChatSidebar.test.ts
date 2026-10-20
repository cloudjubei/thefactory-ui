import { describe, expect, it } from 'vitest'
import { parseAppChatSidebar } from './appChatSidebar'

describe('parseAppChatSidebar', () => {
  it('reads the run whose chat the app asks for, trimmed', () => {
    expect(parseAppChatSidebar({ runId: ' 8387be66 ' })).toEqual({ runId: '8387be66' })
  })

  it('reads a message to send into that run’s chat, trimmed', () => {
    expect(parseAppChatSidebar({ runId: 'r', message: ' Add it. ' })).toEqual({
      runId: 'r',
      message: 'Add it.',
    })
  })

  it('drops a message when no run is named, since only a run’s chat takes one', () => {
    expect(parseAppChatSidebar({ message: 'Add it.' })).toEqual({})
  })

  it('drops an empty message', () => {
    expect(parseAppChatSidebar({ runId: 'r', message: '  ' })).toEqual({ runId: 'r' })
  })

  it.each([undefined, null, 'r', [], {}, { runId: ' ' }, { runId: 7 }])(
    'asks for the project’s chat when %j names no run',
    (payload) => {
      expect(parseAppChatSidebar(payload)).toEqual({})
    },
  )
})
