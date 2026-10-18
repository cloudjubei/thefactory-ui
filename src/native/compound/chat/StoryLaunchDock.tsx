import { useMemo, type ReactNode } from 'react'
import { Modal } from '../../primitives/Modal'
import { storyLaunchGrant } from '../../../headless/utils/storyLaunchGrant'
import type { LaunchModelChipSlot } from '../../../headless/utils/launchAgentPickTypes'
import ApprovalPanel from './ApprovalPanel'

export type StoryLaunchDockProps = {
  isOpen: boolean
  projectId: string
  storyId: string
  /** Only these of the story's pending features — a feature's own Run. */
  featureIds?: readonly string[]
  /** The agent the person's chats run on — what the work runs on unless picked on the card. */
  chatRunner: 'api' | 'cli'
  /** That agent as a launch carries it — the card's picks win; the suggestion is asked of it. */
  agent?: Record<string, unknown>
  /** Launch with the card's picks. The host owns the call and closes the dock. */
  onLaunch: (metadata: Record<string, unknown>) => Promise<void>
  onClose: () => void
  /** The app's model chip, so the run's model can be picked before it starts. */
  renderModelChip?: (picked: LaunchModelChipSlot) => ReactNode
  /** The host's live card for a run — shows a story's open run on the card. */
  renderProcessRun?: (processRunId: string) => ReactNode
}

/**
 * The launch card for a process run started from a story's or a feature's page, or for an
 * accepted feature request: the same card an agent's `startFeatureWork` raises — base branch,
 * proof plans, how features are worked, turn limit, model, and "Suggest setup" — its Approve
 * launching with the picks.
 */
export default function StoryLaunchDock({
  isOpen,
  projectId,
  storyId,
  featureIds,
  chatRunner,
  agent,
  onLaunch,
  onClose,
  renderModelChip,
  renderProcessRun,
}: StoryLaunchDockProps) {
  const featureKey = featureIds?.join(',') ?? ''
  const agentKey = agent ? JSON.stringify(agent) : ''
  const grant = useMemo(
    () =>
      storyLaunchGrant({
        storyId,
        ...(featureKey ? { featureIds: featureKey.split(',') } : {}),
        chatRunner,
        ...(agentKey ? { agent: JSON.parse(agentKey) as Record<string, unknown> } : {}),
        onLaunch,
        onCancel: onClose,
      }),
    [storyId, featureKey, chatRunner, agentKey, onLaunch, onClose],
  )
  return (
    <Modal isOpen={isOpen} onClose={onClose} hideHeader size="lg">
      <ApprovalPanel
        grant={grant}
        projectId={projectId}
        onDecideLater={onClose}
        {...(renderModelChip ? { renderModelChip } : {})}
        {...(renderProcessRun ? { renderProcessRun } : {})}
      />
    </Modal>
  )
}
