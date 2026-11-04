import { useState } from 'react'
import { Image, Pressable, Text, View } from 'react-native'

import { VIDEO_ATTACHMENT_TEXT, type VideoAttachmentView } from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconError, IconVideo } from '../../icons'
import BottomSheet from '../../primitives/BottomSheet'
import VideoCostChip from './VideoCostChip'
import VideoDetailsBody from './VideoDetailsBody'

export interface SentVideoAttachmentProps {
  name: string
  view: VideoAttachmentView
  poster?: { uri: string; headers?: Record<string, string> } | undefined
  onOpenSetup?: () => void
}

const TILE_WIDTH = 208
const RED = '#e4445a'

/**
 * A video sent with a message, as a poster beside the images a message shows.
 * It stays live: the row follows the digest for as long as the chat is open.
 */
export default function SentVideoAttachment({
  name,
  view,
  poster,
  onOpenSetup,
}: SentVideoAttachmentProps) {
  const { theme, status } = useNativeTheme()
  const [open, setOpen] = useState(false)
  const failed = view.state === 'failed'
  const preparing = view.state === 'preparing'
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={VIDEO_ATTACHMENT_TEXT.details(name)}
        onPress={() => setOpen(true)}
        style={{
          width: TILE_WIDTH,
          overflow: 'hidden',
          borderRadius: nativeRadii[3],
          borderWidth: 1,
          borderColor: failed ? status.stuck.softBorder : theme.border.subtle,
          backgroundColor: failed ? status.stuck.softBg : theme.surface.overlay,
        }}
      >
        <View
          style={{
            aspectRatio: 16 / 9,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.surface.muted,
          }}
        >
          {poster ? (
            <Image
              source={poster}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
              style={{ position: 'absolute', width: '100%', height: '100%' }}
            />
          ) : failed ? (
            <IconError size={28} color={RED} />
          ) : (
            <IconVideo size={28} color={theme.text.muted} />
          )}
          {view.length ? (
            <View
              style={{
                position: 'absolute',
                left: 4,
                top: 4,
                paddingHorizontal: 3,
                borderRadius: 3,
                backgroundColor: 'rgba(11,15,20,0.72)',
              }}
            >
              <Text style={{ fontSize: 10, color: '#ffffff', fontVariant: ['tabular-nums'] }}>
                {view.length}
              </Text>
            </View>
          ) : null}
          {preparing && view.line ? (
            <View
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                paddingHorizontal: 6,
                paddingVertical: 3,
                backgroundColor: 'rgba(11,15,20,0.72)',
              }}
            >
              <Text style={{ fontSize: 11, color: '#ffffff', fontVariant: ['tabular-nums'] }}>
                {view.line}
              </Text>
            </View>
          ) : null}
        </View>
        <View
          style={{ gap: 2, paddingHorizontal: nativeSpace[3], paddingVertical: nativeSpace[2] }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: nativeSpace[2] }}>
            <Text
              numberOfLines={1}
              style={{ flexShrink: 1, fontSize: 11, fontWeight: '500', color: theme.text.primary }}
            >
              {name}
            </Text>
            {view.size ? (
              <Text style={{ fontSize: 11, color: theme.text.muted }}>{view.size}</Text>
            ) : null}
          </View>
          {failed && view.line ? (
            <Text style={{ fontSize: 11, color: theme.text.primary }}>{view.line}</Text>
          ) : null}
          {view.cost ? (
            <View style={{ flexDirection: 'row' }}>
              <VideoCostChip cost={view.cost} compact />
            </View>
          ) : null}
          {view.transcript ? (
            <Text
              style={{
                fontSize: 11,
                color: view.transcript.warn ? status.working.softFg : theme.text.muted,
              }}
            >
              {view.transcript.short}
            </Text>
          ) : null}
          {view.canSetUp && onOpenSetup ? (
            <Pressable accessibilityRole="link" onPress={onOpenSetup} hitSlop={6}>
              <Text style={{ fontSize: 12, color: theme.accent.primary }}>
                {VIDEO_ATTACHMENT_TEXT.setUp}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </Pressable>
      <BottomSheet isOpen={open} onClose={() => setOpen(false)} title={name}>
        <VideoDetailsBody view={view} />
      </BottomSheet>
    </>
  )
}
