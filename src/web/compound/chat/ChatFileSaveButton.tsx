import { useState, type MouseEvent } from 'react'
import { Button } from '../../primitives/Button'
import Tooltip from '../../primitives/Tooltip'
import { IconCheck, IconSave } from '../../icons'
import { useChatFileSave } from '../../../headless/hooks/useChatFileSave'
import { chatFileSaveShownAsSaved } from '../../../headless/utils/chatFileSave'
import { CHAT_FILE_SAVE_COPY } from '../../../headless/utils/chatFileSaveConstants'
import type { ChatFileSaving } from '../../../headless/utils/chatFileSaveTypes'
import ChatFileSaveDialog from './ChatFileSaveDialog'

export type ChatFileSaveButtonProps = {
  /** The shown file, project-relative. */
  source: string
  saving: ChatFileSaving
  /** `icon` beside a file chip; `button` in the full-size view's header. */
  variant: 'icon' | 'button'
}

/**
 * "Save to project" for a file an agent showed. Reads as saved the moment Save
 * is pressed; a failure takes that back and opens the dialog again, saying why.
 */
export default function ChatFileSaveButton({ source, saving, variant }: ChatFileSaveButtonProps) {
  const { state, save, dismiss } = useChatFileSave(saving, source)
  const [open, setOpen] = useState(false)
  const [asked, setAsked] = useState(false)
  const saved = chatFileSaveShownAsSaved(state)
  const label = saved ? CHAT_FILE_SAVE_COPY.saved : CHAT_FILE_SAVE_COPY.action
  const tip =
    saved && state.status !== 'idle' ? `${label}: ${state.destination}` : CHAT_FILE_SAVE_COPY.action

  const onOpen = (e: MouseEvent) => {
    e.stopPropagation()
    setOpen(true)
  }

  const dialog = (
    <ChatFileSaveDialog
      isOpen={open || (asked && state.status === 'failed')}
      source={source}
      state={state}
      onSave={(destination, overwrite) => {
        setAsked(true)
        setOpen(false)
        save(destination, overwrite)
      }}
      onCancel={() => {
        setOpen(false)
        setAsked(false)
        dismiss()
      }}
    />
  )

  if (variant === 'button') {
    return (
      <>
        <Button type="button" variant="secondary" size="sm" onClick={onOpen} title={tip}>
          {saved ? <IconCheck className="w-4 h-4" /> : <IconSave className="w-4 h-4" />}
          {label}
        </Button>
        {dialog}
      </>
    )
  }

  return (
    <>
      <Tooltip content={tip}>
        <button
          type="button"
          onClick={onOpen}
          aria-label={tip}
          className={[
            'inline-flex items-center justify-center w-6 h-6 rounded-full border border-(--border-subtle) bg-(--surface-overlay) hover:bg-(--surface-hover)',
            saved ? 'text-(--accent-primary)' : 'text-(--text-secondary)',
          ].join(' ')}
        >
          {saved ? <IconCheck className="w-3.5 h-3.5" /> : <IconSave className="w-3.5 h-3.5" />}
        </button>
      </Tooltip>
      {dialog}
    </>
  )
}
