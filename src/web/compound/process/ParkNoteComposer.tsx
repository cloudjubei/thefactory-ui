import { useState } from 'react'

import {
  PARK_NOTE_CANCEL,
  PARK_NOTE_COPY,
  PARK_NOTE_MAX_LENGTH,
  parkNoteCounter,
  parkNoteToSend,
  type ParkNoteCopy,
} from '../../../headless'
import { useCanonicalizeReferences } from '../../../headless/contexts/ReferenceRenderingContext'
import { Button } from '../../primitives/Button'
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
  const [draft, setDraft] = useState('')
  const copy = givenCopy ?? PARK_NOTE_COPY
  const counter = parkNoteCounter(draft)
  const note = parkNoteToSend(draft)
  const canonicalize = useCanonicalizeReferences()

  return (
    <div className="flex w-full flex-col gap-2">
      <ReferenceTextarea
        rows={3}
        autoFocus
        value={draft}
        onChange={setDraft}
        maxLength={PARK_NOTE_MAX_LENGTH}
        placeholder={copy.prompt}
        ariaLabel={copy.prompt}
        className="text-[12.5px]"
      />
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="primary"
          disabled={required && note === undefined}
          onClick={() => onSend(note === undefined ? undefined : canonicalize(note))}
        >
          {copy.submitLabel}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          {PARK_NOTE_CANCEL}
        </Button>
        {counter ? (
          <span className="ml-auto text-[11px] tabular-nums text-(--text-muted)" aria-live="polite">
            {counter}
          </span>
        ) : null}
      </div>
    </div>
  )
}
