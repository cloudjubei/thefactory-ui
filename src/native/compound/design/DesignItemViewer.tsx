import type { ReactNode } from 'react'
import { View } from 'react-native'
import type { DesignItem } from '../../../headless/api'
import FullScreenOverlay from '../../primitives/FullScreenOverlay'
import DesignItemBody from './DesignItemBody'
import { useDesignHost } from './DesignHostContext'

export type DesignItemViewerProps = {
  /** The item to show; `undefined` keeps the viewer closed. */
  item: DesignItem | undefined
  /** The item's file with a view token. */
  src: string | undefined
  onClose: () => void
  /** What a person can do to the item from the viewer, left of the close button. */
  actions?: ReactNode
}

/** Native peer of web's `DesignItemViewer`: any design item edge to edge, as it is stored or was captured. */
export default function DesignItemViewer({ item, src, onClose, actions }: DesignItemViewerProps) {
  const { topInset, bottomInset } = useDesignHost()
  return (
    <FullScreenOverlay
      isOpen={item !== undefined}
      onClose={onClose}
      {...(item ? { title: item.name } : {})}
      {...(actions ? { headerActions: actions } : {})}
      {...(topInset !== undefined ? { topInset } : {})}
      {...(bottomInset !== undefined ? { bottomInset } : {})}
    >
      {item ? (
        <View style={{ flex: 1, minHeight: 0 }}>
          <DesignItemBody item={item} src={src} />
        </View>
      ) : null}
    </FullScreenOverlay>
  )
}
