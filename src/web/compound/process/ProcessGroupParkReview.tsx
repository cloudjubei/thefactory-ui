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

export type ProcessGroupParkReviewProps = {
  group: ProcessGroupRun
  /** Send the answer; resolves whether it was taken. */
  onResume: (input: ProcessGroupResumeInput) => Promise<boolean>
}

/**
 * What only the group run can answer, in place: a project that stopped (run it
 * again or skip it), a merged project that does not build, or a merge that
 * failed. Each project's sign-off is answered on its own run, not here. Only
 * the answers the park offers are shown.
 */
export default function ProcessGroupParkReview({ group, onResume }: ProcessGroupParkReviewProps) {
  const view = processGroupParkView(group)
  const [modes, setModes] = useState<Record<string, ProcessIntegrationMode>>({})
  const [note, setNote] = useState('')
  const canonicalize = useCanonicalizeReferences()
  const [busy, setBusy] = useState(false)
  if (!view) return null

  const modeOf = (legId: string, fallback: ProcessIntegrationMode) => modes[legId] ?? fallback
  const chosenModes = Object.fromEntries(
    view.toMerge.map((m) => [m.leg.id, modeOf(m.leg.id, m.mode)]),
  )

  const answer = async (choice: ProcessGroupResumeChoice) => {
    setBusy(true)
    const taken = await onResume(
      processGroupResumeInput(choice, { modes: chosenModes, note: canonicalize(note) }),
    )
    setBusy(false)
    if (taken) setNote('')
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-lg border p-3"
      style={{
        borderColor: 'var(--status-on_hold-soft-border)',
        background: 'var(--status-on_hold-soft-bg)',
      }}
    >
      <p className="text-[12.5px] font-medium text-(--text-primary)">{view.message}</p>

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

      <ReferenceTextarea
        rows={2}
        value={note}
        onChange={setNote}
        placeholder="A note for the agents (optional)"
        ariaLabel="A note for the agents"
        className="text-[12.5px]"
      />

      <div className="flex flex-wrap items-center gap-2">
        {view.choices.map((c) => (
          <Button
            key={c.choice}
            size="sm"
            variant={c.primary ? 'primary' : c.choice === 'abandon' ? 'ghost' : 'secondary'}
            title={c.detail}
            disabled={busy}
            onClick={() => void answer(c.choice)}
          >
            {c.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
