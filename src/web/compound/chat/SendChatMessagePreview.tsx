import { useState, type MouseEvent } from 'react'
import {
  SEND_CHAT_MESSAGE_COPY as COPY,
  SEND_CHAT_MESSAGE_OUTCOME_LABEL,
  collapsedMessage,
  type SendChatMessageOutcomeStatus,
  type SendChatMessageView,
} from '../../../headless/utils/sendChatMessageView'
import { TOOL_ASK_COPY } from '../../../headless/utils/toolAskCardConstants'
import { IconChevron } from '../../icons'
import Markdown from '../Markdown'
import { renderProjectIcon } from '../projectIcons'

export type SendChatMessagePreviewProps = {
  view: SendChatMessageView
  /** The target project as the host knows it — fills what the payload left out. */
  project?: { title?: string; iconKey?: string }
  /** The source chat's name as the host knows it — fills what the payload left out. */
  sourceChatTitle?: string
  /**
   * Open the target chat. Omitted ⇒ the target is named as plain text and the
   * card offers no "Open target chat" — never a link nothing answers.
   */
  onOpenTarget?: () => void
  /** Start with a long message unfolded. */
  defaultExpanded?: boolean
  /** Start with the raw payload of a malformed request shown. */
  defaultRawOpen?: boolean
}

const OUTCOME_TONE: Record<SendChatMessageOutcomeStatus, string> = {
  awaiting: 'badge--review',
  sending: 'badge--working',
  sent: 'badge--done',
  denied: 'badge--stuck',
  failed: 'badge--stuck',
  cancelled: 'badge--stuck',
}

const LABEL = 'text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)'

/**
 * What `sendChatMessage` will post, and where — the agent speaking for the user
 * in another chat. Used on the inline tool row and hover preview; the dock uses
 * the shared tool-ask `message` body instead.
 */
