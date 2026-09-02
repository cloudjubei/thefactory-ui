import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'
import Surface from '../../primitives/Surface'
import { partitionGrants } from '../../../headless/utils/agentQuestions'
import { soleLaunchGrant } from '../../../headless/utils/launchGrant'
import type { PendingToolGrant } from '../../../headless'

export type ToolConfirmationModalProps = {
  busy: boolean
  onCancel: () => void
  /**
   * Unified approval feed for the CLI permission broker (sandbox-boundary
   * actions: network unlock, package install, external fetch, workspace-cap).
   * API tool-call confirmation is NOT handled here — it renders inline in the
   * message list (the tool cards carry per-tool toggles + a Toggle-all footer).
   * `askUser` question grants are filtered out: they render inline as an
   * `AgentQuestionCard`, never as a permission prompt.
   */
  grants?: PendingToolGrant[]
}

function formatJson(v: unknown): string {
  try {
    return JSON.stringify(v ?? null, null, 2)
  } catch {
    return String(v)
  }
}

/**
 * Approval modal for a CLI run's gated **actions** (broker round-trips). These
 * have no inline chat-message representation, so they surface as a modal with
 * per-grant Allow / Deny (+ "Allow permanently" for CLI grants). API file-edit
 * confirmation is inline (see `MessageList`), not here.
 */
export default function ToolConfirmationModal({
  busy,
  onCancel,
  grants: allGrants,
}: ToolConfirmationModalProps) {
  const grants = partitionGrants(allGrants).permissions
  if (grants.length === 0) return null
  // A lone launch approval is not a tool card — it renders inline as the
  // `LaunchApprovalPanel` in the composer's place (see `ChatBody`). Suppress it
  // here so it is never shown twice; a launch AMONG other grants still lists in
  // the generic modal below.
  if (soleLaunchGrant(allGrants)) return null
  return (
    <Modal
      isOpen
      onClose={onCancel}
      title="The agent wants to run tools"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={() => grants.forEach((g) => void g.decide('deny'))}
            disabled={busy}
          >
            Deny all
          </Button>
          <Button
            onClick={() => grants.forEach((g) => void g.decide('once'))}
            loading={busy}
            disabled={grants.length === 0}
          >
            Allow all
          </Button>
        </>
      }
    >
      <ul className="flex flex-col gap-2">
        {grants.map((grant) => (
          <Surface as="li" key={grant.id} className="p-3 flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <code className="text-sm font-medium">{grant.label}</code>
              {grant.detail !== undefined && (
                <pre className="font-mono text-xs whitespace-pre-wrap wrap-break-word max-h-48 overflow-auto opacity-90">
                  {formatJson(grant.detail)}
                </pre>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void grant.decide('deny')}
                disabled={busy}
              >
                Deny
              </Button>
              <Button size="sm" onClick={() => void grant.decide('once')} disabled={busy}>
                Allow
              </Button>
              {grant.source === 'cli' && grant.canGrantPermanently !== false && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void grant.decide('permanent')}
                  disabled={busy}
                >
                  Allow permanently
                </Button>
              )}
            </div>
          </Surface>
        ))}
      </ul>
    </Modal>
  )
}
