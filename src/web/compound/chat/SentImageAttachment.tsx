import { useEffect, useState } from 'react'
import { attachmentDisplayName } from 'thefactory-tools/utils'
import { FullScreenOverlay } from '../../primitives/FullScreenOverlay'
import FileDisplay from '../files/FileDisplay'
import ImageViewer from '../files/ImageViewer'

export type SentImageAttachmentProps = {
  path: string
  getPreviewUrl: (path: string) => Promise<string | null>
}

/**
 * An image sent with a message, shown as a thumbnail that opens full size —
 * zoom and pan — so a screenshot stays readable after it was sent. Falls back
 * to the file chip until the image loads, and when it cannot be read.
 */
export function SentImageAttachment({ path, getPreviewUrl }: SentImageAttachmentProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
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
    return <FileDisplay file={{ name, absolutePath: path, relativePath: path }} density="compact" />
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
      <FullScreenOverlay isOpen={open} onClose={() => setOpen(false)} title={name}>
        <div className="h-full min-h-0 w-full">
          <ImageViewer src={url} alt={name} />
        </div>
      </FullScreenOverlay>
    </>
  )
}

export default SentImageAttachment
