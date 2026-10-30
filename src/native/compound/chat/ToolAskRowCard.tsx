import { useChatActions } from '../../../headless/contexts/ChatActionsContext'
import type { PendingToolGrant } from '../../../headless/utils/chatTypes'
import ApprovalPanel from './ApprovalPanel'

export type ToolAskRowCardProps = {
  /** The ask the row decides. */
  grant: PendingToolGrant
  /** Fold the card back into its row, the ask still waiting. */
  onClose: () => void
}

/**
 * Native peer of web's `ToolAskRowCard`: a tool-call row's ask, opened — the
 * very card the approval panel shows for it, deciding the same ask the same
 * way. "Decide later" folds it back into its row.
 */
export default function ToolAskRowCard({ grant, onClose }: ToolAskRowCardProps) {
  const chat = useChatActions()
  return (
    <ApprovalPanel
      grant={grant}
      {...(chat?.projectId ? { projectId: chat.projectId } : {})}
      {...(chat?.groupId ? { groupId: chat.groupId } : {})}
      {...(chat?.chatTitle ? { chatTitle: chat.chatTitle } : {})}
      {...(chat?.onResourceLink ? { onResourceLink: chat.onResourceLink } : {})}
      onDecideLater={onClose}
    />
  )
}
