import { useState } from 'react'

import { Button } from '../../primitives/Button'
import Surface from '../../primitives/Surface'
import {
  formatGrantDetail,
  isStartFeatureWorkGrant,
  startFeatureWorkGrantSummary,
} from '../../../headless/utils/approvalGrant'
import { grantDecideErrorMessage } from '../../../headless/utils/pendingToolGrants'
import type { PendingToolGrant } from '../../../headless'

export type ApprovalPanelProps = {
  /** The lone pending permission grant this panel decides. */
  grant: PendingToolGrant
  /**
   * Restore the composer WITHOUT deciding — the ask stays pending, so the user
   * can type first (a clarification, a change of plan) and decide later from
   * here. This is what keeps "replace the composer" from trapping the user into
   * approve-or-deny.
   */
  onDecideLater: () => void
}

/**
 * The inline approval surface for the one ask a chat is blocked on. It takes the
 * composer's place (rather than a modal over the whole chat) so the conversation
 * stays visible and the decision is unmissable, while `onDecideLater` leaves an
 * escape back to typing.
 *
 * Every gated ask lands here, not just a launch: a story write, a device
 * command and a feature-work launch are all one decision blocking the agent.
 * Only the copy differs — a launch reads as "Approve & launch" with what the run
 * will do, anything else shows the tool and its arguments.
 *
 * It deliberately takes NO external `busy` flag. The agent is by definition
 * mid-turn while it waits on this decision, so disabling the controls on "the
 * chat is sending" made the buttons permanently dead exactly when they were
 * needed. The only disable is the local one while THIS decision is in flight.
 */
export default function ApprovalPanel({ grant, onDecideLater }: ApprovalPanelProps) {
  const isLaunch = isStartFeatureWorkGrant(grant)
  const summary = startFeatureWorkGrantSummary(grant)
  const detail = isLaunch ? undefined : formatGrantDetail(grant.detail)
  const canGrantPermanently =
    !isLaunch && grant.source === 'cli' && grant.canGrantPermanently !== false
  // ON by default — proof was opt-in and was reliably never asked for, so work
  // landed with nothing to look at. The user sees the choice and can clear it.
  const [captureProof, setCaptureProof] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const decide = (decision: 'once' | 'deny' | 'permanent') => {
    setBusy(true)
    setError(null)
    // A refused decision (409: the approval already expired / was decided)
    // must be SHOWN — a swallowed failure here looked like "approved, then
    // nothing happened".
    void grant
      .decide(decision, isLaunch ? { proofRequired: captureProof } : undefined)
      .catch((err: unknown) => {
        setBusy(false)
        setError(grantDecideErrorMessage(err))
      })
  }
  return (
    <Surface className="m-3 p-4 flex flex-col gap-3 border border-(--border-strong)">
      <div className="flex flex-col gap-1">
        <div className="text-sm font-semibold">
          {isLaunch ? 'Start work on this in an isolated run?' : 'The agent needs your approval'}
        </div>
        {isLaunch ? (
          <p className="text-xs opacity-80">
            The agent will work in an isolated copy of the project and land its changes on a review
            branch with verification attached — nothing touches your working tree until you sign
            off.
          </p>
        ) : (
          <p className="text-xs opacity-80">
            It is waiting on this before it can continue: <code>{grant.label}</code>
          </p>
        )}
      </div>
      {isLaunch && summary.note !== undefined && (
        <div className="rounded-md bg-(--surface-muted) p-3">
          <div className="text-[11px] uppercase tracking-wide opacity-60 mb-1">What it will do</div>
          <p className="text-sm whitespace-pre-wrap wrap-break-word max-h-40 overflow-auto">
            {summary.note}
          </p>
        </div>
      )}
      {isLaunch && (
        <label className="flex items-start gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={captureProof}
            onChange={(e) => setCaptureProof(e.target.checked)}
            disabled={busy}
          />
          <span>
            <span className="font-medium">Capture proof I can look at</span>
            <span className="opacity-80">
              {' '}
              — the run works out what this machine can do (screenshots on a device, a recording, or
              a written before/after) and attaches it to the review.
            </span>
          </span>
        </label>
      )}
      {detail !== undefined && (
        <pre className="rounded-md bg-(--surface-muted) p-3 font-mono text-xs whitespace-pre-wrap wrap-break-word max-h-40 overflow-auto opacity-90">
          {detail}
        </pre>
      )}
      {error !== null && (
        <div className="rounded-md border border-(--color-red-500) bg-(--color-red-50) dark:bg-(--color-red-900)/20 px-3 py-2 text-sm text-(--color-red-700) dark:text-(--color-red-300)">
          {error}
        </div>
      )}
      <div className="flex items-center justify-end gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onDecideLater} disabled={busy}>
          Decide later
        </Button>
        {canGrantPermanently && (
          <Button variant="ghost" size="sm" onClick={() => decide('permanent')} disabled={busy}>
            Always allow
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={() => decide('deny')} disabled={busy}>
          Not now
        </Button>
        <Button size="sm" onClick={() => decide('once')} loading={busy}>
          {isLaunch ? 'Approve & launch' : 'Approve'}
        </Button>
      </div>
    </Surface>
  )
}
