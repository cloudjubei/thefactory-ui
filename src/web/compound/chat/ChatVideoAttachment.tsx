import { useMemo, useState, type ReactNode } from 'react'
import type { VideoMarkedMoment } from 'thefactory-tools/types'
import { attachmentDisplayName } from 'thefactory-tools/utils'

import {
  composerVideoMarkRows,
  sentVideoMarkRows,
  useChatVideoMedia,
  useVideoDigest,
  useVideoTimeline,
  videoAttachmentView,
  videoTimelineView,
  type ChatVideoAttachments,
} from '../../../headless'
import ComposerVideoMarks from './ComposerVideoMarks'
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
  /** Buttons always shown in the poster's corner, as Save to project — `sent` only. */
  actions?: ReactNode
  /** The moments the sent message marked, on this video or others — `sent` only. */
  sentMarks?: VideoMarkedMoment[]
}

/**
 * A chat's video bound to its path: its chip follows the digest wherever it is shown. Its timeline
 * is read once it is opened or marks need its stills; in the composer the marks waiting for the
 * next message are listed under the card.
 */
export default function ChatVideoAttachment({
  path,
  chat,
  place,
  onRemove,
  fallback,
  actions,
  sentMarks,
}: ChatVideoAttachmentProps) {
  const { digest, missing } = useVideoDigest(chat, path)
  const view = useMemo(() => videoAttachmentView(digest), [digest])
  const { stillUrl: posterUrl, source } = useChatVideoMedia(chat, path, view.poster)
  const [timelineOpen, setTimelineOpen] = useState(false)
  const marks = chat.marks
  const composerMarked = place === 'composer' && !!marks?.items.some((one) => one.video === path)
  const sentMarked = place === 'sent' && !!sentMarks?.some((one) => one.video === path)
  const timeline = useVideoTimeline(chat, path, timelineOpen || composerMarked || sentMarked)
  const timelineShown = useMemo(() => videoTimelineView(timeline), [timeline])
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
        {...(actions ? { actions } : {})}
        timeline={timelineShown}
        timelineOpen={timelineOpen}
        onTimelineOpenChange={setTimelineOpen}
        {...(marks ? { onMark: (timeSec, note) => marks.add({ video: path, timeSec, note }) } : {})}
        {...(sentMarked ? { marks: sentVideoMarkRows(sentMarks, path, timeline) } : {})}
      />
    )
  }
  const card = (
    <VideoAttachmentCard
      name={name}
      view={view}
      posterUrl={posterUrl}
      {...(onRemove ? { onRemove } : {})}
      {...setup}
    />
  )
  if (!composerMarked || !marks) return card
  return (
    <div className="flex max-w-full flex-col gap-1">
      {card}
      <ComposerVideoMarks
        rows={composerVideoMarkRows(marks.items, path, timeline)}
        onNote={marks.setNote}
        onRemove={marks.remove}
      />
    </div>
  )
}
