import type { PendingToolGrant, PendingToolGrantDecision } from './chatTypes'
import { START_FEATURE_WORK_TOOL_NAME } from './approvalGrant'

/** A story's launch opened from its page rather than asked for by an agent. */
export interface StoryLaunchGrantInput {
  storyId: string
  /** Only these of the story's pending features. */
  featureIds?: readonly string[]
  /** The agent the person's chats run on — what the card says the work runs on unless picked. */
  chatRunner: 'api' | 'cli'
  /** That agent as a launch carries it (`runner`, `cliTool`, `cliModel`, `cliCredentialId`) — the card's picks win. */
  agent?: Record<string, unknown>
  /** The process the work runs by, decided before the card opened; the card keeps it. */
  processId?: string
  /** Launch with the card's picks — the same decision metadata an approved ask carries. */
  onLaunch: (metadata: Record<string, unknown>) => Promise<void>
  /** Close the card without launching. */
  onCancel: () => void
}

/**
 * The launch card's ask for a story started from its page: the same card an agent's
 * `startFeatureWork` raises, so every launch reads and decides the same, its Approve
 * launching with the card's picks and its Deny closing it. Pure.
 */
export function storyLaunchGrant(input: StoryLaunchGrantInput): PendingToolGrant {
  const agent = input.agent ?? {}
  const args = {
    ...agent,
    storyId: input.storyId,
    mode: 'process',
    ...(input.processId ? { processId: input.processId } : {}),
    ...(input.featureIds && input.featureIds.length > 0
      ? { featureIds: [...input.featureIds] }
      : {}),
  }
  return {
    id: `launch:${input.storyId}:${input.featureIds?.join(',') ?? ''}`,
    chatRunner: input.chatRunner,
    label: START_FEATURE_WORK_TOOL_NAME,
    toolName: START_FEATURE_WORK_TOOL_NAME,
    args,
    detail: { tool: START_FEATURE_WORK_TOOL_NAME, args },
    ...(input.processId ? { processFixed: true } : {}),
    decide: async (decision: PendingToolGrantDecision, metadata?: Record<string, unknown>) => {
      if (decision === 'deny') {
        input.onCancel()
        return
      }
      await input.onLaunch({
        ...agent,
        ...metadata,
        ...(input.processId ? { mode: 'process', processId: input.processId } : {}),
      })
    },
  }
}
