import { useState } from 'react'
import { Text, View } from 'react-native'

import {
  PARK_NOTE_CANCEL,
  PARK_NOTE_COPY,
  PARK_NOTE_MAX_LENGTH,
  REQUEST_PROOF_HEADING,
  parkNoteCounter,
  parkNoteToSend,
  toggleRequestedProof,
  type ParkNoteCopy,
  type ProofKind,
  type RequestProofChoice,
} from '../../../headless'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'
import { Switch } from '../../primitives/Switch'
import { useCanonicalizeReferences } from '../../../headless/contexts/ReferenceRenderingContext'
import ReferenceTextarea from '../files/ReferenceTextarea'

export type ParkNoteComposerProps = {
  /** The composer's words, when they are not a gate's — an answer to a waiting agent. */
  copy?: ParkNoteCopy
  /** The note is the answer: it cannot be sent blank. */
  required?: boolean
  /** The proof a request for changes can require of its fix, offered as switches. */
  proofChoices?: readonly RequestProofChoice[]
  /** The proof switched on to start with. */
  proofPreset?: readonly ProofKind[]
  onSend: (note: string | undefined, requestedProof?: ProofKind[]) => void
  onCancel: () => void
}

/** The note a choice like "Request changes" carries, written in place of the choice row. */
export default function ParkNoteComposer({
  copy: givenCopy,
  required = false,
  proofChoices,
  proofPreset,
  onSend,
  onCancel,
}: ParkNoteComposerProps) {
  const { theme } = useNativeTheme()
  const [draft, setDraft] = useState('')
  const [proof, setProof] = useState<ProofKind[]>(() => [...(proofPreset ?? [])])
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
      {proofChoices && proofChoices.length > 0 ? (
        <View style={{ gap: nativeSpace[2] }}>
          <Text
            accessibilityRole="header"
            style={{
              fontSize: 11,
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: 0.6,
              color: theme.text.muted,
            }}
          >
            {REQUEST_PROOF_HEADING}
          </Text>
          {proofChoices.map((choice) => (
            <Switch
              key={choice.kind}
              checked={proof.includes(choice.kind)}
              onCheckedChange={(on) =>
                setProof((kinds) => toggleRequestedProof(kinds, choice.kind, on))
              }
              label={choice.label}
            />
          ))}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
        <Button
          size="sm"
          variant="primary"
          disabled={required && note === undefined}
          onPress={() =>
            onSend(
              note === undefined ? undefined : canonicalize(note),
              proofChoices ? proof : undefined,
            )
          }
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
