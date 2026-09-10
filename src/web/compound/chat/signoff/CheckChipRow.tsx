import { useEffect, useRef, useState } from 'react'

import {
  AGENT_UNREACHABLE,
  checkRowLayout,
  handoffRequest,
  type CheckMethodId,
  type CheckMethodRow,
  type HandoffPurpose,
  type ReviewTabId,
} from '../../../../headless'
import { Button } from '../../../primitives/Button'
import { CheckChip, HandoffButton, RunActionButton } from '../../chips'

export type CheckChipRowProps = {
  rows: readonly CheckMethodRow[]
  branch: string | undefined
  /** Which method is currently being run or captured, if any. */
  busyId: CheckMethodId | undefined
  /** False when the panel has no way to send a message to the agent. */
  canRequest: boolean
  onOpenProof: (tab: ReviewTabId) => void
  onRun: (row: CheckMethodRow) => void
  onRequest: (row: CheckMethodRow, purpose: HandoffPurpose) => void
}

const STATE_SENTENCE: Record<CheckMethodRow['state'], string> = {
  passed: 'Passed. The proof is filed on this run.',
  failed: 'Failed on this branch.',
  unchecked: 'Configured for this project, but never run on this branch.',
  unconfigured: '',
}

/**
 * The "what was checked" row — nine chips in a fixed order, and the only place
 * that can ask for evidence which has no tab yet (a walkthrough nobody recorded
 * has no Walkthrough tab to ask from). Clicking a chip opens what its state
 * allows: open the proof, run it, or hand it to the agent.
 */
export default function CheckChipRow({
  rows,
  branch,
  busyId,
  canRequest,
  onOpenProof,
  onRun,
  onRequest,
}: CheckChipRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [openId, setOpenId] = useState<CheckMethodId | undefined>()
  const hostRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!openId) return
    const onDown = (e: MouseEvent) => {
      if (hostRef.current && !hostRef.current.contains(e.target as Node)) setOpenId(undefined)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenId(undefined)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [openId])

  const layout = checkRowLayout(rows, expanded)
  const open = rows.find((r) => r.id === openId)

  const renderAction = (row: CheckMethodRow) => {
    const busy = busyId === row.id
    const action = row.action
    if (action.kind === 'open-proof') {
      return (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setOpenId(undefined)
            onOpenProof(action.tab)
          }}
        >
          Open the proof
        </Button>
      )
    }
    if (action.kind === 'run') {
      return (
        <RunActionButton
          busy={busy}
          onClick={() => {
            setOpenId(undefined)
            onRun(row)
          }}
        >
          Run it now
        </RunActionButton>
      )
    }
    const request = handoffRequest(row, action.purpose, { branch })
    // A capture is produced by a verifier the host spawns, so it needs no chat
    // to send to; a fix or a set-up is an instruction to the agent in this chat.
    const disabled = action.purpose !== 'capture' && !canRequest
    // The reason is TEXT, not a `title`: browsers do not fire a tooltip on a
    // disabled button, so the explanation native shows was invisible on web.
    return (
      <>
        <HandoffButton
          disabled={disabled || busy}
          onClick={() => {
            setOpenId(undefined)
            onRequest(row, action.purpose)
          }}
        >
          {request.buttonLabel}
        </HandoffButton>
        {disabled ? (
          <span className="text-[11px] text-(--text-muted)">{AGENT_UNREACHABLE}</span>
        ) : null}
      </>
    )
  }

  return (
    <div ref={hostRef} className="relative flex flex-wrap items-center gap-1.5">
      {layout.visible.map((row) => (
        <CheckChip
          key={row.id}
          row={row}
          onClick={() => setOpenId((cur) => (cur === row.id ? undefined : row.id))}
        />
      ))}
      {layout.collapsed.length > 0 ? (
        <button
          type="button"
          className="check-chip"
          data-state="unchecked"
          onClick={() => setExpanded(true)}
          aria-expanded={false}
        >
          {layout.collapsed.length} not checked
          <span className="check-chip__mark" aria-hidden>
            ▾
          </span>
        </button>
      ) : null}

      {open ? (
        <div
          role="dialog"
          aria-label={`${open.label} — ${open.state}`}
          className="absolute left-0 top-[calc(100%+6px)] z-20 flex w-[300px] max-w-[78vw] flex-col gap-2 rounded-md border border-(--border-default) bg-(--surface-overlay) p-3 shadow-lg"
        >
          <div className="text-[13px] font-semibold text-(--text-primary)">{open.label}</div>
          <p className="text-[12px] text-(--text-secondary)">
            {open.state === 'unconfigured'
              ? `There is no ${open.noun} in this project, so there is no tab for it. Ask for it here.`
              : STATE_SENTENCE[open.state]}
          </p>
          {open.state !== 'passed' && open.detail ? (
            <p className="text-[11px] text-(--text-muted)">{open.detail}</p>
          ) : null}
          <div>{renderAction(open)}</div>
        </div>
      ) : null}
    </div>
  )
}
