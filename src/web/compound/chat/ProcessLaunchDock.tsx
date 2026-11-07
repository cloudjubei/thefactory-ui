import { useMemo, type ReactNode } from 'react'

import { processRunLaunchGrant } from '../../../headless'
import type { LaunchModelChipSlot } from '../../../headless/utils/launchAgentPickTypes'
import { Modal } from '../../primitives/Modal'
import ProcessRunLaunchPanel from './ProcessRunLaunchPanel'

export type ProcessLaunchDockProps = {
  isOpen: boolean
  projectId: string
  processId: string
  /** The agent the person's chats run on: what the run uses unless picked on the card. */
  chatRunner: 'api' | 'cli'
  /** That agent as a launch carries it. */
  agent?: Record<string, unknown>
  /** Launch with the card's picks. The host owns the call and closes the dock. */
  onLaunch: (metadata: Record<string, unknown>) => Promise<void>
  onClose: () => void
  renderModelChip?: (picked: LaunchModelChipSlot) => ReactNode
}

/**
 * The launch card for a process started from a page: the same card an agent's
 * `startProcessRun` raises, over the page it opened from.
 */
export default function ProcessLaunchDock({
  isOpen,
  projectId,
  processId,
  chatRunner,
  agent,
  onLaunch,
  onClose,
  renderModelChip,
}: ProcessLaunchDockProps) {
  const agentKey = agent ? JSON.stringify(agent) : ''
  const grant = useMemo(
    () =>
      processRunLaunchGrant({
        processId,
        chatRunner,
        ...(agentKey ? { agent: JSON.parse(agentKey) as Record<string, unknown> } : {}),
        onLaunch,
        onCancel: onClose,
      }),
    [processId, chatRunner, agentKey, onLaunch, onClose],
  )
  return (
    <Modal isOpen={isOpen} onClose={onClose} hideHeader size="lg">
      <ProcessRunLaunchPanel
        grant={grant}
        projectId={projectId}
        {...(renderModelChip ? { renderModelChip } : {})}
      />
    </Modal>
  )
}
