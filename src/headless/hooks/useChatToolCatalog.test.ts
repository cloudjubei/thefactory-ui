import { describe, expect, it } from 'vitest'
import type { ChatContext } from '../api/generated'
import { chatToolCatalogQueryOf } from './useChatToolCatalog'

describe('chatToolCatalogQueryOf', () => {
  it('passes the chat context fields the catalogue query accepts and omits timestamp', () => {
    const context: ChatContext = {
      type: 'FEATURE',
      projectId: 'p1',
      storyId: 's1',
      featureId: 'f1',
      timestamp: '2026-10-30T12:00:00Z',
    }
    expect(chatToolCatalogQueryOf(context, 'cli')).toEqual({
      runner: 'cli',
      type: 'FEATURE',
      projectId: 'p1',
      storyId: 's1',
      featureId: 'f1',
    })
  })

  it('keeps only the ids the context carries', () => {
    const context: ChatContext = { type: 'PROJECT', projectId: 'p1' }
    expect(chatToolCatalogQueryOf(context, 'api')).toEqual({
      runner: 'api',
      type: 'PROJECT',
      projectId: 'p1',
    })
  })

  it('names a run chat by agentRunId without inventing other fields', () => {
    const context: ChatContext = {
      type: 'AGENT_RUN_FEATURE',
      projectId: 'p1',
      storyId: 's1',
      featureId: 'f1',
      agentRunId: 'run-9',
    }
    expect(chatToolCatalogQueryOf(context, 'api')).toEqual({
      runner: 'api',
      type: 'AGENT_RUN_FEATURE',
      projectId: 'p1',
      storyId: 's1',
      featureId: 'f1',
      agentRunId: 'run-9',
    })
  })
})
