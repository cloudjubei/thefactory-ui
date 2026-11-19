import { Pressable, Text, View } from 'react-native'

import { VIDEO_MARK_TEXT, type SentVideoMarkRow } from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import VideoMarkStill from './VideoMarkStill'

export interface SentVideoMarksProps {
  name: string
  rows: SentVideoMarkRow[]
  onPlay: (atSec: number) => void
  /** The card's width, so the marks line up under it. */
  width: number
}

/** A sent message's marks on a video, under it and as wide as its card: each plays the video from its moment. Native peer of web's `SentVideoMarks`. */
export default function SentVideoMarks({ name, rows, onPlay, width }: SentVideoMarksProps) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ width, maxWidth: '100%', gap: nativeSpace[2] }}>
      {rows.map((row) => (
        <Pressable
          key={row.key}
          accessibilityRole="button"
          accessibilityLabel={VIDEO_MARK_TEXT.play(name, row.time)}
          onPress={() => onPlay(row.timeSec)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: nativeSpace[3],
            paddingHorizontal: nativeSpace[2],
            paddingVertical: nativeSpace[2],
            borderRadius: nativeRadii[3],
            borderWidth: 1,
            borderColor: theme.border.subtle,
            backgroundColor: theme.surface.overlay,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <VideoMarkStill url={row.stillUrl} />
          <Text
            style={{
              width: 40,
              fontSize: 12,
              fontWeight: '500',
              fontVariant: ['tabular-nums'],
              color: theme.accent.primary,
            }}
          >
            {row.time}
          </Text>
          <Text
            style={{
              flex: 1,
              fontSize: 12,
              color: row.hasNote ? theme.text.secondary : theme.text.muted,
            }}
          >
            {row.note}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}
