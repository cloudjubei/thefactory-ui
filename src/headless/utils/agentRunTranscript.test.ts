import { describe, expect, it } from 'vitest'
import { getChatContextKey } from 'thefactory-tools/utils'
import type { ChatContext } from 'thefactory-tools/types'

import { agentNeverStartedNote, isAgentRunChatKey } from './agentRunTranscript'

describe('agentNeverStartedNote', () => {
  it('says the agent never started, with the reason the host stopped it on', () => {
    expect(
      agentNeverStartedNote({ agentNotStarted: 'the feature has no acceptance criteria' }),
    ).toBe('The agent never started — the feature has no acceptance criteria')
  })

  it('trims the reason, and reads without one when the host gave none', () => {
    expect(agentNeverStartedNote({ agentNotStarted: '  no workspace \n' })).toBe(
      'The agent never started — no workspace',
    )
    expect(agentNeverStartedNote({ agentNotStarted: '' })).toBe('The agent never started.')
    expect(agentNeverStartedNote({ agentNotStarted: '   ' })).toBe('The agent never started.')
  })

  it('is absent for an attempt whose agent started, and without an attempt', () => {
    expect(agentNeverStartedNote({})).toBeUndefined()
    expect(agentNeverStartedNote({ agentNotStarted: undefined })).toBeUndefined()
    expect(agentNeverStartedNote(undefined)).toBeUndefined()
  })
})

describe('isAgentRunChatKey', () => {
  const key = (c: ChatContext) => getChatContextKey(c)

  it('is true for a story agent run’s chat and a feature agent run’s chat', () => {
    expect(
      isAgentRunChatKey(
        key({ type: 'AGENT_RUN_STORY', projectId: 'p', storyId: 's', agentRunId: 'r' }),
      ),
    ).toBe(true)
    expect(
      isAgentRunChatKey(
        key({
          type: 'AGENT_RUN_FEATURE',
          projectId: 'p',
          storyId: 's',
          featureId: 'f',
          agentRunId: 'r',
        }),
      ),
    ).toBe(true)
  })

  it('is false for a person’s chats', () => {
    expect(isAgentRunChatKey(key({ type: 'PROJECT', projectId: 'p' }))).toBe(false)
    expect(isAgentRunChatKey(key({ type: 'STORY', projectId: 'p', storyId: 's' }))).toBe(false)
    expect(
      isAgentRunChatKey(key({ type: 'FEATURE', projectId: 'p', storyId: 's', featureId: 'f' })),
    ).toBe(false)
  })

  it('is false for no key or one that is not a chat key', () => {
    expect(isAgentRunChatKey(undefined)).toBe(false)
    expect(isAgentRunChatKey('')).toBe(false)
    expect(isAgentRunChatKey('chat-1')).toBe(false)
  })
})
