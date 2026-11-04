import { useCallback, useEffect, useRef, useState } from 'react'
import { useApi } from '../api'
import { errorStatus } from '../api/errorMessage'
import { readChatVideoDigest } from '../api/videoApi'
import { getChatContextKey } from 'thefactory-tools/utils'
import type {
  ChatVideoAttachments,
  ChatVideoDigest,
  ChatVideoDigestEvent,
} from '../utils/videoAttachmentTypes'
import { useOnWsReopen } from './useOnWsReopen'

export type UseVideoDigest = {
  digest: ChatVideoDigest | undefined
  /** This chat holds no such video, so its row shows as the plain file. */
  missing: boolean
}

/**
 * How a chat's video stands, kept current by `chatAttachments:digest`: the row
 * bound to a path follows the digest wherever it is shown. Read again when the
 * socket comes back, as what was sent while it was down is lost.
 */
export function useVideoDigest(
  { context, fixedDigests }: ChatVideoAttachments,
  path: string,
): UseVideoDigest {
  const { ws } = useApi()
  const [digest, setDigest] = useState<ChatVideoDigest | undefined>()
  const [missing, setMissing] = useState(false)
  const contextRef = useRef(context)
  contextRef.current = context
  const contextKey = getChatContextKey(context)
  const heardRef = useRef(false)
  const fixed = fixedDigests?.[path]

  const read = useCallback(() => {
    let live = true
    readChatVideoDigest(contextRef.current, path)
      .then((next) => {
        if (!live || heardRef.current) return
        setDigest(next)
      })
      .catch((err: unknown) => {
        if (live && errorStatus(err) === 404) setMissing(true)
      })
    return () => {
      live = false
    }
  }, [path])

  useEffect(() => {
    if (fixedDigests) return
    heardRef.current = false
    setDigest(undefined)
    setMissing(false)
    return read()
  }, [read, contextKey, fixedDigests])

  useEffect(
    () =>
      ws.on<ChatVideoDigestEvent>('chatAttachments:digest', (event) => {
        if (event.path !== path) return
        heardRef.current = true
        setMissing(false)
        setDigest(event.status)
      }),
    [ws, path],
  )

  useOnWsReopen(() => {
    if (fixedDigests) return
    heardRef.current = false
    read()
  })

  return { digest: fixed ?? digest, missing }
}
