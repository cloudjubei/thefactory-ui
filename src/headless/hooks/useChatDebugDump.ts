import { useCallback, useEffect, useMemo, useState } from 'react'
import { getChatContextKey } from 'thefactory-tools/utils'
import {
  getChatContextReadout,
  listCliAgentRuns,
  type ChatContext,
  type ChatContextReadout,
  type CliRun,
} from '../api/generated'
import { extractErrorMessage } from '../api/errorMessage'
import { useAppSettings } from '../contexts/AppSettingsContext'
import { useChats } from '../contexts/createChatsContext'
import {
  buildChatDebugDump,
  chatDebugContextLine,
  serializeChatDebugDump,
} from '../utils/chatDebugDump'
import type { ChatDebugDump } from '../utils/chatDebugDumpTypes'

export type UseChatDebugDump = {
  dump?: ChatDebugDump
  /** The dump pretty-printed — what the viewer shows and the clipboard receives. */
  json: string
  /** The context upkeep's line, when there is anything to say. */
  contextLine?: string
  byteSize: number
  loading: boolean
  error?: string
  refresh: () => void
}

/**
 * Assemble the one-document diagnostic for a chat: its stored messages, every
 * CLI run the backend has for this chat context (raw transcripts included), and
 * the normalized steps + derived messages those transcripts render as.
 *
 * Gathering is gated on `enabled` so a closed viewer neither fetches nor
 * re-serializes — the document is a snapshot, deliberately not a live feed, so
 * what the user copies is what they were looking at.
 */
export function useChatDebugDump(ctx: ChatContext, enabled: boolean): UseChatDebugDump {
  const { getChat, getChatContextCheckpoints } = useChats()
  const showThinking = useAppSettings().settings.userPreferences.cliShowThinking ?? true
  const chatContextId = getChatContextKey(ctx)
  const [runs, setRuns] = useState<CliRun[]>([])
  const [contextReadout, setContextReadout] = useState<ChatContextReadout>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setLoading(true)
    setError(undefined)
    const load = async () => {
      try {
        const [{ data }, readout] = await Promise.all([
          listCliAgentRuns({ query: { chatContextId }, throwOnError: true }),
          getChatContextReadout({ body: { context: ctx }, throwOnError: true }).catch(
            () => undefined,
          ),
        ])
        if (cancelled) return
        setRuns(data)
        setContextReadout(readout?.data)
      } catch (err) {
        if (cancelled) return
        setRuns([])
        setError(extractErrorMessage(err, 'Could not load this chat’s CLI runs.'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
    // `ctx` is rebuilt by hosts on every render; its key is the identity that matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, chatContextId, reloadToken])

  const chat = enabled ? getChat(ctx) : null

  const dump = useMemo(
    () =>
      enabled
        ? buildChatDebugDump({
            context: ctx,
            chat,
            runs,
            showThinking,
            ...(error ? { runsError: error } : {}),
            ...(contextReadout ? { contextReadout } : {}),
            contextCheckpoints: getChatContextCheckpoints(ctx),
          })
        : undefined,
    // `ctx` is rebuilt by hosts on every render; its key is the identity that matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      enabled,
      chatContextId,
      chat,
      runs,
      showThinking,
      error,
      contextReadout,
      reloadToken,
      getChatContextCheckpoints,
    ],
  )

  const serialized = useMemo(
    () => (dump ? serializeChatDebugDump(dump) : { json: '', byteSize: 0 }),
    [dump],
  )

  const refresh = useCallback(() => setReloadToken((n) => n + 1), [])

  const contextLine = dump ? chatDebugContextLine(dump) : undefined

  return {
    ...(dump ? { dump } : {}),
    json: serialized.json,
    ...(contextLine ? { contextLine } : {}),
    byteSize: serialized.byteSize,
    loading,
    ...(error ? { error } : {}),
    refresh,
  }
}
