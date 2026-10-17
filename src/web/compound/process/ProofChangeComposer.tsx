import { useState } from 'react'

import {
  PARK_NOTE_MAX_LENGTH,
  PROOF_CHANGE_CANCEL_LABEL,
  PROOF_CHANGE_HEADING,
  PROOF_CHANGE_NOTE_PLACEHOLDER,
  PROOF_CHANGE_SAVE_LABEL,
  PROOF_CHANGE_SEND_LABEL,
  proofChangeDraftStart,
  proofChangeView,
  toggleProofChangeKind,
  type ProcessProofChangeOffer,
  type ProofChangeDraft,
} from '../../../headless'
import { Button } from '../../primitives/Button'
import { Switch } from '../../primitives/Switch'

export type ProofChangeComposerProps = {
  offer: ProcessProofChangeOffer
  onSend: (draft: ProofChangeDraft) => void
  onCancel: () => void
}

/**
 * Change what proves the stopped work, written in place of the choice row:
 * each kind as a switch with how it stood, the ones this run cannot produce
 * held off unless the work already needed them, saving it to the feature on a
 * feature's run, and why.
 */
export default function ProofChangeComposer({ offer, onSend, onCancel }: ProofChangeComposerProps) {
  const [draft, setDraft] = useState<ProofChangeDraft>(() => proofChangeDraftStart(offer))
  const view = proofChangeView(offer, draft)

  return (
    <div className="flex w-full flex-col gap-2">
      <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
        <legend className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-(--text-muted)">
          {PROOF_CHANGE_HEADING}
        </legend>
        <span className="text-[11px] text-(--text-secondary)">{view.hint}</span>
        {view.kinds.map((kind) => (
          <div key={kind.kind} className="flex flex-col gap-0.5">
            <Switch
              checked={kind.checked}
              disabled={kind.disabled}
              onCheckedChange={() => setDraft((d) => toggleProofChangeKind(d, kind.kind))}
              label={kind.label}
            />
            {kind.standing ? (
              <span className="pl-10 text-[10.5px] text-(--text-secondary)">
                {kind.standing.word} — {kind.standing.detail}
              </span>
            ) : null}
            {kind.unavailable ? (
              <span className="pl-10 text-[10.5px] text-(--status-review-soft-fg)">
                {kind.unavailable}
              </span>
            ) : null}
          </div>
        ))}
      </fieldset>
      {view.canSave ? (
        <Switch
          checked={draft.save}
          onCheckedChange={(on) => setDraft((d) => ({ ...d, save: on }))}
          label={PROOF_CHANGE_SAVE_LABEL}
        />
      ) : null}
      <textarea
        rows={2}
        value={draft.note}
        maxLength={PARK_NOTE_MAX_LENGTH}
        onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
        placeholder={PROOF_CHANGE_NOTE_PLACEHOLDER}
        aria-label={PROOF_CHANGE_NOTE_PLACEHOLDER}
        className="w-full rounded-md border border-(--border-subtle) bg-(--surface-raised) px-2 py-1.5 text-[12.5px] text-(--text-primary)"
      />
      {view.problem ? (
        <span role="status" className="text-[11px] text-(--text-secondary)">
          {view.problem}
        </span>
      ) : null}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="primary" disabled={!view.canSend} onClick={() => onSend(draft)}>
          {PROOF_CHANGE_SEND_LABEL}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          {PROOF_CHANGE_CANCEL_LABEL}
        </Button>
      </div>
    </div>
  )
}
