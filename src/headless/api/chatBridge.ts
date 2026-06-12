import { createTopicChat, addChatMessages, type ChatContext } from './generated'
import { bridgeMessageName, type BridgeRequest } from '../utils/appBridge'

/**
 * Dispatch an `overseer:chat.*` bridge request on behalf of an embedded app. Returns `undefined`
 * for messages that aren't `chat.*` (so the host can compose other handlers). `chat.discuss` opens
 * a project-topic chat seeded with the app's context block — the app (e.g. the knowledge viewer)
 * turns a finding/run into a discussable topic; the host owns the bearer credential and, on the
 * returned `context`, navigates the user into the chat.
 */
export async function dispatchChatBridge(
  projectId: string | undefined,
  req: BridgeRequest,
): Promise<unknown> {
  const name = bridgeMessageName(req.type)
  if (!name.startsWith('chat.')) return undefined
  if (!projectId) throw new Error('Cannot handle a chat bridge request without an active project')

  switch (name) {
    case 'chat.discuss': {
      const payload = (req.payload ?? {}) as { title?: string; seed?: string }
      const title = (payload.title ?? '').trim() || 'Discussion'
      const created = await createTopicChat({
        body: { type: 'project', entityId: projectId, title },
        throwOnError: true,
      })
      const context = created.data.context as ChatContext
      const seed = (payload.seed ?? '').trim()
      if (seed) {
        await addChatMessages({
          body: { context, messages: [{ role: 'user', content: seed }] },
          throwOnError: true,
        })
      }
      return { context }
    }
    default:
      throw new Error(`Unknown chat bridge op: ${name}`)
  }
}
