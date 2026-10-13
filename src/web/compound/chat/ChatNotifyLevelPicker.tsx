import { useState } from 'react'
import type { ChatContext } from '../../../headless/api'
import { useChatNotifyLevel } from '../../../headless/hooks/useChatNotifyLevel'
import {
  CHAT_NOTIFY_SAVE_FAILED,
  NOTIFY_ME_TITLE,
} from '../../../headless/utils/chatNotifyConstants'
import type { ChatNotifyLevel } from '../../../headless/utils/chatNotifyTypes'
import { IconCheck } from '../../icons'

export type ChatNotifyLevelPickerProps = {
  context: ChatContext
  /** Called once a choice is saved — a menu closes itself here. */
  onPicked?: () => void
}

/**
 * A chat's "Notify me": its kind's level, or one of its own — Everything,
 * When it needs me, Nothing. The chat settings menu opens it.
 */
export default function ChatNotifyLevelPicker({ context, onPicked }: ChatNotifyLevelPickerProps) {
  const { options, setLevel } = useChatNotifyLevel(context)
  const [failed, setFailed] = useState(false)
  const pick = (level: ChatNotifyLevel | undefined) => {
    setFailed(false)
    setLevel(level)
      .then(() => onPicked?.())
      .catch(() => setFailed(true))
  }
  return (
    <div role="radiogroup" aria-label={NOTIFY_ME_TITLE} className="flex flex-col py-1">
      <div className="px-3 pt-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-(--text-secondary)">
        {NOTIFY_ME_TITLE}
      </div>
      {options.map((option) => (
        <button
          key={option.value ?? 'default'}
          type="button"
          role="radio"
          aria-checked={option.selected}
          onClick={() => pick(option.value)}
          className="flex items-center gap-2 px-3 py-1.5 text-left text-[13px] text-(--text-primary) hover:bg-(--surface-hover)"
        >
          <span className="inline-flex w-4 shrink-0 justify-center">
            {option.selected ? <IconCheck className="h-3.5 w-3.5" /> : null}
          </span>
          {option.label}
        </button>
      ))}
      {failed ? (
        <div role="alert" className="px-3 pt-1 text-[12px] text-(--color-red-600)">
          {CHAT_NOTIFY_SAVE_FAILED}
        </div>
      ) : null}
    </div>
  )
}
