import type { ReactNode } from 'react'
import { View } from 'react-native'
import type { DesignShown } from '../../../headless'
import FullScreenOverlay from '../../primitives/FullScreenOverlay'
import DesignFileBody from './DesignFileBody'
import { useDesignHost } from './DesignHostContext'

export type DesignFileViewerProps = {
  /** The file to show; `undefined` keeps the viewer closed. */
  shown: DesignShown | undefined
  /** The file with a view token. */
  src: string | undefined
  onClose: () => void
  /** What a person can do from the viewer, left of the close button. */
  actions?: ReactNode
}

/** Native peer of web's `DesignFileViewer`: any design file edge to edge, as it is stored or was captured. */
export default function DesignFileViewer({ shown, src, onClose, actions }: DesignFileViewerProps) {
  const { topInset, bottomInset } = useDesignHost()
  return (
    <FullScreenOverlay
      isOpen={shown !== undefined}
      onClose={onClose}
      {...(shown ? { title: shown.name } : {})}
      {...(actions ? { headerActions: actions } : {})}
      {...(topInset !== undefined ? { topInset } : {})}
      {...(bottomInset !== undefined ? { bottomInset } : {})}
    >
      {shown ? (
        <View style={{ flex: 1, minHeight: 0 }}>
          <DesignFileBody shown={shown} src={src} />
        </View>
      ) : null}
    </FullScreenOverlay>
  )
}
