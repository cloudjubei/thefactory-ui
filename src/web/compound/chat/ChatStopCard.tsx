import { useState } from 'react'

import { useChatActions } from '../../../headless/contexts/ChatActionsContext'
import { chatStopCardView, chatStopDetailsLabel } from '../../../headless/utils/chatStopNotice'
import { CHAT_STOP_COPY } from '../../../headless/utils/chatStopNoticeConstants'
import type { ChatStopNotice, ChatStopRestart } from '../../../headless/utils/chatStopNoticeTypes'
import { IconStop } from '../../icons'
import { Button } from '../../primitives/Button'
import ToneBadge from '../chips/ToneBadge'

export type ChatStopCardProps = {
  notice: ChatStopNotice
  /** The restart its primary button runs; absent where the row offers none. */
  restart?: ChatStopRestart
  onRestart?: () => void
  /** The turn whose changes "Open the changes" opens; the chat's open changes when absent. */
  runId?: string
  /** Opens with the raw error shown. */
  defaultShowDetails?: boolean
}

/**
 * One card for a stopped turn or story run, in place of a raw error and an "errored" line: whose
 * problem it was, what happened, and what to do next, with the raw error under "Show details".
 */
export default function ChatStopCard({
  notice,
  restart,
  onRestart,
  runId,
  defaultShowDetails = false,
}: ChatStopCardProps) {
  const [showDetails, setShowDetails] = useState(defaultShowDetails)
  const actions = useChatActions()
  const view = chatStopCardView(notice)
  const askAgentDraft = actions ? view.askAgentDraft : undefined
  const hasActions = !!(restart && onRestart) || !!actions || !!view.details
  return (
    <div
      role="status"
      className="flex flex-col rounded-[12px] border bg-(--surface-raised)"
      style={{ borderColor: `var(--status-${view.tone}-soft-border)` }}
    >
      <div className="flex items-start gap-2.5 px-4 pt-3.5 pb-2.5">
        <span className="mt-[2px] shrink-0" style={{ color: `var(--status-${view.tone}-soft-fg)` }}>
          <IconStop className="h-[18px] w-[18px]" />
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <span className="min-w-[min(100%,14rem)] flex-1 text-[14px] leading-[22px] font-semibold text-(--text-primary)">
            {view.title}
          </span>
          {view.pill ? <ToneBadge tone={view.pill.tone}>{view.pill.label}</ToneBadge> : null}
        </div>
      </div>
      <p className="m-0 pr-4 pb-3 pl-11 text-[13.5px] leading-normal text-(--text-primary)">
        {view.reason}
      </p>
      {view.repeatLine ? (
        <p
          className="m-0 pr-4 pb-3 pl-11 text-[12.5px] font-semibold"
          style={{ color: `var(--status-${view.tone}-soft-fg)` }}
        >
          {view.repeatLine}
        </p>
      ) : null}
      {hasActions ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-(--border-subtle) px-4 py-3">
          {restart && onRestart ? (
            <Button size="sm" title={restart.title} disabled={restart.disabled} onClick={onRestart}>
              {view.primaryLabel}
            </Button>
          ) : null}
          {askAgentDraft ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => actions?.draftMessage(askAgentDraft)}
            >
              {CHAT_STOP_COPY.askAgent}
            </Button>
          ) : null}
          {actions ? (
            <Button size="sm" variant="secondary" onClick={() => actions.openReview(runId)}>
              {CHAT_STOP_COPY.openChanges}
            </Button>
          ) : null}
          {view.details ? (
            <button
              type="button"
              className="ml-auto inline-flex h-8 items-center rounded-md px-2.5 text-[13px] text-(--text-secondary) hover:bg-(--surface-hover) hover:text-(--text-primary)"
              aria-expanded={showDetails}
              onClick={() => setShowDetails((open) => !open)}
            >
              {chatStopDetailsLabel(showDetails)}
            </button>
          ) : null}
        </div>
      ) : null}
      {view.details && showDetails ? (
        <pre className="mx-4 mt-0 mb-3.5 overflow-x-auto rounded-lg bg-(--surface-overlay) px-3 py-2.5 font-mono text-[12px] leading-normal whitespace-pre-wrap break-words text-(--text-primary)">
          {view.details}
        </pre>
      ) : null}
    </div>
  )
}
