import { describe, it, expect } from 'vitest'
import { isGeneralGroupChat, isGeneralProjectChat } from './chatContextGuards'

describe('isGeneralProjectChat', () => {
  it('is true only for a bare project context', () => {
    expect(isGeneralProjectChat({ projectId: 'p1' })).toBe(true)
  })

  it('is false for every narrower project scope', () => {
    expect(isGeneralProjectChat({ projectId: 'p1', topicId: 't' })).toBe(false)
    expect(isGeneralProjectChat({ projectId: 'p1', storyId: 's' })).toBe(false)
    expect(isGeneralProjectChat({ projectId: 'p1', storyId: 's', featureId: 'f' })).toBe(false)
    expect(isGeneralProjectChat({ projectId: 'p1', featureRequestId: 'fr' })).toBe(false)
    expect(isGeneralProjectChat({ projectId: 'p1', groupId: 'g' })).toBe(false)
  })

  it('is false for an agent-run context even when its stamped type lied as PROJECT', () => {
    // The observed bug: `{type:'PROJECT', projectId, storyId, agentRunId}` was
    // persisted for an agent-run chat, and the type-based delete guard refused
    // to delete it ("The General chat cannot be deleted"). The fields say what
    // it is; the guard must read them.
    expect(isGeneralProjectChat({ projectId: 'p1', storyId: 's1', agentRunId: 'r1' })).toBe(false)
  })

  it('tolerates null field values from generated API types', () => {
    expect(
      isGeneralProjectChat({ projectId: 'p1', storyId: null, agentRunId: null, topicId: null }),
    ).toBe(true)
  })
})

describe('isGeneralGroupChat', () => {
  it('is true for a bare group context and false for its topics', () => {
    expect(isGeneralGroupChat({ groupId: 'g1' })).toBe(true)
    expect(isGeneralGroupChat({ groupId: 'g1', topicId: 't1' })).toBe(false)
    expect(isGeneralGroupChat({ projectId: 'p1' })).toBe(false)
  })
})
