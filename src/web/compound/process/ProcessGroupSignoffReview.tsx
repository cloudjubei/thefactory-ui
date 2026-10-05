import { useState } from 'react'

import {
  PROCESS_GROUP_MODE_LABELS,
  processGroupParkView,
  processGroupResumeInput,
  type ProcessGroupResumeChoice,
  type ProcessGroupResumeInput,
  type ProcessGroupRun,
  type ProcessIntegrationMode,
} from '../../../headless'
import { Button } from '../../primitives/Button'
import SegmentedControl from '../../primitives/SegmentedControl'
import { useCanonicalizeReferences } from '../../../headless/contexts/ReferenceRenderingContext'
import ReferenceTextarea from '../files/ReferenceTextarea'

export type ProcessGroupSignoffReviewProps = {
  group: ProcessGroupRun
  /** Send the answer; resolves whether it was taken. */
  onResume: (input: ProcessGroupResumeInput) => Promise<boolean>
}

/**
 * What a group run waits on the person for, answered in place: the one
 * sign-off of the whole change (each project merged the way chosen, or chosen
 * projects sent back), an early merge of a project others build on, or a
 * project that stopped. Only the answers the park offers are shown.
 */
export default function ProcessGroupSignoffReview({
  group,
  onResume,
}: ProcessGroupSignoffReviewProps) {
  const view = processGroupParkView(group)
  const [modes, setModes] = useState<Record<string, ProcessIntegrationMode>>({})
  const [sendBack, setSendBack] = useState<string[] | undefined>(undefined)
  const [note, setNote] = useState('')
  const canonicalize = useCanonicalizeReferences()
  const [busy, setBusy] = useState(false)
  if (!view) return null

  const modeOf = (legId: string, fallback: ProcessIntegrationMode) => modes[legId] ?? fallback
  const chosenModes = Object.fromEntries(
    view.toMerge.map((m) => [m.leg.id, modeOf(m.leg.id, m.mode)]),
  )
  const atSignOff = view.toMerge.map((m) => m.leg)
  const picksLegs = group.park?.reason === 'sign-off' && atSignOff.length > 1

  const answer = async (choice: ProcessGroupResumeChoice) => {
    if (choice === 'request-changes' && picksLegs && sendBack === undefined) {
      setSendBack(atSignOff.map((l) => l.id))
      return
    }
    setBusy(true)
    const taken = await onResume(
      processGroupResumeInput(choice, {
        modes: chosenModes,
        note: canonicalize(note),
        ...(sendBack ? { legIds: sendBack } : {}),
      }),
    )
    setBusy(false)
    if (taken) {
      setNote('')
      setSendBack(undefined)
    }
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-lg border p-3"
      style={{
        borderColor: 'var(--status-review-soft-border)',
        background: 'var(--status-review-soft-bg)',
      }}
    >
      <p className="text-[12.5px] font-medium text-(--text-primary)">{view.message}</p>

      {view.toMerge.length > 0 && sendBack === undefined ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
            How each project is merged
          </span>
          {view.toMerge.map(({ leg, mode }) => (
            <div key={leg.id} className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-[12px] text-(--text-primary)">
                {leg.projectId} <span className="text-(--text-muted)">· {leg.title}</span>
              </span>
              <SegmentedControl
                size="sm"
                ariaLabel={`How ${leg.projectId} is merged`}
                value={modeOf(leg.id, mode)}
                onChange={(v) =>
                  setModes((prev) => ({ ...prev, [leg.id]: v as ProcessIntegrationMode }))
                }
                options={view.modes.map((m) => ({ value: m, label: PROCESS_GROUP_MODE_LABELS[m] }))}
              />
            </div>
          ))}
        </div>
      ) : null}

      {sendBack !== undefined ? (
        <fieldset className="flex flex-col gap-1">
          <legend className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
            Send back
          </legend>
          {atSignOff.map((leg) => (
            <label
              key={leg.id}
              className="flex items-center gap-2 text-[12px] text-(--text-primary)"
            >
              <input
                type="checkbox"
                checked={sendBack.includes(leg.id)}
                onChange={(e) =>
                  setSendBack((prev) =>
                    e.target.checked
                      ? [...(prev ?? []), leg.id]
                      : (prev ?? []).filter((id) => id !== leg.id),
                  )
                }
              />
              {leg.projectId} <span className="text-(--text-muted)">· {leg.title}</span>
            </label>
          ))}
        </fieldset>
      ) : null}

      <ReferenceTextarea
        rows={2}
        value={note}
        onChange={setNote}
        placeholder="A note for the agents (optional)"
        ariaLabel="A note for the agents"
        className="text-[12.5px]"
      />

      <div className="flex flex-wrap items-center gap-2">
        {sendBack !== undefined ? (
          <>
            <Button
              size="sm"
              loading={busy}
              disabled={sendBack.length === 0}
              onClick={() => void answer('request-changes')}
            >
              Send {sendBack.length === 1 ? 'it' : 'them'} back
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => setSendBack(undefined)}
            >
              Cancel
            </Button>
          </>
        ) : (
          view.choices.map((c) => (
            <Button
              key={c.choice}
              size="sm"
              variant={
                c.primary
                  ? 'primary'
                  : c.choice === 'abandon' || c.choice === 'reject'
                    ? 'ghost'
                    : 'secondary'
              }
              title={c.detail}
              disabled={busy}
              onClick={() => void answer(c.choice)}
            >
              {c.label}
            </Button>
          ))
        )}
      </div>
    </div>
  )
}
