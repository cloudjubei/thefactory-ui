import type { ReactNode } from 'react'
import type { DesignItem } from '../../../headless/api'
import { FullScreenOverlay } from '../../primitives/FullScreenOverlay'
import DesignItemBody from './DesignItemBody'

export type DesignItemViewerProps = {
  /** The item to show; `undefined` keeps the viewer closed. */
  item: DesignItem | undefined
  /** The item's file with a view token. */
  src: string | undefined
  onClose: () => void
  /** What a person can do to the item from the viewer, left of the close button. */
  actions?: ReactNode
}

/** Any design item edge to edge, as it is stored or was captured. */
export default function DesignItemViewer({ item, src, onClose, actions }: DesignItemViewerProps) {
  return (
    <FullScreenOverlay
      isOpen={item !== undefined}
      onClose={onClose}
      {...(item ? { title: item.name } : {})}
      {...(actions ? { headerActions: actions } : {})}
    >
      {item ? (
        <div className="h-full min-h-0 w-full">
          <DesignItemBody item={item} src={src} />
        </div>
      ) : null}
    </FullScreenOverlay>
  )
}
