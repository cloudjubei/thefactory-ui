import { designItemFileName, designItemViewKind } from '../../../headless'
import type { DesignItem } from '../../../headless/api'
import { IconExternalLink } from '../../icons'
import { FileTypeIcon } from '../files/FileTypeIcon'
import { DESIGN_THUMB_FRAME } from './designWebConstants'
import { useObjectUrl } from './useObjectUrl'

export type DesignItemThumbProps = {
  item: DesignItem
  /** The item's file with a view token; `undefined` while the token is minted. */
  src: string | undefined
  /** Box width in px; the height follows at 4:3. */
  width?: number
  className?: string
}

/**
 * A design item in miniature: an image, a page drawn small in a sandboxed
 * frame, else the icon of its type.
 */
export default function DesignItemThumb({
  item,
  src,
  width = 96,
  className,
}: DesignItemThumbProps) {
  const kind = designItemViewKind(item)
  const image = useObjectUrl(kind === 'image' ? src : undefined)
  const height = Math.round((width * 3) / 4)
  const box = `relative shrink-0 overflow-hidden rounded-md border border-(--border-subtle) bg-(--surface-muted) ${className ?? ''}`
  if (image.url) {
    return (
      <div className={box} style={{ width, height }}>
        <img src={image.url} alt="" className="h-full w-full object-contain" draggable={false} />
      </div>
    )
  }
  if (src && kind === 'html') {
    const scale = width / DESIGN_THUMB_FRAME.width
    return (
      <div className={box} style={{ width, height }}>
        <iframe
          src={src}
          title={item.name}
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
    <div className={`${box} flex items-center justify-center`} style={{ width, height }}>
      {kind === 'link' ? (
        <IconExternalLink className="h-6 w-6 text-(--text-muted)" />
      ) : (
        <FileTypeIcon name={designItemFileName(item)} size={Math.round(width / 3)} />
      )}
    </div>
  )
}
