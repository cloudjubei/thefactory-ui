import { useEffect, useState } from 'react'
import { attachmentDisplayName } from 'thefactory-tools/utils'
import { FullScreenOverlay } from '../../primitives/FullScreenOverlay'
import ImageViewer from '../files/ImageViewer'
import type { ChatFileSaving } from '../../../headless/utils/chatFileSaveTypes'
import AttachmentFileChip from './AttachmentFileChip'
import ChatFileSaveButton from './ChatFileSaveButton'

export type SentImageAttachmentProps = {
  path: string
  getPreviewUrl: (path: string) => Promise<string | null>
  /** An image an agent showed: its full-size view offers "Save to project". */
  saving?: ChatFileSaving
  /** Starts in its full-size view, as a showcase state shows it. */
  defaultOpen?: boolean
}

/**
 * An image sent with a message, shown as a thumbnail that opens full size —
 * zoom and pan — so a screenshot stays readable after it was sent. Falls back
 * to the file chip until the image loads, and when it cannot be read.
 */
export function SentImageAttachment({
  path,
  getPreviewUrl,
  saving,
  defaultOpen = false,
}: SentImageAttachmentProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [open, setOpen] = useState(defaultOpen)
  const name = attachmentDisplayName(path)

  useEffect(() => {
    let live = true
    let loaded: string | null = null
    getPreviewUrl(path)
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
  }, [path, getPreviewUrl])

  if (!url) {
    return <AttachmentFileChip path={path} {...(saving ? { saving } : {})} />
  }

  return (
    <>
      <button
        type="button"
        className="group block overflow-hidden rounded-md border border-(--border-subtle) bg-(--surface-overlay) hover:border-(--border-strong) focus-visible:outline-2 focus-visible:outline-(--accent-primary)"
        onClick={() => setOpen(true)}
        title={name}
        aria-label={`Open ${name}`}
      >
        <img src={url} alt={name} className="block max-h-40 max-w-60 object-contain" />
      </button>
      <FullScreenOverlay
        isOpen={open}
        onClose={() => setOpen(false)}
        title={name}
        {...(saving
          ? { headerActions: <ChatFileSaveButton source={path} saving={saving} variant="button" /> }
          : {})}
      >
        <div className="h-full min-h-0 w-full">
          <ImageViewer src={url} alt={name} />
        </div>
      </FullScreenOverlay>
    </>
  )
}

export default SentImageAttachment
