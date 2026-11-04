import { useMemo, type ReactNode } from 'react'
import { attachmentDisplayName } from 'thefactory-tools/utils'

import { useVideoDigest, videoAttachmentView, type ChatVideoAttachments } from '../../../headless'
import type { NativeAttachmentImages } from './chatNativeTypes'
import SentVideoAttachment from './SentVideoAttachment'
import VideoAttachmentCard from './VideoAttachmentCard'

export interface ChatVideoAttachmentProps {
  path: string
  chat: ChatVideoAttachments
  /** `composer` — the card with a way off; `sent` — the poster. */
  place: 'composer' | 'sent'
  images: NativeAttachmentImages | undefined
  onRemove?: () => void
  /** Shown instead when the chat holds no such video, as for a project file sent by name. */
  fallback: ReactNode
}

/** A chat's video bound to its path: its chip follows the digest wherever it is shown. */
export default function ChatVideoAttachment({
  path,
  chat,
  place,
  images,
  onRemove,
  fallback,
}: ChatVideoAttachmentProps) {
  const { digest, missing } = useVideoDigest(chat, path)
  const view = useMemo(() => videoAttachmentView(digest), [digest])
  const name = attachmentDisplayName(path)
  if (missing) return <>{fallback}</>
  const poster = view.poster ? images?.sourceOf(view.poster) : undefined
  const setup = chat.onOpenSetup ? { onOpenSetup: chat.onOpenSetup } : {}
  if (place === 'sent') {
    return <SentVideoAttachment name={name} view={view} poster={poster} {...setup} />
  }
  return (
    <VideoAttachmentCard
      name={name}
      view={view}
      poster={poster}
      {...(onRemove ? { onRemove } : {})}
      {...setup}
    />
  )
}
