import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'

import { VIDEO_MARK_TEXT } from '../../../headless'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import BottomSheet from '../../primitives/BottomSheet'
import { Button } from '../../primitives/Button'
import { Textarea } from '../../primitives/Textarea'

export interface NoteForAgentSheetProps {
  isOpen: boolean
  /** "Mark 00:13", "Pick 1". */
  title: string
  /** What it is on, beside the title. */
  where: string
  onCancel: () => void
  onAdd: (note: string) => void
}

/**
 * A note for the agent on something marked — a video's moment, a page's element or area: what it
 * is, an optional note, and Add to message. Cancel or closing the sheet adds no note. Native peer
 * of web's `NoteForAgentPopover`.
 */
export default function NoteForAgentSheet({
  isOpen,
  title,
  where,
  onCancel,
  onAdd,
}: NoteForAgentSheetProps) {
  const { theme } = useNativeTheme()
  const [note, setNote] = useState('')

  useEffect(() => {
    if (isOpen) setNote('')
  }, [isOpen, title])

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
            {title}
          </Text>
          <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 12, color: theme.text.muted }}>
            {where}
          </Text>
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
