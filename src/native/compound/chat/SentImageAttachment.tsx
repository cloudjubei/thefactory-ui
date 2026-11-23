import { useState } from 'react'
import { Image, Pressable, Text, View } from 'react-native'
import { attachmentDisplayName } from 'thefactory-tools/utils'

import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import FullScreenOverlay from '../../primitives/FullScreenOverlay'
import ImageViewer from '../files/ImageViewer'
import type { ChatFileSaving } from '../../../headless/utils/chatFileSaveTypes'
import AttachmentFileChip from './AttachmentFileChip'
import ChatFileSaveButton from './ChatFileSaveButton'
import type { NativeAttachmentImages } from './chatNativeTypes'
import { SENT_IMAGE_THUMB_HEIGHT, SENT_IMAGE_THUMB_WIDTH } from './sentImageAttachmentConstants'

export type SentImageAttachmentProps = {
  path: string
  images: NativeAttachmentImages
  /** An image an agent showed: Save to project sits on its thumbnail and in its full-size view. */
  saving?: ChatFileSaving
  /** Starts in its full-size view, as a showcase state shows it. */
  defaultOpen?: boolean
  /** Starts with its whole name shown, as after a long press, as a showcase state shows it. */
  defaultWholeName?: boolean
}

/**
 * An image sent with a message, shown as a thumbnail that opens full size —
 * pinch to zoom, drag to pan — so a screenshot stays readable after it was
 * sent. Its name sits under it on one line; a long press shows it whole. An
 * image an agent showed carries Save to project in the thumbnail's corner. Falls
 * back to the file chip when the image cannot be read.
 */
export default function SentImageAttachment({
  path,
  images,
  saving,
  defaultOpen = false,
  defaultWholeName = false,
}: SentImageAttachmentProps) {
  const { theme } = useNativeTheme()
  const [failed, setFailed] = useState(false)
  const [open, setOpen] = useState(defaultOpen)
  const [wholeName, setWholeName] = useState(defaultWholeName)
  const name = attachmentDisplayName(path)
  const source = images.sourceOf(path)

  if (!source || failed) {
    return <AttachmentFileChip path={path} images={images} {...(saving ? { saving } : {})} />
  }

  return (
    <>
      <View style={{ alignSelf: 'flex-start' }}>
        <Pressable
          accessibilityRole="imagebutton"
          accessibilityLabel={`Open ${name}`}
          onPress={() => setOpen(true)}
          onLongPress={() => setWholeName((whole) => !whole)}
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
          <Text
            {...(wholeName ? {} : { numberOfLines: 1 })}
            style={{
              width: SENT_IMAGE_THUMB_WIDTH,
              paddingHorizontal: nativeSpace[3],
              paddingVertical: nativeSpace[2],
              borderTopWidth: 1,
              borderTopColor: theme.border.subtle,
              fontSize: 11,
              fontWeight: '500',
              color: theme.text.primary,
            }}
          >
            {name}
          </Text>
        </Pressable>
        {saving ? (
          <View style={{ position: 'absolute', right: 4, top: 4 }}>
            <ChatFileSaveButton source={path} saving={saving} variant="overlay" />
          </View>
        ) : null}
      </View>
      <FullScreenOverlay
        isOpen={open}
        onClose={() => setOpen(false)}
        title={name}
        {...(saving
          ? { headerActions: <ChatFileSaveButton source={path} saving={saving} variant="button" /> }
          : {})}
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
