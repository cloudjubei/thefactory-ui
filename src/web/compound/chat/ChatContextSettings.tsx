import { useId, useState } from 'react'

import {
  applyChatHistoryShare,
  applyChatNotesTurns,
  buildChatContextSettings,
  CHAT_CONTEXT_SETTINGS_COPY,
  CHAT_HISTORY_SHARE_MAX,
  CHAT_HISTORY_SHARE_MIN,
  CHAT_HISTORY_SHARE_STEP,
  CHAT_NOTES_TURNS_MAX,
  CHAT_NOTES_TURNS_MIN,
  type ChatContextSettingsStored,
} from '../../../headless'
import { IconChevron } from '../../icons'

export type ChatContextSettingsProps = {
  completion: Partial<ChatContextSettingsStored>
  persistSettings: (patch: Partial<ChatContextSettingsStored>) => Promise<void> | void
  /** Opens with the section unfolded. */
  defaultOpen?: boolean
}

function SliderRow({
  label,
  hint,
  shown,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  hint: string
  shown: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}) {
  const id = useId()
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-(--text-secondary)" htmlFor={id}>
        {label}:<span className="pl-4 text-[14px] text-(--text-secondary)">{shown}</span>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
      <div className="text-[10px] text-(--text-tertiary)">{hint}</div>
    </div>
  )
}

/**
 * The advanced section of a chat's settings: how much history a chat picks up
 * again with, and when its notes count as old. Folded, as neither needs touching
 * in the ordinary run of things. The same on every model.
 */
export default function ChatContextSettings({
  completion,
  persistSettings,
  defaultOpen = false,
}: ChatContextSettingsProps) {
  const [open, setOpen] = useState(defaultOpen)
  const { historyShare, notesTurns } = buildChatContextSettings(completion)
  return (
    <div className="space-y-3 pt-2 border-t border-(--border-subtle)">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 text-xs font-medium text-(--text-secondary)"
      >
        {CHAT_CONTEXT_SETTINGS_COPY.section}
        <IconChevron
          className="size-3.5"
          style={{ transform: open ? 'rotate(90deg)' : undefined }}
        />
      </button>
      {open ? (
        <div className="space-y-3 pl-1">
          <SliderRow
            label={CHAT_CONTEXT_SETTINGS_COPY.historyShare}
            hint={CHAT_CONTEXT_SETTINGS_COPY.historyShareHint}
            shown={`${historyShare}%`}
            value={historyShare}
            min={CHAT_HISTORY_SHARE_MIN}
            max={CHAT_HISTORY_SHARE_MAX}
            step={CHAT_HISTORY_SHARE_STEP}
            onChange={(percent) => void persistSettings(applyChatHistoryShare(percent))}
          />
          <SliderRow
            label={CHAT_CONTEXT_SETTINGS_COPY.notesTurns}
            hint={CHAT_CONTEXT_SETTINGS_COPY.notesTurnsHint}
            shown={notesTurns === 0 ? CHAT_CONTEXT_SETTINGS_COPY.off : String(notesTurns)}
            value={notesTurns}
            min={CHAT_NOTES_TURNS_MIN}
            max={CHAT_NOTES_TURNS_MAX}
            step={1}
            onChange={(turns) => void persistSettings(applyChatNotesTurns(turns))}
          />
        </div>
      ) : null}
    </div>
  )
}
