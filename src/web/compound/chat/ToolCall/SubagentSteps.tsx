import { memo, useState, type ReactNode } from 'react'
import type { ReferenceTarget, ResourceLink } from 'thefactory-tools/types'
import Markdown from '../../Markdown'
import { IconChevron } from '../../../icons'
import type { ChatMessageLike } from '../../../../headless/utils/chatTypes'
import { describeSubagentSteps } from '../../../../headless/utils/cliRunActivity'
import ToolCallCard, { type ToolCallCardProps } from './ToolCallCard'
import type { ToolCall } from './types'
import { backgroundJobAnchorOf } from '../../../../headless/utils/backgroundJobs'

export type SubagentStepsProps = {
  messages: ChatMessageLike[]
  renderResult?: ToolCallCardProps['renderResult']
  getToolHeaderPath?: (toolCall: ToolCall) => string | undefined
  renderReference?: (target: ReferenceTarget) => ReactNode | undefined
  onResourceLink?: (link: ResourceLink) => void
}

/** What a subagent said and called, folded under the call that started it. */
function SubagentSteps({
  messages,
  renderResult,
  getToolHeaderPath,
  renderReference,
  onResourceLink,
}: SubagentStepsProps) {
  const [open, setOpen] = useState(false)
  return (
    <div className="ml-3 border-l border-(--border-subtle) pl-2">
      <button
        type="button"
        className="flex items-center gap-1 py-1 text-xs text-(--text-secondary) hover:text-(--text-primary)"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <IconChevron
          className="w-3.5 h-3.5 transition-transform"
          style={{ transform: `rotate(${open ? 90 : 0}deg)` }}
        />
        <span className="font-medium">Subagent</span>
        <span>{describeSubagentSteps(messages)}</span>
      </button>
      {open ? (
        <div className="flex flex-col gap-1 pb-1">
          {messages.map((m, i) =>
            m.role === 'tool' && m.toolCall ? (
              <div
                key={`${String(m.toolCall.toolCallId)}-${i}`}
                id={backgroundJobAnchorOf(m.toolResult?.result)}
                className="flex flex-col gap-1"
              >
                <ToolCallCard
                  toolCall={m.toolCall}
                  result={m.toolResult?.result}
                  resultType={m.toolResult?.type}
                  durationMs={m.toolResult?.durationMs ?? m.durationMs}
                  {...(m.startedAt !== undefined ? { startedAt: m.startedAt } : {})}
                  renderResult={renderResult}
                  headerPath={getToolHeaderPath?.(m.toolCall)}
                />
                {m.subagentMessages ? (
                  <SubagentStepsMemo
                    messages={m.subagentMessages}
                    renderResult={renderResult}
                    getToolHeaderPath={getToolHeaderPath}
                    renderReference={renderReference}
                    onResourceLink={onResourceLink}
                  />
                ) : null}
              </div>
            ) : (
              <div
                key={`text-${i}`}
                className={`px-2 text-xs text-(--text-secondary) ${m.thinking ? 'italic' : ''}`}
              >
                <Markdown
                  text={m.content}
                  onResourceLink={onResourceLink}
                  renderReference={renderReference}
                  typedReferences
                />
              </div>
            ),
          )}
        </div>
      ) : null}
    </div>
  )
}

const SubagentStepsMemo = memo(SubagentSteps)
export default SubagentStepsMemo
