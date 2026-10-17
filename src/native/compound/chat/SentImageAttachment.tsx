import { useState } from 'react'
import { Image, Pressable, View } from 'react-native'
import { attachmentDisplayName } from 'thefactory-tools/utils'

import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import FullScreenOverlay from '../../primitives/FullScreenOverlay'
import FileDisplay from '../files/FileDisplay'
import ImageViewer from '../files/ImageViewer'
import type { NativeAttachmentImages } from './chatNativeTypes'
import { SENT_IMAGE_THUMB_HEIGHT, SENT_IMAGE_THUMB_WIDTH } from './sentImageAttachmentConstants'

export type SentImageAttachmentProps = {
  path: string
  images: NativeAttachmentImages
}

/**
 * An image sent with a message, shown as a thumbnail that opens full size —
 * pinch to zoom, drag to pan — so a screenshot stays readable after it was
 * sent. Falls back to the file chip when the image cannot be read.
 */
export default function SentImageAttachment({ path, images }: SentImageAttachmentProps) {
  const { theme } = useNativeTheme()
  const [failed, setFailed] = useState(false)
  const [open, setOpen] = useState(false)
  const name = attachmentDisplayName(path)
  const source = images.sourceOf(path)

  if (!source || failed) {
    return <FileDisplay file={{ name, absolutePath: path, relativePath: path }} density="compact" />
  }

  return (
    <>
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel={`Open ${name}`}
        onPress={() => setOpen(true)}
        style={{
          overflow: 'hidden',
          borderRadius: nativeRadii[3],
          borderWidth: 1,
          borderColor: theme.border.subtle,
          backgroundColor: theme.surface.muted,
        }}
      >
        <View style={{ width: SENT_IMAGE_THUMB_WIDTH, height: SENT_IMAGE_THUMB_HEIGHT }}>
          <Image
            source={source}
            onError={() => setFailed(true)}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
            style={{ width: '100%', height: '100%' }}
          />
        </View>
      </Pressable>
      <FullScreenOverlay
        isOpen={open}
        onClose={() => setOpen(false)}
        title={name}
        {...(images.topInset !== undefined ? { topInset: images.topInset } : {})}
        {...(images.bottomInset !== undefined ? { bottomInset: images.bottomInset } : {})}
      >
        <View style={{ flex: 1, minHeight: 0 }}>
          <ImageViewer uri={source.uri} {...(source.headers ? { headers: source.headers } : {})} />
        </View>
      </FullScreenOverlay>
    </>
  )
}
