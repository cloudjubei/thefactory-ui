import Tooltip from '../../primitives/Tooltip'
import { Button } from '../../primitives/Button'
import { IconHourglass } from '../../icons'
import { HELD_STACK_TEXT } from '../../../headless/utils/heldAgentMessagesConstants'
import type { UseHeldAgentMessages } from '../../../headless/hooks/useHeldAgentMessages'

export type HeldAgentMessagesStackProps = {
  held: UseHeldAgentMessages
}

/**
 * Messages other agents sent this chat while it was busy, held — pending — until
 * it is free, above whatever holds the bottom of the chat: the composer, or an
 * approval the chat waits on, which is often why they are held. Each can be
 * delivered now or dropped.
 */
export default function HeldAgentMessagesStack({ held }: HeldAgentMessagesStackProps) {
  if (held.items.length === 0) return null
  return (
    <div
      role="region"
      aria-label={HELD_STACK_TEXT.title}
      className="shrink-0 flex flex-col gap-1 border-t border-(--border-subtle) bg-(--surface-raised) px-3 pt-2 pb-1"
    >
      <div className="inline-flex items-center gap-1.5 text-[12px] font-medium text-(--text-primary)">
        <IconHourglass className="w-3.5 h-3.5 shrink-0 text-(--text-secondary)" />
        {HELD_STACK_TEXT.title}
      </div>
      <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto">
        {held.items.map((item) => (
          <li
            key={item.id}
            className="flex items-start gap-2 rounded-md border border-(--border-subtle) bg-(--surface-base) px-2 py-1.5 text-[13px] text-(--text-primary)"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-(--text-secondary)">
                {HELD_STACK_TEXT.from} {item.from} · {item.waitingFor}
              </div>
              <div className="line-clamp-3 whitespace-pre-wrap break-words">{item.body}</div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Tooltip content={HELD_STACK_TEXT.deliverNowHint} placement="top">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={held.workingId !== undefined}
                  onClick={() => void held.deliverNow(item.id)}
                >
                  {HELD_STACK_TEXT.deliverNow}
                </Button>
              </Tooltip>
              <Tooltip content={HELD_STACK_TEXT.discardHint} placement="top">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={held.workingId !== undefined}
                  onClick={() => void held.discard(item.id)}
                >
                  {HELD_STACK_TEXT.discard}
                </Button>
              </Tooltip>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
