import { useState } from 'react'
import { Text, View } from 'react-native'

import {
  PARK_NOTE_CANCEL,
  PARK_NOTE_COPY,
  PARK_NOTE_MAX_LENGTH,
  parkNoteCounter,
  parkNoteToSend,
  type ParkNoteCopy,
} from '../../../headless'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'
import { useCanonicalizeReferences } from '../../../headless/contexts/ReferenceRenderingContext'
import ReferenceTextarea from '../files/ReferenceTextarea'

export type ParkNoteComposerProps = {
  /** The composer's words, when they are not a gate's — an answer to a waiting agent. */
  copy?: ParkNoteCopy
  /** The note is the answer: it cannot be sent blank. */
  required?: boolean
  onSend: (note: string | undefined) => void
  onCancel: () => void
}

/** The note a choice like "Request changes" carries, written in place of the choice row. */
export default function ParkNoteComposer({
  copy: givenCopy,
  required = false,
  onSend,
  onCancel,
}: ParkNoteComposerProps) {
  const { theme } = useNativeTheme()
  const [draft, setDraft] = useState('')
  const copy = givenCopy ?? PARK_NOTE_COPY
  const counter = parkNoteCounter(draft)
  const note = parkNoteToSend(draft)
  const canonicalize = useCanonicalizeReferences()

  return (
    <View style={{ width: '100%', gap: nativeSpace[2] }}>
      <ReferenceTextarea
        rows={3}
        autoFocus
        value={draft}
        onChangeText={setDraft}
        placeholder={copy.prompt}
        textInputProps={{ maxLength: PARK_NOTE_MAX_LENGTH, accessibilityLabel: copy.prompt }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
        <Button
          size="sm"
          variant="primary"
          disabled={required && note === undefined}
          onPress={() => onSend(note === undefined ? undefined : canonicalize(note))}
        >
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
