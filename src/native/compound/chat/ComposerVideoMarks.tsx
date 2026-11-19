import { Pressable, Text, View } from 'react-native'

import { VIDEO_MARK_TEXT, type ComposerVideoMarkRow } from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconFlag } from '../../icons'
import { Input } from '../../primitives/Input'
import VideoMarkStill from './VideoMarkStill'

export interface ComposerVideoMarksProps {
  rows: ComposerVideoMarkRow[]
  onNote: (key: string, note: string) => void
  onRemove: (key: string) => void
}

/** A video's marks waiting in the composer: each its still, time and note, and a way off. Native peer of web's `ComposerVideoMarks`. */
export default function ComposerVideoMarks({ rows, onNote, onRemove }: ComposerVideoMarksProps) {
  const { theme, status } = useNativeTheme()
  return (
    <View style={{ gap: nativeSpace[2] }}>
      {rows.map((row) => (
        <View key={row.key} style={{ gap: 2 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: nativeSpace[3],
              paddingHorizontal: nativeSpace[2],
              paddingVertical: nativeSpace[2],
              borderRadius: nativeRadii[3],
              borderWidth: 1,
              borderColor: row.refusal ? status.stuck.softBorder : theme.border.subtle,
              backgroundColor: theme.surface.overlay,
            }}
          >
            <VideoMarkStill url={row.stillUrl} />
            <View style={{ width: 54, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <IconFlag size={10} color={theme.accent.primary} />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '500',
                  fontVariant: ['tabular-nums'],
                  color: theme.text.primary,
                }}
              >
                {row.time}
              </Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Input
                size="sm"
                value={row.note}
                placeholder={VIDEO_MARK_TEXT.noteLabel}
                accessibilityLabel={VIDEO_MARK_TEXT.noteFor(row.time)}
                invalid={!!row.refusal}
                onChangeText={(note) => onNote(row.key, note)}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VIDEO_MARK_TEXT.remove(row.time)}
              onPress={() => onRemove(row.key)}
              hitSlop={8}
            >
              <Text style={{ fontSize: 15, color: theme.text.muted }}>×</Text>
            </Pressable>
          </View>
          {row.refusal ? (
            <Text
              accessibilityRole="alert"
              style={{
                paddingHorizontal: nativeSpace[2],
                fontSize: 11,
                color: status.stuck.softFg,
              }}
            >
              {row.refusal}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  )
}
