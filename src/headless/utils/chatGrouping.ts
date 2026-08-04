// Pure grouping of a project's chats into the Categories-view structure:
// topics, and per-story buckets (story chats, feature chats, agent runs).
// Shared by web's chat navigation sidebar and the native chat list so the
// two clients group identically.

export interface ChatFeatureGroup<C> {
  featureId: string
  chats: C[]
}

export interface ChatStoryGroup<C> {
  storyId: string
  storyChats: C[]
  featureGroups: ChatFeatureGroup<C>[]
  agentRuns: C[]
}

export interface GroupedChats<C> {
  topics: C[]
  byStory: ChatStoryGroup<C>[]
  /** Cross-project inbox chats (`FEATURE_REQUEST`) — project-level, off the story tree. */
  featureRequests: C[]
}

/**
 * Group a project's chats for the Categories view. `storyOrder` fixes the
 * display order of the story buckets; stories absent from it sort last.
 * `PROJECT` / `GROUP` / `GENERAL` chats are ignored — callers surface those
 * separately. Agent-run chats (story- or feature-scoped) bucket under their
 * story's `agentRuns`; `FEATURE` chats bucket under `featureGroups`.
 */
export function groupChats<
  C extends {
    context: { type: string; storyId?: string | null; featureId?: string | null }
    updatedAt?: string | null
  },
>(chats: readonly C[], storyOrder: readonly { id: string }[]): GroupedChats<C> {
  const topics: C[] = []
  const featureRequests: C[] = []
  const storyMap = new Map<string, ChatStoryGroup<C>>()

  const ensure = (storyId: string): ChatStoryGroup<C> => {
    let entry = storyMap.get(storyId)
    if (!entry) {
      entry = { storyId, storyChats: [], featureGroups: [], agentRuns: [] }
      storyMap.set(storyId, entry)
    }
    return entry
  }
  const ensureFeatureGroup = (entry: ChatStoryGroup<C>, featureId: string): ChatFeatureGroup<C> => {
    let fg = entry.featureGroups.find((f) => f.featureId === featureId)
    if (!fg) {
      fg = { featureId, chats: [] }
      entry.featureGroups.push(fg)
    }
    return fg
  }

  for (const chat of chats) {
    const ctx = chat.context
    switch (ctx.type) {
      case 'PROJECT_TOPIC':
        topics.push(chat)
        break
      case 'STORY':
        if (ctx.storyId) ensure(ctx.storyId).storyChats.push(chat)
        break
      case 'FEATURE':
        if (ctx.storyId && ctx.featureId)
          ensureFeatureGroup(ensure(ctx.storyId), ctx.featureId).chats.push(chat)
        break
      case 'AGENT_RUN_STORY':
      case 'AGENT_RUN_FEATURE':
        if (ctx.storyId) ensure(ctx.storyId).agentRuns.push(chat)
        break
      case 'FEATURE_REQUEST':
        featureRequests.push(chat)
        break
      default:
        break
    }
  }

  const storyIndex = new Map<string, number>()
  storyOrder.forEach((s, i) => storyIndex.set(s.id, i))
  const byStory = Array.from(storyMap.values()).sort((a, b) => {
    const ai = storyIndex.get(a.storyId) ?? Number.MAX_SAFE_INTEGER
    const bi = storyIndex.get(b.storyId) ?? Number.MAX_SAFE_INTEGER
    return ai - bi
  })

  topics.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
  featureRequests.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))

  return { topics, byStory, featureRequests }
}
