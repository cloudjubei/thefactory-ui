import { attachmentDisplayName } from 'thefactory-tools/utils'
import Tooltip from '../../primitives/Tooltip'
import { Button } from '../../primitives/Button'
import { IconClose, IconEdit, IconHourglass, IconPause } from '../../icons'
import { pendingStackView } from '../../../headless/utils/chatDraft'
import { PENDING_STACK_TEXT } from '../../../headless/utils/chatDraftConstants'
import type { ChatPendingQueue } from '../../../headless/hooks/useChatComposer'

export type PendingMessagesStackProps = {
  queue: ChatPendingQueue
  /** A turn is running in this chat. */
  busy: boolean
}

/**
 * Messages sent while the agent was busy, stacked directly above the composer.
 * Each can go back into the composer or be dropped; the stack goes out as one
 * message when the turn ends, or at once from "Send now".
 */
export default function PendingMessagesStack({ queue, busy }: PendingMessagesStackProps) {
  if (queue.items.length === 0) return null
  const view = pendingStackView({
    busy,
    paused: queue.paused,
    mode: queue.sendNowMode,
    count: queue.items.length,
  })
  const StatusIcon = queue.paused ? IconPause : IconHourglass
  return (
    <div
      role="region"
      aria-label="Pending messages"
      className="shrink-0 flex flex-col gap-1 border-t border-(--border-subtle) bg-(--surface-raised) px-3 pt-2 pb-1"
    >
      <div className="flex items-center justify-between gap-2 text-[12px] text-(--text-secondary)">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <StatusIcon className="w-3.5 h-3.5 shrink-0" />
          <span className="font-medium text-(--text-primary)">{view.title}</span>
          <span className="truncate">· {view.status}</span>
        </span>
        <Tooltip content={view.sendHint} placement="top">
          <Button size="sm" variant="secondary" onClick={() => void queue.sendNow()}>
            {view.sendLabel}
          </Button>
        </Tooltip>
      </div>
      <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto">
        {queue.items.map((item) => (
          <li
            key={item.id}
            className="flex items-start gap-2 rounded-md border border-(--border-subtle) bg-(--surface-base) px-2 py-1.5 text-[13px] text-(--text-primary)"
          >
            <div className="min-w-0 flex-1">
              {item.text ? (
                <div className="line-clamp-2 whitespace-pre-wrap break-words">{item.text}</div>
              ) : (
                <div className="italic text-(--text-muted)">
                  {PENDING_STACK_TEXT.attachmentsOnly}
                </div>
              )}
              {item.attachments.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {item.attachments.map((path) => (
                    <span
                      key={path}
                      title={path}
                      className="max-w-[140px] truncate rounded-full border border-(--border-subtle) bg-(--surface-overlay) px-2 py-[1px] text-[11px] text-(--text-secondary)"
                    >
                      {attachmentDisplayName(path)}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <Tooltip content={PENDING_STACK_TEXT.edit} placement="top">
              <button
                type="button"
                onClick={() => queue.edit(item.id)}
                aria-label="Edit pending message"
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-(--surface-hover) focus:outline-none focus:ring-2 focus:ring-(--focus-ring)"
              >
                <IconEdit className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
            <Tooltip content={PENDING_STACK_TEXT.remove} placement="top">
              <button
                type="button"
                onClick={() => queue.remove(item.id)}
                aria-label="Remove pending message"
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-(--surface-hover) focus:outline-none focus:ring-2 focus:ring-(--focus-ring)"
              >
                <IconClose className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          </li>
        ))}
      </ul>
    </div>
  )
}
