import { useState } from 'react'

import {
  activityStopApprovalView,
  activityStopArgs,
  activityStopCardOf,
} from '../../../headless/utils/activityStopApproval'
import type { ActivityStopApprovalView } from '../../../headless/utils/activityStopApprovalTypes'
import type { PendingToolGrant } from '../../../headless/utils/chatTypes'
import { grantDecideErrorMessage } from '../../../headless/utils/pendingToolGrants'
import { toolAskDecidedLine } from '../../../headless/utils/toolAskCard'
import type { ToolAskDecidedLine } from '../../../headless/utils/toolAskCardTypes'
import ToolAskCard from './ToolAskCard'

export type ActivityStopApprovalPanelProps = {
  grant: PendingToolGrant
  onDecideLater: () => void
  /** The ask was decided — what its one line says. */
  onDecided?: (line: ToolAskDecidedLine) => void
}

/**
 * Approving `stopActivity` on the shared tool-ask card: the activity as the host read it when
 * the agent asked — its type, status, elapsed time, cost, how many live activities it started
 * stop with it, each step's progress and its launch parameters — with the agent's reason shown
 * as the agent's. Approving is the confirmation; the agent reports what the stop observed.
 */
export default function ActivityStopApprovalPanel({
  grant,
  onDecideLater,
  onDecided,
}: ActivityStopApprovalPanelProps) {
  const view = activityStopApprovalView(activityStopCardOf(grant), activityStopArgs(grant))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const decide = (decision: 'once' | 'deny') => {
    setBusy(true)
    setError(null)
    grant
      .decide(decision)
      .then(() => onDecided?.(toolAskDecidedLine(view.ask, decision)))
      .catch((err: unknown) => {
        setBusy(false)
        setError(grantDecideErrorMessage(err))
      })
  }

  return (
    <div className="m-3 flex max-h-[min(70vh,640px)] min-h-0 flex-col">
      <ToolAskCard
        view={view.ask}
        busy={busy}
        error={error}
        onApprove={() => decide('once')}
        onDeny={() => decide('deny')}
        onLater={onDecideLater}
      >
        <ActivityStopFacts view={view} />
      </ToolAskCard>
    </div>
  )
}

/** The host's facts about the activity, as the card shows them. */
export function ActivityStopFacts({ view }: { view: ActivityStopApprovalView }) {
  if (view.unavailable) {
    return <p className="m-0 text-[12.5px] text-(--status-working-soft-fg)">{view.unavailable}</p>
  }
  return (
    <div className="flex flex-col gap-2.5 text-[12.5px]">
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        {view.facts.map((fact) => (
          <div key={fact.label} className="contents">
            <dt className="text-(--text-muted)">{fact.label}</dt>
            <dd className="m-0 min-w-0 break-words text-(--text-primary)">{fact.value}</dd>
          </div>
        ))}
      </dl>
      {view.steps.length > 0 ? (
        <div className="flex flex-col gap-1">
          <div className="text-[11px] font-medium uppercase tracking-wide text-(--text-muted)">
            Progress
          </div>
          <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
            {view.steps.map((step) => (
              <li key={step.key} className="flex justify-between gap-3">
                <span className="truncate text-(--text-secondary)">{step.key}</span>
                <span className="tabular-nums text-(--text-primary)">{step.progress}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="flex flex-col gap-1">
        <div className="text-[11px] font-medium uppercase tracking-wide text-(--text-muted)">
          Launched with
        </div>
        {view.params.length > 0 ? (
          <pre className="m-0 max-h-32 overflow-auto rounded-md bg-(--surface-muted) px-2 py-1.5 font-mono text-[11.5px] leading-snug whitespace-pre-wrap break-all text-(--text-secondary)">
            {view.params.join('\n')}
          </pre>
        ) : null}
        {view.paramsNotes.map((note) => (
          <div key={note} className="text-(--text-muted)">
            {note}
          </div>
        ))}
      </div>
    </div>
  )
}
