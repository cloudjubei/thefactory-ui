import { describe, expect, it } from 'vitest'
import { groupChats } from './chatGrouping'

type TestChat = {
  id: string
  context: { type: string; storyId?: string; featureId?: string }
  updatedAt?: string
}

const chats: TestChat[] = [
  { id: 'c-proj', context: { type: 'PROJECT' } },
  { id: 'c-t1', context: { type: 'PROJECT_TOPIC' }, updatedAt: '2026-01-01' },
  { id: 'c-t2', context: { type: 'PROJECT_TOPIC' }, updatedAt: '2026-03-01' },
  { id: 'c-s1', context: { type: 'STORY', storyId: 'S1' } },
  { id: 'c-s2', context: { type: 'STORY', storyId: 'S2' } },
  { id: 'c-f1', context: { type: 'FEATURE', storyId: 'S1', featureId: 'F1' } },
  { id: 'c-ar', context: { type: 'AGENT_RUN_STORY', storyId: 'S1' } },
  { id: 'c-arf', context: { type: 'AGENT_RUN_FEATURE', storyId: 'S2', featureId: 'F9' } },
]

describe('groupChats', () => {
  it('ignores PROJECT chats and sorts topics by updatedAt descending', () => {
    const { topics } = groupChats(chats, [])
    expect(topics.map((c) => c.id)).toEqual(['c-t2', 'c-t1'])
  })

  it('orders story buckets by storyOrder, with unknown stories last', () => {
    const { byStory } = groupChats(chats, [{ id: 'S2' }, { id: 'S1' }])
    expect(byStory.map((g) => g.storyId)).toEqual(['S2', 'S1'])
  })

  it('buckets story chats, feature chats and agent runs per story', () => {
    const { byStory } = groupChats(chats, [{ id: 'S1' }, { id: 'S2' }])
    const s1 = byStory.find((g) => g.storyId === 'S1')!
    expect(s1.storyChats.map((c) => c.id)).toEqual(['c-s1'])
    expect(s1.agentRuns.map((c) => c.id)).toEqual(['c-ar'])
    expect(s1.featureGroups).toHaveLength(1)
    expect(s1.featureGroups[0]).toEqual(expect.objectContaining({ featureId: 'F1' }))
    expect(s1.featureGroups[0].chats.map((c) => c.id)).toEqual(['c-f1'])

    const s2 = byStory.find((g) => g.storyId === 'S2')!
    // A feature-scoped agent run still buckets under the story's agentRuns.
    expect(s2.agentRuns.map((c) => c.id)).toEqual(['c-arf'])
    expect(s2.featureGroups).toHaveLength(0)
  })

  it('buckets FEATURE_REQUEST chats off the story tree, newest first', () => {
    const frChats: TestChat[] = [
      { id: 'c-fr1', context: { type: 'FEATURE_REQUEST' }, updatedAt: '2026-01-01' },
      { id: 'c-fr2', context: { type: 'FEATURE_REQUEST' }, updatedAt: '2026-05-01' },
      { id: 'c-s', context: { type: 'STORY', storyId: 'S1' } },
    ]
    const { featureRequests, byStory, topics } = groupChats(frChats, [])
    expect(featureRequests.map((c) => c.id)).toEqual(['c-fr2', 'c-fr1'])
    expect(topics).toHaveLength(0)
    expect(byStory.map((g) => g.storyId)).toEqual(['S1'])
  })

  it('returns empty groups for no chats', () => {
    expect(groupChats([], [{ id: 'S1' }])).toEqual({ topics: [], byStory: [], featureRequests: [] })
  })
})
