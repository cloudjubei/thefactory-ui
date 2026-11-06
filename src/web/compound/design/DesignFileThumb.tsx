import { designSourceFileName, designViewKind, type DesignShown } from '../../../headless'
import { IconExternalLink } from '../../icons'
import { FileTypeIcon } from '../files/FileTypeIcon'
import { DESIGN_THUMB_FRAME } from './designWebConstants'
import { useObjectUrl } from './useObjectUrl'
import { useSeenOnce } from './useSeenOnce'

export type DesignFileThumbProps = {
  shown: DesignShown
  /** The file with a view token; `undefined` while the token is minted. */
  src: string | undefined
  /** Box width in px; the height follows at 4:3. */
  width?: number
  className?: string
}

/**
 * A design file in miniature: an image, a page drawn small in a sandboxed
 * frame, else the icon of its type. Asks for the file once it comes near the
 * screen: a list can hold thousands, and only a screenful is ever looked at.
 */
export default function DesignFileThumb({
  shown,
  src,
  width = 96,
  className,
}: DesignFileThumbProps) {
  const kind = designViewKind(shown.source)
  const { ref, seen } = useSeenOnce<HTMLDivElement>()
  const wanted = seen || src?.startsWith('data:') ? src : undefined
  const image = useObjectUrl(kind === 'image' ? wanted : undefined)
  const height = Math.round((width * 3) / 4)
  const box = `relative shrink-0 overflow-hidden rounded-md border border-(--border-subtle) bg-(--surface-muted) ${className ?? ''}`
  if (image.url) {
    return (
      <div ref={ref} className={box} style={{ width, height }}>
        <img
          src={image.url}
          alt=""
          decoding="async"
          className="h-full w-full object-contain"
          draggable={false}
        />
      </div>
    )
  }
  if (wanted && kind === 'html') {
    const scale = width / DESIGN_THUMB_FRAME.width
    return (
      <div ref={ref} className={box} style={{ width, height }}>
        <iframe
          src={wanted}
          title={shown.name}
          sandbox="allow-scripts"
          tabIndex={-1}
          aria-hidden="true"
          loading="lazy"
          className="pointer-events-none origin-top-left border-0 bg-white"
          style={{
            width: DESIGN_THUMB_FRAME.width,
            height: height / scale,
            transform: `scale(${scale})`,
          }}
        />
      </div>
    )
  }
  return (
    <div ref={ref} className={`${box} flex items-center justify-center`} style={{ width, height }}>
      {kind === 'link' ? (
        <IconExternalLink className="h-6 w-6 text-(--text-muted)" />
      ) : (
        <FileTypeIcon name={designSourceFileName(shown.source)} size={Math.round(width / 3)} />
      )}
    </div>
  )
}
