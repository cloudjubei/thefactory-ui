import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { listChatToolCatalog } from '../api'
import type { ChatContext, ListChatToolCatalogData } from '../api/generated'
import { useAuth } from '../api/AuthContext'
import { LiveResourceStore } from '../utils/liveResourceStore'
import { CHAT_TOOL_CATALOG_LINGER_MS } from '../utils/chatToolTogglesConstants'
import type { ChatToolCatalogEntry, ChatToolRunner } from '../utils/chatToolTogglesTypes'

const EMPTY: ChatToolCatalogEntry[] = []

const lastRead = new Map<string, ChatToolCatalogEntry[]>()

/** Catalogue query fields: chat context (no timestamp) plus the transport. */
type CatalogQuery = NonNullable<ListChatToolCatalogData['query']>

/**
 * The GET /tools/chat-catalog query for this chat: context fields the
 * dispatcher builds host tools from, and the transport. Timestamp is omitted —
 * it does not change which tools a chat is offered.
 */
export function chatToolCatalogQueryOf(context: ChatContext, runner: ChatToolRunner): CatalogQuery {
  const query: CatalogQuery = { runner, type: context.type }
  if (context.groupId !== undefined) query.groupId = context.groupId
  if (context.projectId !== undefined) query.projectId = context.projectId
  if (context.storyId !== undefined) query.storyId = context.storyId
  if (context.featureId !== undefined) query.featureId = context.featureId
  if (context.agentRunId !== undefined) query.agentRunId = context.agentRunId
  if (context.topicId !== undefined) query.topicId = context.topicId
  if (context.featureRequestId !== undefined) query.featureRequestId = context.featureRequestId
  return query
}

function catalogKeyOf(query: CatalogQuery): string {
  return [
    query.runner ?? '',
    query.type ?? '',
    query.groupId ?? '',
    query.projectId ?? '',
    query.storyId ?? '',
    query.featureId ?? '',
    query.agentRunId ?? '',
    query.topicId ?? '',
    query.featureRequestId ?? '',
  ].join('|')
}

function catalogQueryOfKey(key: string): CatalogQuery {
  const [
    runner = '',
    type = '',
    groupId = '',
    projectId = '',
    storyId = '',
    featureId = '',
    agentRunId = '',
    topicId = '',
    featureRequestId = '',
  ] = key.split('|')
  return {
    ...(runner === 'api' || runner === 'cli' ? { runner } : {}),
    ...(type
      ? {
          type: type as NonNullable<CatalogQuery['type']>,
        }
      : {}),
    ...(groupId ? { groupId } : {}),
    ...(projectId ? { projectId } : {}),
    ...(storyId ? { storyId } : {}),
    ...(featureId ? { featureId } : {}),
    ...(agentRunId ? { agentRunId } : {}),
    ...(topicId ? { topicId } : {}),
    ...(featureRequestId ? { featureRequestId } : {}),
  }
}

const catalogs = new LiveResourceStore<ChatToolCatalogEntry[]>({
  load: async (key) => {
    const { data } = await listChatToolCatalog({
      query: catalogQueryOfKey(key),
      throwOnError: true,
    })
    return data
  },
  lingerMs: CHAT_TOOL_CATALOG_LINGER_MS,
  recall: (key) => lastRead.get(key),
  remember: (key, catalog) => lastRead.set(key, catalog),
})

/**
 * The tools a chat can be OFFERED, as the backend assembles them from the same
 * host-tool set the dispatcher registers for this chat context — plus the
 * transport builtins. Sourcing the settings list from the chat's own stored
 * allowlist instead — what every client used to do — makes a tool the chat
 * does not already carry impossible to switch on.
 *
 * One read per chat context and transport: the settings panel each open chat
 * mounts shares it, and a chat reopened soon after reads nothing. Rows the
 * assembly cannot leave off carry `alwaysOn`, so their switches stay locked.
 */
export function useChatToolCatalog(
  context: ChatContext,
  runner: ChatToolRunner,
): {
  catalog: ChatToolCatalogEntry[]
  isLoaded: boolean
  loadError: Error | null
  refresh: () => Promise<void>
} {
  const { token } = useAuth()
  const key = catalogKeyOf(chatToolCatalogQueryOf(context, runner))

  useEffect(() => {
    if (!token) return
    return catalogs.retain(key)
  }, [key, token])

  const snapshot = useSyncExternalStore(
    useCallback((listener: () => void) => catalogs.listen(key, listener), [key]),
    () => catalogs.snapshot(key),
    () => catalogs.snapshot(key),
  )
  const refresh = useCallback(() => catalogs.refresh(key), [key])

  return useMemo(
    () => ({
      catalog: snapshot.data ?? EMPTY,
      isLoaded: snapshot.settled,
      loadError: snapshot.error,
      refresh,
    }),
    [snapshot, refresh],
  )
}
