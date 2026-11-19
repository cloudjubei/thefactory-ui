import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'

import { VIDEO_MARK_TEXT } from '../../../headless'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import BottomSheet from '../../primitives/BottomSheet'
import { Button } from '../../primitives/Button'
import { Textarea } from '../../primitives/Textarea'

export interface VideoMarkSheetProps {
  isOpen: boolean
  /** "00:13". */
  time: string
  onCancel: () => void
  onAdd: (note: string) => void
}

/**
 * Marks the moment a paused video is at: its time, an optional note for the agent, and Add to
 * message, which puts the mark in the composer. Cancel or closing the sheet adds no mark. Native
 * peer of web's `VideoMarkPopover`.
 */
export default function VideoMarkSheet({ isOpen, time, onCancel, onAdd }: VideoMarkSheetProps) {
  const { theme } = useNativeTheme()
  const [note, setNote] = useState('')

  useEffect(() => {
    if (isOpen) setNote('')
  }, [isOpen, time])

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onCancel}
      headerNode={
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: nativeSpace[2] }}>
          <Text
            accessibilityRole="header"
            style={{
              fontSize: 16,
              fontWeight: '600',
              fontVariant: ['tabular-nums'],
              color: theme.text.primary,
            }}
          >
            {VIDEO_MARK_TEXT.title(time)}
          </Text>
          <Text style={{ fontSize: 12, color: theme.text.muted }}>{VIDEO_MARK_TEXT.whereNow}</Text>
        </View>
      }
      footer={
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[3] }}>
          <Button variant="secondary" onPress={onCancel}>
            {VIDEO_MARK_TEXT.cancel}
          </Button>
          <Button onPress={() => onAdd(note)}>{VIDEO_MARK_TEXT.add}</Button>
        </View>
      }
    >
      <View style={{ gap: nativeSpace[2], paddingBottom: nativeSpace[3] }}>
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>
          {VIDEO_MARK_TEXT.noteLabel}
        </Text>
        <Textarea
          rows={3}
          value={note}
          onChangeText={setNote}
          accessibilityLabel={VIDEO_MARK_TEXT.noteLabel}
        />
      </View>
    </BottomSheet>
  )
}
