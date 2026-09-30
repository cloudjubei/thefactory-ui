import { useState } from 'react'

import {
  PARK_NOTE_CANCEL,
  PARK_NOTE_MAX_LENGTH,
  parkNoteCopy,
  parkNoteCounter,
  parkNoteToSend,
  type ParkNoteCopy,
} from '../../../headless'
import { Button } from '../../primitives/Button'
import { Textarea } from '../../primitives/Textarea'

export type ParkNoteComposerProps = {
  /** The gate sends the work back to be fixed rather than ending the run. */
  sendsBack?: boolean
  /** The composer's words, when they are not a gate's — an answer to a waiting agent. */
  copy?: ParkNoteCopy
  /** The note is the answer: it cannot be sent blank. */
  required?: boolean
  onSend: (note: string | undefined) => void
  onCancel: () => void
}

/** The note a choice like "Request changes" carries, written in place of the choice row. */
export default function ParkNoteComposer({
  sendsBack = false,
  copy: givenCopy,
  required = false,
  onSend,
  onCancel,
}: ParkNoteComposerProps) {
  const [draft, setDraft] = useState('')
  const copy = givenCopy ?? parkNoteCopy(sendsBack)
  const counter = parkNoteCounter(draft)
  const note = parkNoteToSend(draft)

  return (
    <div className="flex w-full flex-col gap-2">
      <Textarea
        rows={3}
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        maxLength={PARK_NOTE_MAX_LENGTH}
        placeholder={copy.prompt}
        aria-label={copy.prompt}
        className="text-[12.5px]"
      />
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="primary"
          disabled={required && note === undefined}
          onClick={() => onSend(note)}
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
