import type { ReactNode } from 'react'
import type { DesignShown } from '../../../headless'
import { FullScreenOverlay } from '../../primitives/FullScreenOverlay'
import DesignFileBody from './DesignFileBody'

export type DesignFileViewerProps = {
  /** The file to show; `undefined` keeps the viewer closed. */
  shown: DesignShown | undefined
  /** The file with a view token. */
  src: string | undefined
  onClose: () => void
  /** What a person can do from the viewer, left of the close button. */
  actions?: ReactNode
}

/** Any design file edge to edge, as it is stored or was captured. */
export default function DesignFileViewer({ shown, src, onClose, actions }: DesignFileViewerProps) {
  return (
    <FullScreenOverlay
      isOpen={shown !== undefined}
      onClose={onClose}
      {...(shown ? { title: shown.name } : {})}
      {...(actions ? { headerActions: actions } : {})}
    >
      {shown ? (
        <div className="h-full min-h-0 w-full">
          <DesignFileBody shown={shown} src={src} />
        </div>
      ) : null}
    </FullScreenOverlay>
  )
}
