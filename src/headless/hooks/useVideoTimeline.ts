import { useCallback, useEffect, useRef, useState } from 'react'
import { getChatContextKey } from 'thefactory-tools/utils'
import { useApi } from '../api'
import { readChatVideoTimeline } from '../api/videoApi'
import type { ChatVideoAttachments, ChatVideoDigestEvent } from '../utils/videoAttachmentTypes'
import { videoTimelineOnServer, videoTimelineRefreshInMs } from '../utils/videoTimeline'
import type { ChatVideoTimeline } from '../utils/videoTimelineTypes'
import { useOnWsReopen } from './useOnWsReopen'

/**
 * A chat video's timeline while `enabled`: read when first wanted, again whenever its digest moves
 * on (`chatAttachments:digest`), when the socket comes back, and before its picture URLs run out.
 * Nothing is asked while it is not wanted.
 */
export function useVideoTimeline(
  { context, fixedTimelines }: ChatVideoAttachments,
  path: string,
  enabled: boolean,
): ChatVideoTimeline | undefined {
  const { ws, apiBaseUrl } = useApi()
  const [timeline, setTimeline] = useState<ChatVideoTimeline | undefined>()
  const contextRef = useRef(context)
  contextRef.current = context
  const contextKey = getChatContextKey(context)
  const fixed = fixedTimelines?.[path]
  const live = enabled && !fixedTimelines

  const read = useCallback(() => {
    let current = true
    readChatVideoTimeline(contextRef.current, path)
      .then((next) => {
        if (current) setTimeline(videoTimelineOnServer(next, apiBaseUrl))
      })
      .catch(() => {})
    return () => {
      current = false
    }
  }, [path, apiBaseUrl])

  useEffect(() => {
    if (!live) return
    return read()
  }, [live, read, contextKey])

  useEffect(() => {
    if (!live) return
    return ws.on<ChatVideoDigestEvent>('chatAttachments:digest', (event) => {
      if (event.path === path) read()
    })
  }, [live, ws, path, read])

  useOnWsReopen(() => {
    if (live) read()
  })

  const expiresAt = timeline?.expiresAt
  useEffect(() => {
    const refreshIn = live ? videoTimelineRefreshInMs(expiresAt, Date.now()) : undefined
    if (refreshIn === undefined) return
    let cancel: (() => void) | undefined
    const timer = setTimeout(() => {
      cancel = read()
    }, refreshIn)
    return () => {
      clearTimeout(timer)
      cancel?.()
    }
  }, [live, expiresAt, read])

  return fixed ?? (enabled ? timeline : undefined)
}
