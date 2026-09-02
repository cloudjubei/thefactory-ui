import { useState } from 'react'

import { Button } from '../../primitives/Button'
import Surface from '../../primitives/Surface'
import { startFeatureWorkGrantSummary } from '../../../headless/utils/launchGrant'
import type { PendingToolGrant } from '../../../headless'

export type LaunchApprovalPanelProps = {
  /** The lone `startFeatureWork` grant this panel decides. */
  grant: PendingToolGrant
  /**
   * Restore the composer WITHOUT deciding — the launch stays pending, so the
   * user can type first (a clarification, a change of plan) and approve later
   * from here or the review panel. This is what keeps "replace the composer"
   * from trapping the user into approve-or-deny.
   */
  onDecideLater: () => void
}

/**
 * The inline "Approve & launch" surface. It takes the composer's place (rather
 * than a modal over the whole chat) so the conversation stays visible and the
 * decision is unmissable — while `onDecideLater` leaves an escape back to
 * typing. Approving runs the host-side launch (see the decide route); denying
 * tells the agent no.
 */
export default function LaunchApprovalPanel({ grant, onDecideLater }: LaunchApprovalPanelProps) {
  const summary = startFeatureWorkGrantSummary(grant)
  const [busy, setBusy] = useState(false)
  const decide = (decision: 'once' | 'deny') => {
    setBusy(true)
    void grant.decide(decision).catch(() => setBusy(false))
  }
  return (
    <Surface className="m-3 p-4 flex flex-col gap-3 border border-(--border-strong)">
      <div className="flex flex-col gap-1">
        <div className="text-sm font-semibold">Start work on this in an isolated run?</div>
        <p className="text-xs opacity-80">
          The agent will work in an isolated copy of the project and land its changes on a review
          branch with verification attached — nothing touches your working tree until you sign off.
        </p>
      </div>
      {summary.note !== undefined && (
        <div className="rounded-md bg-(--surface-muted) p-3">
          <div className="text-[11px] uppercase tracking-wide opacity-60 mb-1">What it will do</div>
          <p className="text-sm whitespace-pre-wrap wrap-break-word max-h-40 overflow-auto">
            {summary.note}
          </p>
        </div>
      )}
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onDecideLater} disabled={busy}>
          Decide later
        </Button>
        <Button variant="secondary" size="sm" onClick={() => decide('deny')} disabled={busy}>
          Not now
        </Button>
        <Button size="sm" onClick={() => decide('once')} loading={busy}>
          Approve &amp; launch
        </Button>
      </div>
    </Surface>
  )
}
