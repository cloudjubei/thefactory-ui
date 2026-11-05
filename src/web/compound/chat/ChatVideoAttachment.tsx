import { useMemo, type ReactNode } from 'react'
import { attachmentDisplayName } from 'thefactory-tools/utils'

import {
  useChatVideoMedia,
  useVideoDigest,
  videoAttachmentView,
  type ChatVideoAttachments,
} from '../../../headless'
import SentVideoAttachment from './SentVideoAttachment'
import VideoAttachmentCard from './VideoAttachmentCard'

export type ChatVideoAttachmentProps = {
  path: string
  chat: ChatVideoAttachments
  /** `composer` — the card with a way off; `sent` — the poster. */
  place: 'composer' | 'sent'
  onRemove?: () => void
  /** Shown instead when the chat holds no such video, as for a project file sent by name. */
  fallback: ReactNode
}

/** A chat's video bound to its path: its chip follows the digest wherever it is shown. */
export default function ChatVideoAttachment({
  path,
  chat,
  place,
  onRemove,
  fallback,
}: ChatVideoAttachmentProps) {
  const { digest, missing } = useVideoDigest(chat, path)
  const view = useMemo(() => videoAttachmentView(digest), [digest])
  const { stillUrl: posterUrl, source } = useChatVideoMedia(chat, path, view.poster)
  const name = attachmentDisplayName(path)
  if (missing) return <>{fallback}</>
  const setup = chat.onOpenSetup ? { onOpenSetup: chat.onOpenSetup } : {}
  if (place === 'sent') {
    return (
      <SentVideoAttachment
        name={name}
        view={view}
        posterUrl={posterUrl}
        source={source}
        {...setup}
      />
    )
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
