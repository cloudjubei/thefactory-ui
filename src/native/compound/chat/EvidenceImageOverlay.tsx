import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import type { EvidenceViewerImage } from '../../../headless'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import FullScreenOverlay from '../../primitives/FullScreenOverlay'
import ImageViewer from '../files/ImageViewer'

export interface EvidenceImageOverlayProps {
  isOpen: boolean
  onClose: () => void
  /** What the comparison is OF — the group's subject. */
  title: string
  images: readonly EvidenceViewerImage[]
  topInset?: number
  bottomInset?: number
}

/**
 * Full-screen viewer for a review-evidence comparison.
 *
 * Shows ONE image at a time with a Before/After switch rather than the web's
 * side-by-side row: on a phone two panes are too small to judge a UI change,
 * and `ImageViewer`'s pinch/pan gestures fight any scroll container they sit
 * inside. Toggling between two aligned shots also reads a difference better
 * than two half-width panes do.
 */
export default function EvidenceImageOverlay({
  isOpen,
  onClose,
  title,
  images,
  topInset,
  bottomInset,
}: EvidenceImageOverlayProps) {
  const { theme } = useNativeTheme()
  const [index, setIndex] = useState(0)

  // A different comparison (or a reopen) starts at the first image rather than
  // a stale index that may no longer exist.
  useEffect(() => {
    setIndex(0)
  }, [isOpen, images.length])

  const current = images[Math.min(index, Math.max(images.length - 1, 0))]

  return (
    <FullScreenOverlay
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      {...(topInset !== undefined ? { topInset } : {})}
      {...(bottomInset !== undefined ? { bottomInset } : {})}
    >
      <View style={{ flex: 1, minHeight: 0 }}>
        {images.length > 1 ? (
          <View
            style={{
              flexDirection: 'row',
              gap: nativeSpace[1],
              padding: nativeSpace[2],
              borderBottomWidth: 1,
              borderBottomColor: theme.border.subtle,
            }}
          >
            {images.map((image, i) => (
              <Pressable
                key={image.id}
                onPress={() => setIndex(i)}
                accessibilityRole="button"
                accessibilityLabel={`Show ${image.caption}`}
                style={{
                  paddingHorizontal: nativeSpace[2],
                  paddingVertical: nativeSpace[1],
                  borderRadius: 4,
                  backgroundColor: i === index ? theme.surface.muted : 'transparent',
                  borderWidth: 1,
                  borderColor: i === index ? theme.border.subtle : 'transparent',
                }}
              >
                <Text style={{ fontSize: 12, color: theme.text.primary }}>
                  {image.caption.split(' — ')[0]}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <View style={{ flex: 1, minHeight: 0 }}>
          {current ? <ImageViewer uri={current.dataUri} /> : null}
        </View>
        {current ? (
          <Text
            style={{
              fontSize: 11,
              color: theme.text.secondary,
              padding: nativeSpace[2],
              borderTopWidth: 1,
              borderTopColor: theme.border.subtle,
            }}
          >
            {current.caption}
          </Text>
        ) : null}
      </View>
    </FullScreenOverlay>
  )
}
