import { useState } from 'react'

import {
  handoffRequest,
  type CheckMethodId,
  type CheckMethodRow,
  type HandoffPurpose,
  type ReviewCheckRow,
} from '../../../../headless'
import { CheckChip, HandoffButton, RunActionButton } from '../../chips'
import { TONE_TEXT } from './tones'

export type ChecksTabProps = {
  /** The method rows this tab owns (tests, or the build-side methods). */
  methods: readonly CheckMethodRow[]
  /** Every individual check that rolled up into those methods. */
  checks: readonly ReviewCheckRow[]
  branch: string | undefined
  busyId: CheckMethodId | undefined
  canRequest: boolean
  onRun: (row: CheckMethodRow) => void
  onRequest: (row: CheckMethodRow, purpose: HandoffPurpose) => void
  /** Shown when the tab owns no method with anything to say — e.g. no tests at all. */
  emptyState?: { title: string; body: string }
}

const OUTPUT_MAX_HEIGHT = 'max-h-[132px]'

function Output({ text }: { text: string }) {
  return (
    <pre
      className={`${OUTPUT_MAX_HEIGHT} overflow-auto rounded border border-(--border-subtle) bg-(--surface-overlay) p-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words text-(--text-secondary)`}
    >
      {text}
    </pre>
  )
}

function CheckBlock({
  row,
  checks,
  branch,
  busy,
  canRequest,
  onRun,
  onRequest,
}: {
  row: CheckMethodRow
  checks: ReviewCheckRow[]
  branch: string | undefined
  busy: boolean
  canRequest: boolean
  onRun: (row: CheckMethodRow) => void
  onRequest: (row: CheckMethodRow, purpose: HandoffPurpose) => void
}) {
  const [showOutput, setShowOutput] = useState(row.state === 'failed')
  const action = row.action
  const command = checks.length === 1 ? checks[0].label : undefined

  return (
    <section className="flex flex-col gap-2 rounded-md border border-(--border-subtle) bg-(--surface-raised) p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <CheckChip row={row} inert />
        {command && row.state !== 'unchecked' && row.state !== 'unconfigured' ? (
          <span className="text-[11px] text-(--text-secondary)">{command}</span>
        ) : (
          <span className="text-[11px] text-(--text-muted)">{row.detail}</span>
        )}
        <span className="flex-1" />
        {row.durationLabel ? (
          <span className="inline-flex items-center rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-blue-600 dark:text-blue-400">
            {row.durationLabel}
          </span>
        ) : null}
      </div>

      {checks.length > 1 ? (
        <ul className="flex flex-col gap-1">
          {checks.map((check) => (
            <li key={check.id} className="flex items-baseline gap-2 text-[12px]">
              <span className={`shrink-0 text-[11px] font-medium ${TONE_TEXT[check.tone]}`}>
                {check.status}
              </span>
              <span className="text-(--text-primary)">{check.label}</span>
              <span className="min-w-0 text-(--text-secondary)">{check.summary}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {row.output ? (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            className="self-start text-[11px] font-semibold text-(--text-secondary) hover:underline"
            onClick={() => setShowOutput((v) => !v)}
            aria-expanded={showOutput}
          >
            {showOutput ? 'Hide output' : 'Show output'}
          </button>
          {showOutput ? <Output text={row.output} /> : null}
        </div>
      ) : null}

      {action.kind === 'run' ? (
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[12px] text-(--text-secondary)">
            Nothing was captured for {row.noun}.
          </span>
          <RunActionButton busy={busy} onClick={() => onRun(row)}>
            Run it now
          </RunActionButton>
        </div>
      ) : action.kind === 'request' ? (
        <div className="flex flex-wrap items-center gap-2.5">
          {action.purpose === 'setup' ? (
            <span className="text-[12px] text-(--text-secondary)">
              {row.detail} Setting it up is a code change, so it is work for the agent.
            </span>
          ) : null}
          <HandoffButton
            disabled={busy || (action.purpose !== 'capture' && !canRequest)}
            title={
              action.purpose !== 'capture' && !canRequest
                ? 'This panel cannot reach the agent from here.'
                : undefined
            }
            onClick={() => onRequest(row, action.purpose)}
          >
            {handoffRequest(row, action.purpose, { branch }).buttonLabel}
          </HandoffButton>
        </div>
      ) : null}
    </section>
  )
}

/**
 * One block per method — the same block for Build and for Tests — with the
 * method's chip, its command, its time in the standard duration pill, its
 * output behind a toggle (capped and scrollable, so a long log cannot inflate
 * the row), and the one action its state allows.
 */
export default function ChecksTab({
  methods,
  checks,
  branch,
  busyId,
  canRequest,
  onRun,
  onRequest,
  emptyState,
}: ChecksTabProps) {
  const allUnconfigured = methods.length > 0 && methods.every((m) => m.state === 'unconfigured')
  if (emptyState && allUnconfigured) {
    const first = methods[0]
    return (
      <section className="flex flex-col gap-2 rounded-md border border-(--border-subtle) bg-(--surface-raised) p-3">
        <div className="text-[13px] font-semibold text-(--text-primary)">{emptyState.title}</div>
        <p className="max-w-[64ch] text-[12px] text-(--text-secondary)">{emptyState.body}</p>
        <div>
          <HandoffButton
            disabled={!canRequest}
            title={!canRequest ? 'This panel cannot reach the agent from here.' : undefined}
            onClick={() => onRequest(first, 'setup')}
          >
            {handoffRequest(first, 'setup', { branch }).buttonLabel}
          </HandoffButton>
        </div>
      </section>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      {methods.map((row) => (
        <CheckBlock
          key={row.id}
          row={row}
          checks={checks.filter((c) => row.checkIds.includes(c.id))}
          branch={branch}
          busy={busyId === row.id}
          canRequest={canRequest}
          onRun={onRun}
          onRequest={onRequest}
        />
      ))}
    </div>
  )
}
