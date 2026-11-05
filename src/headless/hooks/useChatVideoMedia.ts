import { useEffect, useMemo, useRef, useState } from 'react'
import { getChatContextKey } from 'thefactory-tools/utils'
import { useApi } from '../api'
import { ChatVideoMediaLease } from '../api/ChatVideoMediaLease'
import { readChatVideoMedia } from '../api/videoApi'
import type { ChatVideoAttachments, ChatVideoFixedMedia } from '../utils/videoAttachmentTypes'
import type { ChatVideoSource } from '../utils/videoPlaybackTypes'

export type UseChatVideoMedia = {
  /** The poster, from a signed URL, so it shows in every kind of chat. */
  stillUrl: string | null
  source: ChatVideoSource
}

const FAR_OFF = '2999-01-01T00:00:00.000Z'

const fixedLease = ({ video, still }: ChatVideoFixedMedia) =>
  new ChatVideoMediaLease(
    async () => ({ url: video, ...(still ? { stillUrl: still } : {}), expiresAt: FAR_OFF }),
    null,
  )

/** A chat video's poster, and where its card gets the URL to play. */
export function useChatVideoMedia(
  { context, fixedMedia }: ChatVideoAttachments,
  path: string,
  poster: string | undefined,
): UseChatVideoMedia {
  const { apiBaseUrl } = useApi()
  const contextKey = getChatContextKey(context)
  const fixed = fixedMedia?.[path]
  const contextRef = useRef(context)
  contextRef.current = context
  const lease = useMemo(
    () =>
      fixed
        ? fixedLease(fixed)
        : new ChatVideoMediaLease(
            (still) => readChatVideoMedia(contextRef.current, path, still),
            apiBaseUrl,
          ),
    [contextKey, path, apiBaseUrl, fixed],
  )
  const [stillUrl, setStillUrl] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    void lease.stillUrl(poster).then((next) => {
      if (live) setStillUrl(next)
    })
    return () => {
      live = false
    }
  }, [lease, poster])

  return { stillUrl, source: lease }
}
