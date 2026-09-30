import { useEffect, useRef, useState } from 'react'

import {
  AGENT_UNREACHABLE,
  checkActionOffer,
  checkCallout,
  checkRowLayout,
  handoffRequest,
  type CheckActionHost,
  type CheckMethodId,
  type CheckMethodRow,
  type ReviewTabId,
} from '../../../../headless'
import { Button } from '../../../primitives/Button'
import { CheckChip, HandoffButton, RunActionButton } from '../../chips'

export type CheckChipRowProps = {
  rows: readonly CheckMethodRow[]
  branch: string | undefined
  /** Which method is currently being run or captured, if any. */
  busyId: CheckMethodId | undefined
  onOpenProof: (tab: ReviewTabId) => void
  /** The order of the tabs below (`reviewTabOrder`), so the chips sit in the same order. */
  tabOrder?: readonly ReviewTabId[]
  /** What this panel can do about a chip; absent on a read-only record, which offers only the proof. */
  actions?: CheckActionHost
}

/**
 * The "what was checked" row — its chips in the order of the tabs below, and the only place
 * that can ask for evidence which has no tab yet (a walkthrough nobody recorded
 * has no Walkthrough tab to ask from). Clicking a chip opens what its state
 * allows: open the proof, run it, or hand it to the agent.
 */
export default function CheckChipRow({
  rows,
  branch,
  busyId,
  onOpenProof,
  tabOrder,
  actions,
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

  const layout = checkRowLayout(rows, expanded, tabOrder)
  const open = rows.find((r) => r.id === openId)
  const callout = open ? checkCallout(open) : undefined

  const renderAction = (row: CheckMethodRow) => {
    const busy = busyId === row.id
    const offer = checkActionOffer(row.action, actions)
    if (offer.kind === 'open-proof') {
      return (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setOpenId(undefined)
            onOpenProof(offer.tab)
          }}
        >
          Open the proof
        </Button>
      )
    }
    if (offer.kind === 'none' || !actions) return null
    if (offer.kind === 'run') {
      return (
        <RunActionButton
          busy={busy}
          onClick={() => {
            setOpenId(undefined)
            actions.onRun(row)
          }}
        >
          Run it now
        </RunActionButton>
      )
    }
    const request = handoffRequest(row, offer.purpose, { branch })
    // The reason is TEXT, not a `title`: browsers do not fire a tooltip on a
    // disabled button, so the explanation native shows was invisible on web.
    return (
      <>
        <HandoffButton
          disabled={offer.unreachable || busy}
          onClick={() => {
            setOpenId(undefined)
            actions.onRequest(row, offer.purpose)
          }}
        >
          {request.buttonLabel}
        </HandoffButton>
        {offer.unreachable ? (
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
          onClick={() => {
            // A passed chip has one thing to offer — its proof — so it just opens
            // it. The callout is for chips that ask a question (run it? set it
            // up? fix it?); putting a "?"-less passed chip behind a popover only
            // added a click to reach a tab that is already right there.
            if (row.action.kind === 'open-proof') {
              setOpenId(undefined)
              onOpenProof(row.action.tab)
              return
            }
            setOpenId((cur) => (cur === row.id ? undefined : row.id))
          }}
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

      {open && callout ? (
        <div
          role="dialog"
          aria-label={`${open.label} — ${open.state}`}
          className="absolute left-0 top-[calc(100%+6px)] z-20 flex w-[300px] max-w-[78vw] flex-col gap-2 rounded-md border border-(--border-default) bg-(--surface-overlay) p-3 shadow-lg"
        >
          <div className="text-[13px] font-semibold text-(--text-primary)">{open.label}</div>
          <p className="text-[12px] text-(--text-secondary)">{callout.lead}</p>
          {callout.detail ? (
            <p className="text-[11px] text-(--text-muted)">{callout.detail}</p>
          ) : null}
          <div>{renderAction(open)}</div>
        </div>
      ) : null}
    </div>
  )
}
