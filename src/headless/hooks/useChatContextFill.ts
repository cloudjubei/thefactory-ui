import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChatContext } from 'thefactory-tools/types'
import { getChatContextKey, isAgentRunChatContext } from 'thefactory-tools/utils'

import { useApi } from '../api'
import { errorStatus, extractErrorMessage } from '../api/errorMessage'
import { compactChatNow, getChatContextReadout, type ChatContextReadout } from '../api/generated'
import { useChats } from '../contexts/createChatsContext'
import { chatClosure } from '../utils/chatClosure'
import {
  chatCompactLine,
  chatContextFillChip,
  chatContextReadoutOfEvent,
} from '../utils/chatContextFill'
import { CHAT_COMPACT_COPY } from '../utils/chatContextFillConstants'
import type { ChatCompactLineView, ChatContextFillView } from '../utils/chatContextFillTypes'
import { useOnWsReopen } from './useOnWsReopen'

type HeldReadout = { chatContextId: string; readout: ChatContextReadout | undefined }
type CompactState = { chatContextId: string; running: boolean; line?: ChatCompactLineView }

/**
 * How full a chat's working context is, kept current by `chats:context-readout`,
 * with Compact now where the chat can be compacted. The same on every model: a
 * chat that is not there yet, or has not finished a turn, shows nothing. While
 * Compact now runs the server holds the chat's turn, so the chat reads as working
 * and Stop reaches it through `chat-abort`.
 */
export function useChatContextFill(context: ChatContext): ChatContextFillView | undefined {
  const { ws } = useApi()
  const { abortChat, getChat } = useChats()
  const chatContextId = getChatContextKey(context)
  const contextRef = useRef(context)
  contextRef.current = context
  const [held, setHeld] = useState<HeldReadout>()
  const [compact, setCompact] = useState<CompactState>()

  const read = useCallback(() => {
    const chatKey = getChatContextKey(contextRef.current)
    let live = true
    getChatContextReadout({ body: { context: contextRef.current }, throwOnError: true })
      .then(({ data }) => {
        if (live) setHeld({ chatContextId: chatKey, readout: data })
      })
      .catch((err: unknown) => {
        if (live && errorStatus(err) === 404) {
          setHeld({ chatContextId: chatKey, readout: undefined })
        }
      })
    return () => {
      live = false
    }
  }, [])

  useEffect(() => read(), [read, chatContextId])
  useOnWsReopen(read)
  useEffect(
    () =>
      ws.on('chats:context-readout', (data: unknown) => {
        const readout = chatContextReadoutOfEvent(data, chatContextId)
        if (readout) setHeld({ chatContextId, readout })
      }),
    [ws, chatContextId],
  )

  const run = useCallback(() => {
    const target = contextRef.current
    const key = getChatContextKey(target)
    setCompact({ chatContextId: key, running: true })
    compactChatNow({ body: { context: target }, throwOnError: true })
      .then(({ data }) => {
        setCompact({ chatContextId: key, running: false, line: chatCompactLine(data) })
        const contextFill = data.readout
        if (!contextFill) return
        setHeld((now) =>
          now?.chatContextId === key && now.readout
            ? { chatContextId: key, readout: { ...now.readout, contextFill } }
            : now,
        )
      })
      .catch((err: unknown) => {
        setCompact({
          chatContextId: key,
          running: false,
          line: { text: extractErrorMessage(err, CHAT_COMPACT_COPY.failed), tone: 'failed' },
        })
      })
  }, [])

  const stop = useCallback(() => void abortChat(contextRef.current), [abortChat])

  const readout = held?.chatContextId === chatContextId ? held.readout : undefined
  const shown = compact?.chatContextId === chatContextId ? compact : undefined
  const canCompact = !isAgentRunChatContext(context) && !chatClosure(getChat(context)).locked
  return useMemo(() => {
    const chip = chatContextFillChip(readout)
    if (!chip) return undefined
    return canCompact
      ? {
          ...chip,
          compact: {
            running: shown?.running === true,
            ...(shown?.line ? { line: shown.line } : {}),
            run,
            stop,
          },
        }
      : chip
  }, [readout, shown, canCompact, run, stop])
}
