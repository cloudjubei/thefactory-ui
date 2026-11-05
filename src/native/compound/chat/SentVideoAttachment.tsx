import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Image, Pressable, Text, View, useWindowDimensions } from 'react-native'

import {
  nativeVideoFailureKind,
  useVideoPlayback,
  VIDEO_ATTACHMENT_TEXT,
  VIDEO_PLAYBACK_TEXT,
  videoPlayerSize,
  type ChatVideoSource,
  type VideoAttachmentView,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconClose, IconError, IconInfo, IconMaximize, IconPlay, IconVideo } from '../../icons'
import BottomSheet from '../../primitives/BottomSheet'
import { useMediaHost } from './signoff/MediaHostContext'
import type { InlineVideoHandle } from './signoff/signoffTypes'
import VideoCostChip from './VideoCostChip'
import VideoDetailsBody from './VideoDetailsBody'

export interface SentVideoAttachmentProps {
  name: string
  view: VideoAttachmentView
  poster?: { uri: string; headers?: Record<string, string> } | undefined
  /** Where the video plays from. Left out, the card shows its poster and details only. */
  source?: ChatVideoSource
  onOpenSetup?: () => void
}

const TILE_WIDTH = 208
const RED = '#e4445a'
/** What a message row keeps clear of the screen's edges. */
const ROW_GUTTER = 32
const UNKNOWN_FRAME = { width: 16, height: 9 }
const OVERLAY_BG = 'rgba(11,15,20,0.72)'

function OverlayButton({
  label,
  onPress,
  children,
}: {
  label: string
  onPress: () => void
  children: ReactNode
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={{
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: nativeRadii[3],
        backgroundColor: OVERLAY_BG,
      }}
    >
      {children}
    </Pressable>
  )
}

/**
 * A video sent with a message. It stays live: the row follows the digest for as
 * long as the chat is open. It plays in the card through the host's player, and
 * the card grows to the video's own shape and goes back on collapse. A tap shows
 * play and full screen; details stay on the info button.
 */
export default function SentVideoAttachment({
  name,
  view,
  poster,
  source,
  onOpenSetup,
}: SentVideoAttachmentProps) {
  const { theme, status } = useNativeTheme()
  const { renderInlineVideo } = useMediaHost()
  const room = useWindowDimensions().width - ROW_GUTTER
  const playback = useVideoPlayback(renderInlineVideo ? source : undefined, view.frame)
  const { state, frame, isOpen, canPlay, play, collapse } = playback
  const { onMetadata, onPlaying, onFailed, onFullscreenTaken } = playback
  const [open, setOpen] = useState(false)
  const [tapped, setTapped] = useState(false)
  const handleRef = useRef<InlineVideoHandle | null>(null)
  const failed = view.state === 'failed'
  const preparing = view.state === 'preparing'
  const problem = state.failure ? VIDEO_PLAYBACK_TEXT.failure[state.failure] : undefined
  const size = isOpen ? videoPlayerSize(frame ?? UNKNOWN_FRAME, room) : undefined
  const url = state.source?.url

  useEffect(() => {
    if (!state.fullscreenPending || !handleRef.current) return
    handleRef.current.enterFullscreen()
    onFullscreenTaken()
  }, [state.fullscreenPending, url, onFullscreenTaken])

  const player = useMemo(() => {
    if (!url || !renderInlineVideo) return null
    return renderInlineVideo({
      uri: url,
      ...(state.startAtSec !== undefined ? { startAtSec: state.startAtSec } : {}),
      handleRef,
      onMetadata,
      onFailed: (message, atSec) => onFailed(nativeVideoFailureKind(message), atSec),
      onPlayingChange: (playing) => {
        if (playing) onPlaying()
      },
    })
  }, [url, state.startAtSec, renderInlineVideo, onMetadata, onPlaying, onFailed])

  const goFullscreen = () => {
    if (handleRef.current) handleRef.current.enterFullscreen()
    else play({ fullscreen: true })
  }

  return (
    <>
      <View
        style={{
          width: size?.width ?? TILE_WIDTH,
          overflow: 'hidden',
          borderRadius: nativeRadii[3],
          borderWidth: 1,
          borderColor: failed ? status.stuck.softBorder : theme.border.subtle,
          backgroundColor: failed ? status.stuck.softBg : theme.surface.overlay,
        }}
      >
        <View
          style={{
            ...(size ? { height: size.height } : { aspectRatio: 16 / 9 }),
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isOpen ? '#000000' : theme.surface.muted,
          }}
        >
          {isOpen ? (
            <View style={{ position: 'absolute', width: '100%', height: '100%' }}>{player}</View>
          ) : poster ? (
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
          {!isOpen && canPlay ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VIDEO_PLAYBACK_TEXT.play(name)}
              onPress={() => (tapped ? play() : setTapped(true))}
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {tapped ? (
                <View
                  style={{
                    width: 44,
                    height: 44,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 22,
                    backgroundColor: OVERLAY_BG,
                  }}
                >
                  <IconPlay size={22} fill="#ffffff" />
                </View>
              ) : null}
            </Pressable>
          ) : null}
          {canPlay && (tapped || isOpen) ? (
            <View
              style={{
                position: 'absolute',
                right: 4,
                top: 4,
                flexDirection: 'row',
                gap: nativeSpace[2],
              }}
            >
              <OverlayButton label={VIDEO_PLAYBACK_TEXT.fullScreen(name)} onPress={goFullscreen}>
                <IconMaximize size={16} stroke="#ffffff" />
              </OverlayButton>
              {isOpen ? (
                <OverlayButton label={VIDEO_PLAYBACK_TEXT.collapse(name)} onPress={collapse}>
                  <IconClose size={16} color="#ffffff" />
                </OverlayButton>
              ) : null}
            </View>
          ) : null}
          {view.length && !isOpen ? (
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
          {problem ? (
            <View
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                paddingHorizontal: 6,
                paddingVertical: 3,
                backgroundColor: OVERLAY_BG,
              }}
            >
              <Text style={{ fontSize: 11, color: '#ffffff' }}>{problem}</Text>
            </View>
          ) : preparing && view.line && !isOpen ? (
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
            <Text
              numberOfLines={1}
              style={{ flexShrink: 1, fontSize: 11, fontWeight: '500', color: theme.text.primary }}
            >
              {name}
            </Text>
            {view.size ? (
              <Text style={{ fontSize: 11, color: theme.text.muted }}>{view.size}</Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VIDEO_ATTACHMENT_TEXT.details(name)}
              onPress={() => setOpen(true)}
              hitSlop={10}
              style={{ marginLeft: 'auto' }}
            >
              <IconInfo size={16} color={theme.text.muted} />
            </Pressable>
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
      </View>
      <BottomSheet isOpen={open} onClose={() => setOpen(false)} title={name}>
        <VideoDetailsBody view={view} />
      </BottomSheet>
    </>
  )
}
