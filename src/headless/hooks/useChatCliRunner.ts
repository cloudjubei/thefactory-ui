import { useCallback } from 'react'
import {
  attachChatCliRunner,
  detachChatCliRunner,
  type ChatCliRunner,
  type ChatContext,
} from '../api/generated'
import { useChats } from '../contexts/createChatsContext'

export type UseChatCliRunner = {
  /** The chat's CLI binding, or `undefined` when the chat is API-backed. */
  cliRunner: ChatCliRunner | undefined
  /** Bind a CLI runner to the chat (marks it CLI-backed). */
  attach: (input: ChatCliRunner) => Promise<void>
  /** Clear the binding (reverts the chat to API-backed). */
  detach: () => Promise<void>
}

/**
 * Per-chat CLI-runner binding. Reads the persisted `cliRunner` off the chat and
 * exposes attach/detach that delegate to the backend and refresh the chats list
 * so the binding re-reads. Platform-agnostic — shared by all three clients.
 */
export function useChatCliRunner(ctx: ChatContext): UseChatCliRunner {
  const { getChat, refresh } = useChats()
  const cliRunner = getChat(ctx)?.cliRunner ?? undefined

  const attach = useCallback(
    async (input: ChatCliRunner) => {
      await attachChatCliRunner({ body: { context: ctx, cliRunner: input }, throwOnError: true })
      await refresh()
    },
    [ctx, refresh],
  )

  const detach = useCallback(async () => {
    await detachChatCliRunner({ body: { context: ctx }, throwOnError: true })
    await refresh()
  }, [ctx, refresh])

  return { cliRunner, attach, detach }
}
