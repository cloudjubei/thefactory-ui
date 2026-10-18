import { useMemo, useState } from 'react'
import type { PendingToolGrant } from '../../../headless'
import { shownQuestionId } from '../../../headless/utils/agentQuestions'
import type { ToolAskDecidedLine } from '../../../headless/utils/toolAskCardTypes'
import ApprovalPanel, { type ApprovalPanelProps } from './ApprovalPanel'
import ChatPager from './ChatPager'

export type ApprovalStackProps = {
  /** Every approval waiting in the composer's place, in order. */
  grants: PendingToolGrant[]
  projectId?: string
  groupId?: string
  /** Puts the whole set aside until a new approval arrives. */
  onDecideLater: () => void
  onDecided?: (grantId: string, line: ToolAskDecidedLine) => void
  renderModelChip?: ApprovalPanelProps['renderModelChip']
  renderProcessRun?: ApprovalPanelProps['renderProcessRun']
}

/**
 * The approvals waiting in the composer's place, one at a time with a pager —
 * deciding one shows the next. Stacked, a pile of them (an agent deleting 26
 * proposals) squeezed every card to its title strip and hid every decision.
 */
export default function ApprovalStack({
  grants,
  projectId,
  groupId,
  onDecideLater,
  onDecided,
  renderModelChip,
  renderProcessRun,
}: ApprovalStackProps) {
  const ids = useMemo(() => grants.map((g) => g.id), [grants])
  const [chosenId, setChosenId] = useState<string>()
  const shownId = shownQuestionId(ids, chosenId)
  const index = ids.findIndex((id) => id === shownId)
  const shown = grants[index]
  if (!shown) return null
  return (
    <div className="flex max-h-[65%] min-h-0 shrink flex-col overflow-y-auto">
      {grants.length > 1 ? (
        <div className="flex justify-end px-4 pt-2 text-(--text-secondary)">
          <ChatPager ids={ids} index={index} onChoose={setChosenId} />
        </div>
      ) : null}
      <ApprovalPanel
        key={shown.id}
        grant={shown}
        {...(projectId ? { projectId } : {})}
        {...(groupId ? { groupId } : {})}
        onDecideLater={onDecideLater}
        {...(onDecided
          ? { onDecided: (line: ToolAskDecidedLine) => onDecided(shown.id, line) }
          : {})}
        {...(renderModelChip ? { renderModelChip } : {})}
        {...(renderProcessRun ? { renderProcessRun } : {})}
      />
    </div>
  )
}
