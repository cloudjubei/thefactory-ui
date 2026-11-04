import type {
  ListChatToolCatalogData,
  ListChatToolCatalogResponse,
} from '../headless/api/generated/types.gen'
import { FAKE_CHAT_TOOLS_BY_SCOPE, FAKE_TRANSPORT_TOOLS } from './fixtures/chatToolCatalog'
import type { FakeChatToolScope } from './fakeBackendTypes'

type ChatToolCatalogQuery = NonNullable<ListChatToolCatalogData['query']>

/**
 * The tool groups a chat context is offered, decided as the real assembly decides
 * them: from the context's type and the project or group it names, so two chats
 * of one type can differ.
 */
export function chatToolScopesOf(query: ChatToolCatalogQuery): FakeChatToolScope[] {
  const { type, projectId, groupId } = query
  if (!type) return []
  const isRun = type.startsWith('AGENT_RUN_')
  const shared: FakeChatToolScope[] = isRun ? ['common'] : ['common', 'messaging']
  if (projectId) return [...shared, 'project', isRun ? 'run' : 'work']
  if (type === 'GENERAL' && !groupId) return [...shared, 'global']
  return groupId ? [...shared, 'group'] : shared
}

/** The rows `GET /tools/chat-catalog` answers: the transport's, then the context's, each tool once. */
export function fakeChatToolCatalog(query: ChatToolCatalogQuery): ListChatToolCatalogResponse {
  const rows = [
    ...FAKE_TRANSPORT_TOOLS[query.runner ?? 'api'],
    ...chatToolScopesOf(query).flatMap((scope) => FAKE_CHAT_TOOLS_BY_SCOPE[scope]),
  ]
  return [...new Map(rows.map((row) => [row.name, row])).values()]
}
