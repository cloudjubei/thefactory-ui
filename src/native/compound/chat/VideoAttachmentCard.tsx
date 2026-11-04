import { useState } from 'react'
import { Image, Pressable, Text, View } from 'react-native'

import {
  CHAT_UPLOAD_TEXT,
  VIDEO_ATTACHMENT_TEXT,
  type VideoAttachmentView,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconError, IconVideo } from '../../icons'
import BottomSheet from '../../primitives/BottomSheet'
import Spinner from '../../primitives/Spinner'
import VideoCostChip from './VideoCostChip'
import VideoDetailsBody from './VideoDetailsBody'

export interface VideoAttachmentCardProps {
  name: string
  view: VideoAttachmentView
  poster?: { uri: string; headers?: Record<string, string> } | undefined
  onRemove?: () => void
  onOpenSetup?: () => void
  onRetry?: () => void
}

const RED = '#e4445a'

/** A video in the composer: its poster, length and how it stands, with what it will cost. */
export default function VideoAttachmentCard({
  name,
  view,
  poster,
  onRemove,
  onOpenSetup,
  onRetry,
}: VideoAttachmentCardProps) {
  const { theme, status } = useNativeTheme()
  const [open, setOpen] = useState(false)
  const failed = view.state === 'failed'
  const preparing = view.state === 'preparing'
  const showSetup = view.canSetUp && !!onOpenSetup
  const link = { fontSize: 12, color: theme.accent.primary }
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={VIDEO_ATTACHMENT_TEXT.details(name)}
        onPress={() => setOpen(true)}
        style={{
          flexDirection: 'row',
          gap: nativeSpace[3],
          padding: nativeSpace[2],
          paddingRight: nativeSpace[8],
          borderRadius: nativeRadii[3],
          borderWidth: 1,
          borderColor: failed ? status.stuck.softBorder : theme.border.subtle,
          backgroundColor: failed ? status.stuck.softBg : theme.surface.overlay,
        }}
      >
        <View
          style={{
            width: 72,
            height: 44,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: nativeRadii[2],
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
          ) : (
            <IconVideo size={20} color={theme.text.muted} />
          )}
          {view.length ? (
            <View
              style={{
                position: 'absolute',
                right: 2,
                bottom: 2,
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
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: nativeSpace[2] }}>
            <Text
              numberOfLines={1}
              style={{ flexShrink: 1, fontSize: 12, fontWeight: '500', color: theme.text.primary }}
            >
              {name}
            </Text>
            {view.size ? (
              <Text style={{ fontSize: 11, color: theme.text.muted }}>{view.size}</Text>
            ) : null}
          </View>
          {view.line ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[1] }}>
              {preparing ? <Spinner size={10} /> : null}
              {failed ? <IconError size={12} color={RED} /> : null}
              <Text
                style={{
                  flexShrink: 1,
                  fontSize: 11,
                  color: theme.text.primary,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {view.line}
              </Text>
            </View>
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
          {showSetup || onRetry ? (
            <View style={{ flexDirection: 'row', gap: nativeSpace[4] }}>
              {showSetup ? (
                <Pressable accessibilityRole="link" onPress={onOpenSetup} hitSlop={6}>
                  <Text style={link}>{VIDEO_ATTACHMENT_TEXT.setUp}</Text>
                </Pressable>
              ) : null}
              {onRetry ? (
                <Pressable accessibilityRole="button" onPress={onRetry} hitSlop={6}>
                  <Text style={link}>{CHAT_UPLOAD_TEXT.retry}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
        {onRemove ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={VIDEO_ATTACHMENT_TEXT.remove(name)}
            onPress={onRemove}
            hitSlop={8}
            style={{ position: 'absolute', top: 4, right: 6 }}
          >
            <Text style={{ fontSize: 14, color: theme.text.muted }}>×</Text>
          </Pressable>
        ) : null}
      </Pressable>
      <BottomSheet isOpen={open} onClose={() => setOpen(false)} title={name}>
        <VideoDetailsBody view={view} />
      </BottomSheet>
    </>
  )
}
