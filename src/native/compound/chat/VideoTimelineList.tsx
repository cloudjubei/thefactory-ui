import { Image, Pressable, Text, View } from 'react-native'

import {
  VIDEO_TIMELINE_TEXT,
  type VideoTimelineGlyph,
  type VideoTimelineView,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconPointer, IconSoundLevels, IconSpeech } from '../../icons'

export interface VideoTimelineListProps {
  view: VideoTimelineView
  /** The row the playhead is at, or -1. */
  playheadIndex: number
  onPlayFrom: (atSec: number) => void
}

function Glyph({ glyph }: { glyph: VideoTimelineGlyph }) {
  const { theme, status } = useNativeTheme()
  switch (glyph.kind) {
    case 'still':
      return (
        <Image
          source={{ uri: glyph.url }}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
          style={{
            width: 40,
            height: 24,
            borderRadius: nativeRadii[1],
            borderWidth: 1,
            borderColor: theme.border.subtle,
            backgroundColor: theme.surface.muted,
          }}
        />
      )
    case 'action':
      return <IconPointer size={16} color={theme.accent.primary} />
    case 'speech':
      return <IconSpeech size={16} color={status.done.softFg} />
    case 'sound':
      return <IconSoundLevels size={16} color={status.working.softFg} />
  }
}

/**
 * A video's timeline in time order: each moment's time plays the video from there, the row at the
 * playhead stands out. While it is being made, or when it failed or holds nothing, one line says so.
 * Native peer of web's `VideoTimelineList`.
 */
export default function VideoTimelineList({
  view,
  playheadIndex,
  onPlayFrom,
}: VideoTimelineListProps) {
  const { theme } = useNativeTheme()
  if (view.state !== 'rows') {
    return (
      <Text
        style={{
          paddingHorizontal: nativeSpace[4],
          paddingVertical: nativeSpace[3],
          fontSize: 13,
          color: view.state === 'failed' ? theme.text.primary : theme.text.muted,
        }}
      >
        {view.state === 'loading' ? VIDEO_TIMELINE_TEXT.loading : view.line}
      </Text>
    )
  }
  return (
    <View style={{ gap: 2 }}>
      {view.onEveryScreen ? (
        <Text
          style={{
            paddingHorizontal: nativeSpace[4],
            paddingBottom: nativeSpace[2],
            fontSize: 12,
            color: theme.text.muted,
          }}
        >
          {view.onEveryScreen}
        </Text>
      ) : null}
      {view.rows.map((row, index) => (
        <Pressable
          key={row.key}
          accessibilityRole="button"
          accessibilityHint={VIDEO_TIMELINE_TEXT.playFrom(row.time)}
          onPress={() => onPlayFrom(row.timeSec)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: nativeSpace[3],
            paddingHorizontal: nativeSpace[3],
            paddingVertical: nativeSpace[3],
            borderRadius: nativeRadii[3],
            backgroundColor:
              index === playheadIndex
                ? theme.accent.softBg
                : pressed
                  ? theme.surface.hover
                  : 'transparent',
          })}
        >
          <View style={{ width: 42 }}>
            <Text
              style={{
                fontSize: 12,
                lineHeight: 18,
                fontVariant: ['tabular-nums'],
                color: theme.accent.primary,
              }}
            >
              {row.time}
            </Text>
          </View>
          <View style={{ width: 40, height: 24, alignItems: 'center', justifyContent: 'center' }}>
            <Glyph glyph={row.glyph} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={{ fontSize: 13, lineHeight: 18, color: theme.text.primary }}>
              {row.text}
            </Text>
            {row.closeUps.map((closeUp) => (
              <View
                key={closeUp.key}
                style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}
              >
                <Image
                  source={{ uri: closeUp.url }}
                  resizeMode="cover"
                  accessibilityIgnoresInvertColors
                  style={{
                    width: 26,
                    height: 14,
                    borderRadius: nativeRadii[1],
                    borderWidth: 1,
                    borderColor: theme.border.subtle,
                  }}
                />
                <Text style={{ flex: 1, fontSize: 12, color: theme.text.secondary }}>
                  {closeUp.text}
                </Text>
              </View>
            ))}
          </View>
        </Pressable>
      ))}
    </View>
  )
}
