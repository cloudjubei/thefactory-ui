import { useEffect, useRef, useState } from 'react'

import {
  MORE_APPROVE_OPTIONS_LABEL,
  REJECT_EXPLAINER,
  REQUEST_CHANGES_EXPLAINER,
  type ApproveActionDescriptor,
  type DecisionExplainer,
  type EarnedApproveActions,
} from '../../../../headless'
import { Button } from '../../../primitives/Button'
import Tooltip from '../../../primitives/Tooltip'
import { IconChevronDown } from '../../../icons'

export type DecisionBarProps = {
  earned: EarnedApproveActions | undefined
  /** Why every approve is disabled right now, or `undefined` when they are live. */
  approveDisabledReason: string | undefined
  busy: boolean
  isMerged: boolean
  requestingChanges: boolean
  rejecting: boolean
  onApprove: (action: ApproveActionDescriptor) => void
  onRequestChanges: () => void
  onReject: () => void
}

/**
 * Every explainer in this bar has the same three parts, so a reader learns the
 * shape once: what the act is, what it does, and — last — what it does NOT do.
 * A `title` attribute cannot carry that structure, which is why these are real
 * tooltips like every other callout in the panel.
 */
function Explainer({ text }: { text: DecisionExplainer }) {
  return (
    <div className="max-w-[280px] text-xs">
      <b className="mb-0.5 block font-semibold">{text.headline}</b>
      <span>{text.body}</span>
      <span className="mt-1 block text-(--text-muted)">{text.not}</span>
    </div>
  )
}

function ApproveTip({ action }: { action: ApproveActionDescriptor }) {
  return (
    <div className="max-w-[280px] text-xs">
      <b className="mb-0.5 block font-semibold">{action.title}</b>
      <span>{action.hint}</span>
    </div>
  )
}

/**
 * The pinned decision. The lead action is EARNED: a proven run merges from the
 * front, a partly proven one leads with the option that changes nothing shared,
 * and a failed run leads with Request changes — every approve then sits behind
 * the caret, under a line saying which option the evidence actually supports.
 */
export default function DecisionBar({
  earned,
  approveDisabledReason,
  busy,
  isMerged,
  requestingChanges,
  rejecting,
  onApprove,
  onRequestChanges,
  onReject,
}: DecisionBarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const approveLocked = busy || isMerged || approveDisabledReason !== undefined
  // On a FAILED run nothing approves from the front: the primary joins the menu
  // and Request changes takes the slot.
  const approveLeads = earned?.approveLeads !== false
  const menuOptions = earned ? (approveLeads ? earned.rest : [earned.primary, ...earned.rest]) : []

  const requestChanges = (
    <Tooltip placement="top" content={<Explainer text={REQUEST_CHANGES_EXPLAINER} />}>
      <Button
        size="sm"
        variant={approveLeads ? 'secondary' : 'primary'}
        disabled={busy || isMerged}
        onClick={onRequestChanges}
      >
        {requestingChanges ? 'Sending…' : 'Request changes'}
      </Button>
    </Tooltip>
  )

  const approveMenu = earned ? (
    <div ref={menuRef} className="relative inline-flex">
      {approveLeads ? (
        <Tooltip placement="top" content={<ApproveTip action={earned.primary} />}>
          <Button
            size="sm"
            variant="primary"
            className="rounded-r-none"
            title={approveDisabledReason ?? earned.primary.disabledReason}
            disabled={approveLocked || earned.primary.disabledReason !== undefined}
            onClick={() => onApprove(earned.primary)}
          >
            {isMerged && earned.primary.action === 'merge' ? 'Merged ✓' : earned.primary.label}
          </Button>
        </Tooltip>
      ) : null}
      <Button
        size="sm"
        variant={approveLeads ? 'primary' : 'secondary'}
        className={approveLeads ? '-ml-0.5 rounded-l-none px-2' : 'px-2'}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={MORE_APPROVE_OPTIONS_LABEL}
        title={approveDisabledReason}
        disabled={approveLocked || menuOptions.length === 0}
        onClick={() => setMenuOpen((v) => !v)}
      >
        {approveLeads ? null : <span className="mr-1">Approve</span>}
        <IconChevronDown className="w-3.5 h-3.5" />
      </Button>
      {menuOpen ? (
        <div
          role="menu"
          className="absolute bottom-[calc(100%+6px)] left-0 z-30 min-w-[300px] rounded-md border border-(--border-default) bg-(--surface-overlay) py-1 shadow-lg"
        >
          <div className="px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
            {earned.menuHead}
          </div>
          {menuOptions.map((option) => (
            <button
              key={option.action}
              type="button"
              role="menuitem"
              disabled={option.disabledReason !== undefined}
              title={option.disabledReason}
              className="flex w-full flex-col items-start gap-0.5 px-3 py-1.5 text-left text-[12.5px] text-(--text-primary) hover:bg-(--accent-primary)/10 disabled:opacity-50 disabled:hover:bg-transparent"
              onClick={() => {
                setMenuOpen(false)
                onApprove(option)
              }}
            >
              <span className="flex flex-wrap items-center gap-1.5">
                {option.label}
                {option.warnUnlessProven && !approveLeads ? (
                  <span className="text-(--status-working-soft-fg)">— not proven</span>
                ) : null}
                {option.safest ? (
                  <span className="badge badge--soft badge--done badge--sm">safest</span>
                ) : null}
              </span>
              <span className="text-[11px] leading-snug text-(--text-muted)">{option.hint}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  ) : null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {approveLeads ? approveMenu : requestChanges}
      {approveLeads ? requestChanges : approveMenu}
      <Tooltip placement="top" content={<Explainer text={REJECT_EXPLAINER} />}>
        <Button size="sm" variant="ghost" disabled={busy || isMerged} onClick={onReject}>
          {rejecting ? 'Rejecting…' : 'Reject'}
        </Button>
      </Tooltip>
    </div>
  )
}
