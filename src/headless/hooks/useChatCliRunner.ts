import { useCallback } from 'react'
import {
  attachChatCliRunner,
  detachChatCliRunner,
  updateChat,
  type ChatCliRunner,
  type ChatContext,
  type CliReasoningEffort,
} from '../api/generated'
import { useChats } from '../contexts/createChatsContext'

export type UseChatCliRunner = {
  /** The chat's CLI binding, or `undefined` when the chat is API-backed. */
  cliRunner: ChatCliRunner | undefined
  /** Bind a CLI runner to the chat (marks it CLI-backed). */
  attach: (input: ChatCliRunner) => Promise<void>
  /** Clear the binding (reverts the chat to API-backed). */
  detach: () => Promise<void>
  /** The chat's own effort for its API turns, or `undefined` for its config's default. */
  effort: CliReasoningEffort | undefined
  /** Set (or clear, with `undefined`) the chat's API effort. */
  setEffort: (effort: CliReasoningEffort | undefined) => Promise<void>
}

/**
 * Per-chat model binding. Reads the persisted `cliRunner` and API `effort` off
 * the chat and exposes attach/detach and the effort setter, which delegate to
 * the backend and refresh the chats list so the binding re-reads. Platform-agnostic — shared by all three clients.
 */
export function useChatCliRunner(ctx: ChatContext): UseChatCliRunner {
  const { getChat, refresh } = useChats()
  const chat = getChat(ctx)
  const cliRunner = chat?.cliRunner ?? undefined
  const effort = chat?.effort ?? undefined

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

  const setEffort = useCallback(
    async (next: CliReasoningEffort | undefined) => {
      await updateChat({
        body: { context: ctx, patch: { effort: next ?? null } },
        throwOnError: true,
      })
      await refresh()
    },
    [ctx, refresh],
  )

  return { cliRunner, attach, detach, effort, setEffort }
}