export default function SendChatMessagePreview({
  view,
  project,
  sourceChatTitle,
  onOpenTarget,
  defaultExpanded = false,
  defaultRawOpen = false,
}: SendChatMessagePreviewProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [rawOpen, setRawOpen] = useState(defaultRawOpen)

  const projectTitle = project?.title
  const iconKey = project?.iconKey
  const chatTitle = view.target.chatTitle
  const source = view.source.chatTitle ?? sourceChatTitle
  const folded = view.message !== undefined ? collapsedMessage(view.message) : undefined
  const shown = folded !== undefined && !expanded ? folded : view.message
  const decided = view.outcome.status !== 'awaiting' && view.outcome.status !== 'sending'
  const incomplete = view.missing.length > 0

  const link = onOpenTarget ? view.link : undefined
  const openTarget = (e: MouseEvent) => {
    e.preventDefault()
    onOpenTarget?.()
  }

  // Project from host lookup; chat title from payload `targetTitle` / result.
  // Fall back to the host's readable label, never "Unknown project" for a chat.
  const primary =
    projectTitle ??
    chatTitle ??
    view.target.label ??
    view.target.projectId ??
    TOOL_ASK_COPY.unknownChat
  const secondary =
    projectTitle && chatTitle
      ? chatTitle
      : projectTitle && view.target.label && view.target.label !== projectTitle
        ? view.target.label
        : undefined

  const targetLabel = (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span aria-hidden className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
        {renderProjectIcon(iconKey, 'h-4 w-4')}
      </span>
      <span className="truncate font-medium text-(--text-primary)" data-testid="scm-target-project">
        {primary}
      </span>
      {secondary ? (
        <span className="truncate text-(--text-secondary)" data-testid="scm-target-chat">
          · {secondary}
        </span>
      ) : null}
    </span>
  )

  return (
    <div className="flex flex-col gap-2.5 text-[12.5px]" data-testid="send-chat-message-preview">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className={LABEL}>{TOOL_ASK_COPY.from}</span>
        <span className="truncate text-(--text-secondary)" data-testid="scm-source">
          {source ?? TOOL_ASK_COPY.unknownChat}
        </span>
        <span aria-hidden className="text-(--text-muted)">
          →
        </span>
        <span className={LABEL}>{TOOL_ASK_COPY.to}</span>
        {link ? (
          <a
            href={link}
            onClick={openTarget}
            className="min-w-0 rounded-sm hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            data-testid="scm-target-link"
          >
            {targetLabel}
          </a>
        ) : (
          targetLabel
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {view.awaitReply ? (
          <span className="badge badge--soft badge--sm" data-testid="scm-await-reply">
            {COPY.waitsForReply}
          </span>
        ) : null}
        {view.held ? (
          <span className="badge badge--soft badge--working badge--sm" data-testid="scm-held">
            <span className="badge__dot" />
            {COPY.held}
          </span>
        ) : null}
        {view.agentStarted ? (
          <span
            className="badge badge--soft badge--working badge--sm"
            data-testid="scm-agent-started"
          >
            <span className="badge__dot" />
            {COPY.agentStarted}
          </span>
        ) : null}
        <span className="text-[11.5px] text-(--text-muted)" data-testid="scm-sender">
          {source ? TOOL_ASK_COPY.sentBy(source) : TOOL_ASK_COPY.sentByUnknown}
        </span>
      </div>

      {/* Accent bubble with onAccent markdown so fenced code and links stay readable. */}
      <div className="flex flex-col items-end gap-1">
        <div
          className={[
            'max-w-full overflow-x-auto rounded-2xl rounded-br-md bg-(--accent-primary) px-3 py-1.5',
            'text-(--text-inverted) shadow break-words',
          ].join(' ')}
          data-testid="scm-message"
        >
          {shown !== undefined ? (
            <Markdown text={shown} onAccent />
          ) : (
            <span className="italic opacity-80">{TOOL_ASK_COPY.noMessage}</span>
          )}
        </div>
        {folded !== undefined ? (
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
            className="text-[11.5px] text-(--accent-primary) hover:underline"
            data-testid="scm-toggle"
          >
            {expanded ? TOOL_ASK_COPY.showLess : TOOL_ASK_COPY.showMore}
          </button>
        ) : null}
      </div>

      {incomplete ? (
        <div className="flex flex-col gap-1" data-testid="scm-incomplete">
          <span className="text-[11.5px] text-(--status-stuck-soft-fg)">{COPY.incomplete}</span>
          <button
            type="button"
            aria-expanded={rawOpen}
            onClick={() => setRawOpen((v) => !v)}
            className="inline-flex w-fit items-center gap-1 text-[11.5px] text-(--text-secondary) hover:text-(--text-primary)"
          >
            <IconChevron className={`h-3 w-3 transition-transform ${rawOpen ? 'rotate-90' : ''}`} />
            {TOOL_ASK_COPY.rawPayload}
          </button>
          {rawOpen ? (
            <pre
              className="max-h-40 overflow-auto rounded-md bg-(--surface-muted) p-2 font-mono text-[11px] whitespace-pre-wrap wrap-break-word"
              data-testid="scm-raw"
            >
              {view.raw}
            </pre>
          ) : null}
        </div>
      ) : null}

      {view.outcome.status !== 'awaiting' ? (
        <div
          className="flex flex-wrap items-center gap-2 border-t border-(--border-subtle) pt-2"
          data-testid="scm-outcome"
        >
          <span className={`badge badge--soft badge--sm ${OUTCOME_TONE[view.outcome.status]}`}>
            <span className="badge__dot" />
            {SEND_CHAT_MESSAGE_OUTCOME_LABEL[view.outcome.status]}
          </span>
          {view.outcome.detail ? (
            <span className="text-[11.5px] text-(--text-secondary)">{view.outcome.detail}</span>
          ) : null}
          {decided && link ? (
            <a
              href={link}
              onClick={openTarget}
              className="ml-auto text-[11.5px] font-medium text-(--accent-primary) hover:underline"
              data-testid="scm-open-target"
            >
              {COPY.openTarget} →
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
