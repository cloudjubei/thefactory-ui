import { useState } from 'react'
import { Text, View } from 'react-native'

import {
  PARK_NOTE_CANCEL,
  PARK_NOTE_MAX_LENGTH,
  parkNoteCopy,
  parkNoteCounter,
  parkNoteToSend,
} from '../../../headless'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'
import { Textarea } from '../../primitives/Textarea'

export type ParkNoteComposerProps = {
  /** The gate sends the work back to be fixed rather than ending the run. */
  sendsBack: boolean
  onSend: (note: string | undefined) => void
  onCancel: () => void
}

/** The note a choice like "Request changes" carries, written in place of the choice row. */
export default function ParkNoteComposer({ sendsBack, onSend, onCancel }: ParkNoteComposerProps) {
  const { theme } = useNativeTheme()
  const [draft, setDraft] = useState('')
  const copy = parkNoteCopy(sendsBack)
  const counter = parkNoteCounter(draft)

  return (
    <View style={{ width: '100%', gap: nativeSpace[2] }}>
      <Textarea
        rows={3}
        autoFocus
        value={draft}
        onChangeText={setDraft}
        maxLength={PARK_NOTE_MAX_LENGTH}
        placeholder={copy.prompt}
        accessibilityLabel={copy.prompt}
        style={{ fontSize: 13 }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
        <Button size="sm" variant="primary" onPress={() => onSend(parkNoteToSend(draft))}>
          {copy.submitLabel}
        </Button>
        <Button size="sm" variant="ghost" onPress={onCancel}>
          {PARK_NOTE_CANCEL}
        </Button>
        {counter ? (
          <Text
            accessibilityLiveRegion="polite"
            style={{
              marginLeft: 'auto',
              fontSize: 11,
              fontVariant: ['tabular-nums'],
              color: theme.text.muted,
            }}
          >
            {counter}
          </Text>
        ) : null}
      </View>
    </View>
  )
}
