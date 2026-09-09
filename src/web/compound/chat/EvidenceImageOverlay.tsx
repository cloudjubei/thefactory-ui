import type { EvidenceViewerImage } from '../../../headless'
import { FullScreenOverlay } from '../../primitives/FullScreenOverlay'
import ImageViewer from '../files/ImageViewer'

export type EvidenceImageOverlayProps = {
  isOpen: boolean
  onClose: () => void
  /** What the comparison is OF — the group's subject. */
  title: string
  images: readonly EvidenceViewerImage[]
}

/**
 * Full-screen viewer for a review-evidence comparison.
 *
 * The inline strip is thumbnails — far too small to judge a UI change. This
 * opens the group edge to edge and hands each image to the same `ImageViewer`
 * the file pane uses, so a before/after pair sits SIDE BY SIDE and each half
 * zooms and pans independently (details rarely line up at the same offset).
 */
export function EvidenceImageOverlay({
  isOpen,
  onClose,
  title,
  images,
}: EvidenceImageOverlayProps) {
  return (
    <FullScreenOverlay isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex h-full min-h-0 w-full">
        {images.map((image) => (
          <figure
            key={image.id}
            className="flex min-w-0 flex-1 flex-col border-r border-(--border-subtle) last:border-r-0"
          >
            <div className="min-h-0 flex-1">
              <ImageViewer src={image.dataUri} alt={image.caption} />
            </div>
            <figcaption className="shrink-0 border-t border-(--border-subtle) px-3 py-2 text-xs text-(--text-secondary)">
              {image.caption}
            </figcaption>
          </figure>
        ))}
      </div>
    </FullScreenOverlay>
  )
}

export default EvidenceImageOverlay
