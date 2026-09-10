import { useEffect, useRef, useState } from 'react'

import {
  REJECT_EXPLAINER,
  REQUEST_CHANGES_EXPLAINER,
  type ApproveActionDescriptor,
  type EarnedApproveActions,
} from '../../../../headless'
import { Button } from '../../../primitives/Button'
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
 * The pinned decision. One earned primary approve with the rest behind a caret,
 * then Request changes and Reject — every button explains itself on hover with
 * the same sentence its confirm will make.
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

  return (
    <div className="flex flex-wrap items-center gap-2">
      {earned ? (
        <div ref={menuRef} className="relative inline-flex">
          <Button
            size="sm"
            variant="primary"
            className="rounded-r-none"
            title={approveDisabledReason ?? earned.primary.disabledReason ?? earned.primary.hint}
            disabled={approveLocked || earned.primary.disabledReason !== undefined}
            onClick={() => onApprove(earned.primary)}
          >
            {isMerged && earned.primary.action === 'merge' ? 'Merged ✓' : earned.primary.label}
          </Button>
          <Button
            size="sm"
            variant="primary"
            className="-ml-0.5 rounded-l-none px-2"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="More ways to approve"
            disabled={approveLocked || earned.rest.length === 0}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <IconChevronDown className="w-3.5 h-3.5" />
          </Button>
          {menuOpen ? (
            <div
              role="menu"
              className="absolute bottom-[calc(100%+6px)] left-0 z-30 min-w-[280px] rounded-md border border-(--border-default) bg-(--surface-overlay) py-1 shadow-lg"
            >
              {earned.rest.map((option) => (
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
                  <span>{option.label}</span>
                  <span className="text-[11px] leading-snug text-(--text-muted)">
                    {option.hint}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <Button
        size="sm"
        variant="secondary"
        title={REQUEST_CHANGES_EXPLAINER}
        disabled={busy || isMerged}
        onClick={onRequestChanges}
      >
        {requestingChanges ? 'Sending…' : 'Request changes'}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        title={REJECT_EXPLAINER}
        disabled={busy || isMerged}
        onClick={onReject}
      >
        {rejecting ? 'Rejecting…' : 'Reject'}
      </Button>
    </div>
  )
}
