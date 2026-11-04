import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { attachmentDisplayName } from 'thefactory-tools/utils'

import { useVideoDigest, videoAttachmentView, type ChatVideoAttachments } from '../../../headless'
import SentVideoAttachment from './SentVideoAttachment'
import VideoAttachmentCard from './VideoAttachmentCard'

export type ChatVideoAttachmentProps = {
  path: string
  chat: ChatVideoAttachments
  /** `composer` — the card with a way off; `sent` — the poster. */
  place: 'composer' | 'sent'
  getPreviewUrl: ((path: string) => Promise<string | null>) | undefined
  onRemove?: () => void
  /** Shown instead when the chat holds no such video, as for a project file sent by name. */
  fallback: ReactNode
}

function usePosterUrl(
  getPreviewUrl: ((path: string) => Promise<string | null>) | undefined,
  poster: string | undefined,
): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!poster || !getPreviewUrl) return
    let live = true
    let loaded: string | null = null
    getPreviewUrl(poster)
      .then((next) => {
        if (!next) return
        if (live) {
          loaded = next
          setUrl(next)
        } else URL.revokeObjectURL(next)
      })
      .catch(() => {})
    return () => {
      live = false
      if (loaded) URL.revokeObjectURL(loaded)
    }
  }, [poster, getPreviewUrl])
  return url
}

/** A chat's video bound to its path: its chip follows the digest wherever it is shown. */
export default function ChatVideoAttachment({
  path,
  chat,
  place,
  getPreviewUrl,
  onRemove,
  fallback,
}: ChatVideoAttachmentProps) {
  const { digest, missing } = useVideoDigest(chat, path)
  const view = useMemo(() => videoAttachmentView(digest), [digest])
  const posterUrl = usePosterUrl(getPreviewUrl, view.poster)
  const name = attachmentDisplayName(path)
  if (missing) return <>{fallback}</>
  const setup = chat.onOpenSetup ? { onOpenSetup: chat.onOpenSetup } : {}
  if (place === 'sent') {
    return <SentVideoAttachment name={name} view={view} posterUrl={posterUrl} {...setup} />
  }
  return (
    <VideoAttachmentCard
      name={name}
      view={view}
      posterUrl={posterUrl}
      {...(onRemove ? { onRemove } : {})}
      {...setup}
    />
  )
}
