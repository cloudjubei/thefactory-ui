import { useState, type MouseEvent } from 'react'
import type { ResourceLink } from 'thefactory-tools/types'
import { parseResourceLink } from 'thefactory-tools/utils'

import {
  collapsedMessage,
  sendChatMessageTargetLink,
} from '../../../headless/utils/sendChatMessageView'
import { TOOL_ASK_COPY } from '../../../headless/utils/toolAskCardConstants'
import type { ToolAskBody } from '../../../headless/utils/toolAskCardTypes'
import { useProjectsOptional } from '../../../headless/contexts/ProjectsContext'
import { Switch } from '../../primitives/Switch'
import { IconChevron } from '../../icons'
import Markdown from '../Markdown'
import { renderProjectIcon } from '../projectIcons'

export type MessageAskBodyProps = {
  body: Extract<ToolAskBody, { kind: 'message' }>
  /** The chat this dock is in — labels the sender. */
  sourceChatTitle?: string
  awaitReply: boolean
  onAwaitReply: (next: boolean) => void
  busy: boolean
  /** Route the target's `overseer://projects/<id>` link. */
  onResourceLink?: (link: ResourceLink) => void
}

/**
 * The shared `message` body on a tool-ask card: route (source → target with
 * project icon), the message as a user bubble (markdown with onAccent chrome),
 * fold/Show more, raw-JSON fallback, sender line, and wait-for-reply.
 */
export default function MessageAskBody({
  body,
  sourceChatTitle,
  awaitReply,
  onAwaitReply,
  busy,
  onResourceLink,
}: MessageAskBodyProps) {
  const [expanded, setExpanded] = useState(false)
  const [rawOpen, setRawOpen] = useState(false)
  const projects = useProjectsOptional()?.projects
  const found = body.targetProjectId
    ? projects?.find((p) => p.id === body.targetProjectId)
    : undefined
  const icon =
    found && typeof (found as { metadata?: { icon?: unknown } }).metadata?.icon === 'string'
      ? ((found as { metadata?: { icon?: string } }).metadata?.icon as string)
      : undefined
  // Backend: targetTitle is the target CHAT's title; the project comes from targetProjectId.
  const chatTitle = body.targetTitle
  const projectTitle = found?.title
  const primary = projectTitle ?? chatTitle ?? body.target
  const secondary =
    projectTitle && chatTitle
      ? chatTitle
      : projectTitle && body.target !== projectTitle
        ? body.target
        : undefined
  const folded = body.message ? collapsedMessage(body.message) : undefined
  const shown = folded !== undefined && !expanded ? folded : body.message
  const link =
    onResourceLink && body.targetProjectId
      ? sendChatMessageTargetLink(body.targetProjectId)
      : undefined
  const openTarget = (e: MouseEvent) => {
    e.preventDefault()
    if (!link || !onResourceLink) return
    const parsed = parseResourceLink(link)
    if (parsed) onResourceLink(parsed)
  }

  const targetChip = (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span aria-hidden className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
        {renderProjectIcon(icon, 'h-4 w-4')}
      </span>
      <span className="truncate font-medium text-(--text-primary)">{primary}</span>
      {secondary ? <span className="truncate text-(--text-secondary)">· {secondary}</span> : null}
    </span>
  )

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
          {TOOL_ASK_COPY.from}
        </span>
        <span className="truncate text-(--text-secondary)">
          {sourceChatTitle ?? TOOL_ASK_COPY.unknownChat}
        </span>
        <span aria-hidden className="text-(--text-muted)">
          →
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
          {TOOL_ASK_COPY.to}
        </span>
        {link ? (
          <a
            href={link}
            onClick={openTarget}
            className="min-w-0 rounded-sm hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            {targetChip}
          </a>
        ) : (
          targetChip
        )}
      </div>

      <span className="text-[11.5px] text-(--text-muted)">
        {sourceChatTitle ? TOOL_ASK_COPY.sentBy(sourceChatTitle) : TOOL_ASK_COPY.sentByUnknown}
      </span>

      {/* Accent bubble — onAccent keeps fenced code and links readable. */}
      <div className="flex flex-col items-end gap-1">
        <div
          className={[
            'max-w-full overflow-x-auto rounded-2xl rounded-br-md bg-(--accent-primary) px-3 py-1.5',
            'text-(--text-inverted) shadow break-words',
          ].join(' ')}
        >
          {shown ? (
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
          >
            {expanded ? TOOL_ASK_COPY.showLess : TOOL_ASK_COPY.showMore}
          </button>
        ) : null}
      </div>

      {body.incomplete ? (
        <div className="flex flex-col gap-1">
          <span className="text-[11.5px] text-(--status-stuck-soft-fg)">
            {TOOL_ASK_COPY.incompleteMessage}
          </span>
          {body.raw !== undefined ? (
            <>
              <button
                type="button"
                aria-expanded={rawOpen}
                onClick={() => setRawOpen((v) => !v)}
                className="inline-flex w-fit items-center gap-1 text-[11.5px] text-(--text-secondary) hover:text-(--text-primary)"
              >
                <IconChevron
                  className={`h-3 w-3 transition-transform ${rawOpen ? 'rotate-90' : ''}`}
                />
                {TOOL_ASK_COPY.rawPayload}
              </button>
              {rawOpen ? (
                <pre className="max-h-40 overflow-auto rounded-md bg-(--surface-muted) p-2 font-mono text-[11px] whitespace-pre-wrap wrap-break-word">
                  {body.raw}
                </pre>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}

      <Switch
        checked={awaitReply}
        onCheckedChange={onAwaitReply}
        disabled={busy}
        label={TOOL_ASK_COPY.waitForReply}
      />
    </>
  )
}
