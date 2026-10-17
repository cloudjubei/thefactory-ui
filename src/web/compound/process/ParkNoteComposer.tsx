import { useState } from 'react'

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
import { useCanonicalizeReferences } from '../../../headless/contexts/ReferenceRenderingContext'
import { Button } from '../../primitives/Button'
import { Switch } from '../../primitives/Switch'
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

/**
 * The proof a request for changes can require, one switch each — a kind the
 * run cannot produce here held off with why, unless it is already on.
 */
export function RequestProofSwitches({
  choices,
  picked,
  onToggle,
}: {
  choices: readonly RequestProofChoice[]
  picked: readonly ProofKind[]
  onToggle: (kind: ProofKind, on: boolean) => void
}) {
  return (
    <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
      <legend className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-(--text-muted)">
        {REQUEST_PROOF_HEADING}
      </legend>
      {choices.map((choice) => (
        <div key={choice.kind} className="flex flex-col gap-0.5">
          <Switch
            checked={picked.includes(choice.kind)}
            disabled={choice.unavailable !== undefined && !picked.includes(choice.kind)}
            onCheckedChange={(on) => onToggle(choice.kind, on)}
            label={choice.label}
          />
          {choice.unavailable ? (
            <span className="pl-10 text-[10.5px] text-(--status-review-soft-fg)">
              {choice.unavailable}
            </span>
          ) : null}
        </div>
      ))}
    </fieldset>
  )
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
  const [draft, setDraft] = useState('')
  const [proof, setProof] = useState<ProofKind[]>(() => [...(proofPreset ?? [])])
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
      {proofChoices && proofChoices.length > 0 ? (
        <RequestProofSwitches
          choices={proofChoices}
          picked={proof}
          onToggle={(kind, on) => setProof((kinds) => toggleRequestedProof(kinds, kind, on))}
        />
      ) : null}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="primary"
          disabled={required && note === undefined}
          onClick={() =>
            onSend(
              note === undefined ? undefined : canonicalize(note),
              proofChoices ? proof : undefined,
            )
          }
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
