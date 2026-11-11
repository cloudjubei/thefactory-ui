import { useState } from 'react'

import {
  FEATURE_SPLIT_CANCEL_LABEL,
  FEATURE_SPLIT_CHANGE_PROOF_LABEL,
  FEATURE_SPLIT_HEADING,
  FEATURE_SPLIT_HINT,
  FEATURE_SPLIT_MOVES_CHIP,
  FEATURE_SPLIT_NOTE_PLACEHOLDER,
  FEATURE_SPLIT_SEND_LABEL,
  FEATURE_SPLIT_STAYS_CHIP,
  FEATURE_SPLIT_TITLE_PLACEHOLDER,
  PARK_NOTE_MAX_LENGTH,
  featureSplitDraftStart,
  featureSplitView,
  toggleFeatureSplitPoint,
  toggleProofChangeKind,
  type FeatureSplitDraft,
  type FeatureSplitPointLook,
  type ProcessFeatureSplitOffer,
} from '../../../headless'
import { Button } from '../../primitives/Button'
import { Switch } from '../../primitives/Switch'
import ToneBadge from '../chips/ToneBadge'

export type FeatureSplitComposerProps = {
  offer: ProcessFeatureSplitOffer
  onSend: (draft: FeatureSplitDraft) => void
  onCancel: () => void
  /** How points are picked; `switch` unless the design view switches it. */
  pointLook?: FeatureSplitPointLook
  /** Where the editor starts — the design view's states. */
  initial?: FeatureSplitDraft
}

/**
 * Move picked points of the stopped feature's acceptance into a new follow-up
 * on its story, written in place of the choice row: each point to pick, how
 * many move and stay, the follow-up's title, what proves the feature changed
 * in the same answer where the stop offers it, and why.
 */
export default function FeatureSplitComposer({
  offer,
  onSend,
  onCancel,
  pointLook = 'switch',
  initial,
}: FeatureSplitComposerProps) {
  const [draft, setDraft] = useState<FeatureSplitDraft>(
    () => initial ?? featureSplitDraftStart(offer),
  )
  const view = featureSplitView(offer, draft)
  const field =
    'w-full rounded-md border border-(--border-subtle) bg-(--surface-raised) px-2 py-1.5 text-[12.5px] text-(--text-primary)'

  return (
    <div className="flex w-full flex-col gap-2">
      <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
        <legend className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-(--text-muted)">
          {FEATURE_SPLIT_HEADING}
        </legend>
        <span className="text-[11px] text-(--text-secondary)">{FEATURE_SPLIT_HINT}</span>
        {view.points.map((point) =>
          pointLook === 'row' ? (
            <button
              key={point.index}
              type="button"
              aria-pressed={point.picked}
              onClick={() => setDraft((d) => toggleFeatureSplitPoint(d, point.index))}
              className={`flex items-start gap-2 rounded-md border px-2 py-1.5 text-left text-[12.5px] ${point.picked ? 'border-(--accent-primary) bg-(--accent-soft-bg) text-(--text-primary)' : 'border-(--border-subtle) bg-(--surface-raised) text-(--text-primary) hover:bg-(--surface-hover)'}`}
            >
              <span className="min-w-0 flex-1">
                {point.number}. {point.text}
              </span>
              <ToneBadge tone={point.picked ? 'review' : 'empty'}>
                {point.picked ? FEATURE_SPLIT_MOVES_CHIP : FEATURE_SPLIT_STAYS_CHIP}
              </ToneBadge>
            </button>
          ) : (
            <Switch
              key={point.index}
              checked={point.picked}
              onCheckedChange={() => setDraft((d) => toggleFeatureSplitPoint(d, point.index))}
              label={`${point.number}. ${point.text}`}
            />
          ),
        )}
        <span className="text-[11px] text-(--text-secondary)">{view.count}</span>
      </fieldset>
      <input
        type="text"
        value={draft.title}
        onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
        placeholder={FEATURE_SPLIT_TITLE_PLACEHOLDER}
        aria-label={FEATURE_SPLIT_TITLE_PLACEHOLDER}
        className={field}
      />
      {view.canChangeProof ? (
        <Switch
          checked={draft.changeProof}
          onCheckedChange={(on) => setDraft((d) => ({ ...d, changeProof: on }))}
          label={FEATURE_SPLIT_CHANGE_PROOF_LABEL}
        />
      ) : null}
      {view.proof ? (
        <div className="flex flex-col gap-1.5 pl-10">
          {view.proof.kinds.map((kind) => (
            <div key={kind.kind} className="flex flex-col gap-0.5">
              <Switch
                checked={kind.checked}
                disabled={kind.disabled}
                onCheckedChange={() =>
                  setDraft((d) =>
                    d.proof ? { ...d, proof: toggleProofChangeKind(d.proof, kind.kind) } : d,
                  )
                }
                label={kind.label}
              />
              {(kind.kept ?? kind.unavailable) ? (
                <span className="pl-10 text-[10.5px] text-(--text-secondary)">
                  {kind.kept ?? kind.unavailable}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      <textarea
        rows={2}
        value={draft.note}
        maxLength={PARK_NOTE_MAX_LENGTH}
        onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
        placeholder={FEATURE_SPLIT_NOTE_PLACEHOLDER}
        aria-label={FEATURE_SPLIT_NOTE_PLACEHOLDER}
        className={field}
      />
      {view.problem ? (
        <span role="status" className="text-[11px] text-(--text-secondary)">
          {view.problem}
        </span>
      ) : null}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="primary" disabled={!view.canSend} onClick={() => onSend(draft)}>
          {FEATURE_SPLIT_SEND_LABEL}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          {FEATURE_SPLIT_CANCEL_LABEL}
        </Button>
      </div>
    </div>
  )
}
