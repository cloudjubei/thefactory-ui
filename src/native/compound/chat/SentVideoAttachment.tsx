import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Image, Pressable, Text, View, useWindowDimensions } from 'react-native'

import { formatVideoTime } from 'thefactory-tools/utils'

import {
  nativeVideoFailureKind,
  useVideoPlayback,
  VIDEO_ATTACHMENT_TEXT,
  VIDEO_MARK_TEXT,
  VIDEO_PLAYBACK_TEXT,
  VIDEO_TIMELINE_TEXT,
  videoMarkTimeOf,
  videoPlayerSize,
  videoTimelineRowAt,
  type ChatVideoSource,
  type SentVideoMarkRow,
  type VideoAttachmentView,
  type VideoTimelineView,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import {
  IconClose,
  IconError,
  IconFlag,
  IconInfo,
  IconListBullets,
  IconMaximize,
  IconPlay,
  IconVideo,
} from '../../icons'
import BottomSheet from '../../primitives/BottomSheet'
import { useMediaHost } from './signoff/MediaHostContext'
import type { InlineVideoHandle } from './signoff/signoffTypes'
import SentVideoMarks from './SentVideoMarks'
import VideoCostChip from './VideoCostChip'
import VideoDetailsBody from './VideoDetailsBody'
import VideoMarkSheet from './VideoMarkSheet'
import VideoTimelineScreen from './VideoTimelineScreen'

export interface SentVideoAttachmentProps {
  name: string
  view: VideoAttachmentView
  poster?: { uri: string; headers?: Record<string, string> } | undefined
  /** Where the video plays from. Left out, the card shows its poster and details only. */
  source?: ChatVideoSource
  onOpenSetup?: () => void
  /** Buttons always shown in the corner, poster or playing — as Save to project. */
  actions?: ReactNode
  /** The video's timeline as read so far. Given with `onTimelineOpenChange`, the card offers it. */
  timeline?: VideoTimelineView
  /** The timeline's screen is open. */
  timelineOpen?: boolean
  onTimelineOpenChange?: (open: boolean) => void
  /** Given, a playing video offers the flag, which marks the moment it is at for the next message. */
  onMark?: (timeSec: number, note: string) => void
  /** The moments the message marked on this video, under the card. */
  marks?: SentVideoMarkRow[]
  /** Opens the flag's sheet at this moment once the video plays, for a showcase view. */
  initialMarkSec?: number
  /** Holds the playhead's row at this moment whatever plays, for a showcase view. */
  fixedPlayheadSec?: number
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
  pressedColor,
}: {
  label: string
  onPress: () => void
  children: ReactNode
  /** A button that opens something is tinted this while it is open. */
  pressedColor?: string
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      {...(pressedColor !== undefined ? { accessibilityState: { expanded: true } } : {})}
      onPress={onPress}
      hitSlop={6}
      style={{
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: nativeRadii[3],
        backgroundColor: pressedColor ?? OVERLAY_BG,
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
 * play and full screen; details stay on the info button. Actions such as Save
 * to project stay in the corner the whole time.
 *
 * Timeline opens the video's digest as a screen of its own; a time there plays
 * the video from that moment. The flag pauses it and marks the moment for the
 * next message. The marks a message carries are rows under the card.
 */
export default function SentVideoAttachment({
  name,
  view,
  poster,
  source,
  onOpenSetup,
  actions,
  timeline,
  timelineOpen = false,
  onTimelineOpenChange,
  onMark,
  marks,
  initialMarkSec,
  fixedPlayheadSec,
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
  const playheadRef = useRef<number | undefined>(undefined)
  const playingRef = useRef(false)
  const [playheadSec, setPlayheadSec] = useState<number>()
  const [markingSec, setMarkingSec] = useState<number>()
  const failed = view.state === 'failed'
  const preparing = view.state === 'preparing'
  const problem = state.failure ? VIDEO_PLAYBACK_TEXT.failure[state.failure] : undefined
  const size = isOpen ? videoPlayerSize(frame ?? UNKNOWN_FRAME, room) : undefined
  const url = state.source?.url
  const marking = markingSec !== undefined
  const canMark = !!onMark && isOpen && !!url
  const playhead = fixedPlayheadSec ?? (isOpen ? playheadSec : undefined)
  const playheadIndex =
    playhead !== undefined && timeline?.state === 'rows'
      ? videoTimelineRowAt(timeline.rows, playhead)
      : -1

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
        playingRef.current = playing
        if (playing) onPlaying()
      },
      onTimeChange: (atSec) => {
        playheadRef.current = atSec
        setPlayheadSec(atSec)
      },
    })
  }, [url, state.startAtSec, renderInlineVideo, onMetadata, onPlaying, onFailed])

  const goFullscreen = () => {
    if (handleRef.current) handleRef.current.enterFullscreen()
    else play({ fullscreen: true })
  }

  const playFrom = (atSec: number) => {
    setPlayheadSec(atSec)
    const handle = isOpen ? handleRef.current : null
    if (!handle?.seek) return play({ atSec })
    handle.seek(atSec)
    if (!playingRef.current) handle.pause?.()
  }

  const startMark = () => {
    handleRef.current?.pause?.()
    setMarkingSec(videoMarkTimeOf(handleRef.current?.time?.() ?? playheadRef.current ?? 0))
  }

  useEffect(() => {
    if (initialMarkSec !== undefined && canMark) setMarkingSec(initialMarkSec)
  }, [initialMarkSec, canMark])

  useEffect(() => {
    if (!isOpen) setMarkingSec(undefined)
  }, [isOpen])

  return (
    <>
      <View style={{ alignItems: 'flex-end', gap: nativeSpace[2] }}>
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
            {(canPlay && (tapped || isOpen)) || actions ? (
              <View
                style={{
                  position: 'absolute',
                  right: 4,
                  top: 4,
                  flexDirection: 'row',
                  gap: nativeSpace[2],
                }}
              >
                {canPlay && (tapped || isOpen) ? (
                  <>
                    {canMark ? (
                      <OverlayButton
                        label={VIDEO_MARK_TEXT.flag(name)}
                        onPress={marking ? () => setMarkingSec(undefined) : startMark}
                        {...(marking ? { pressedColor: theme.accent.primary } : {})}
                      >
                        <IconFlag size={15} color="#ffffff" />
                      </OverlayButton>
                    ) : null}
                    <OverlayButton
                      label={VIDEO_PLAYBACK_TEXT.fullScreen(name)}
                      onPress={goFullscreen}
                    >
                      <IconMaximize size={16} stroke="#ffffff" />
                    </OverlayButton>
                    {isOpen ? (
                      <OverlayButton label={VIDEO_PLAYBACK_TEXT.collapse(name)} onPress={collapse}>
                        <IconClose size={16} color="#ffffff" />
                      </OverlayButton>
                    ) : null}
                  </>
                ) : null}
                {actions}
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
                style={{
                  flexShrink: 1,
                  fontSize: 11,
                  fontWeight: '500',
                  color: theme.text.primary,
                }}
              >
                {name}
              </Text>
              {view.size ? (
                <Text style={{ fontSize: 11, color: theme.text.muted }}>{view.size}</Text>
              ) : null}
              {onTimelineOpenChange ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={VIDEO_TIMELINE_TEXT.toggleLabel(name)}
                  accessibilityState={{ selected: timelineOpen }}
                  onPress={() => onTimelineOpenChange(!timelineOpen)}
                  hitSlop={8}
                  style={{
                    marginLeft: 'auto',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    height: 22,
                    paddingHorizontal: 7,
                    borderRadius: nativeRadii.round,
                    borderWidth: 1,
                    borderColor: timelineOpen ? theme.accent.softBorder : theme.border.default,
                    backgroundColor: timelineOpen ? theme.accent.softBg : theme.surface.raised,
                  }}
                >
                  <IconListBullets
                    size={11}
                    color={timelineOpen ? theme.accent.softFg : theme.text.secondary}
                  />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '500',
                      color: timelineOpen ? theme.accent.softFg : theme.text.secondary,
                    }}
                  >
                    {VIDEO_TIMELINE_TEXT.toggle}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={VIDEO_ATTACHMENT_TEXT.details(name)}
                onPress={() => setOpen(true)}
                hitSlop={10}
                style={onTimelineOpenChange ? undefined : { marginLeft: 'auto' }}
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
        {marks?.length ? (
          <SentVideoMarks
            name={name}
            rows={marks}
            onPlay={playFrom}
            width={size?.width ?? TILE_WIDTH}
          />
        ) : null}
      </View>
      <BottomSheet isOpen={open} onClose={() => setOpen(false)} title={name}>
        <VideoDetailsBody view={view} />
      </BottomSheet>
      {timeline && onTimelineOpenChange ? (
        <VideoTimelineScreen
          isOpen={timelineOpen}
          name={name}
          view={timeline}
          playheadIndex={playheadIndex}
          onBack={() => onTimelineOpenChange(false)}
          onPlayFrom={(atSec) => {
            onTimelineOpenChange(false)
            playFrom(atSec)
          }}
        />
      ) : null}
      {onMark ? (
        <VideoMarkSheet
          isOpen={marking}
          time={formatVideoTime(markingSec ?? 0)}
          onCancel={() => setMarkingSec(undefined)}
          onAdd={(note) => {
            if (markingSec !== undefined) onMark(markingSec, note)
            setMarkingSec(undefined)
          }}
        />
      ) : null}
    </>
  )
}
