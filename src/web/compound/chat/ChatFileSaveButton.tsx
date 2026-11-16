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
  /**
   * `overlay` on an image or a video's poster, in its corner; `chip` inside a
   * file's chip; `button` in a full-size view's or a preview's header.
   */
  variant: 'overlay' | 'chip' | 'button'
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

  const look =
    variant === 'overlay'
      ? [
          'h-7 w-7 rounded-md bg-black/60 hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-white',
          saved ? 'text-(--accent-primary)' : 'text-white',
        ]
      : [
          'h-[18px] w-[18px] rounded-full hover:bg-(--surface-hover) focus-visible:outline-2 focus-visible:outline-(--accent-primary)',
          saved ? 'text-(--accent-primary)' : 'text-current',
        ]
  return (
    <>
      <Tooltip content={tip}>
        <button
          type="button"
          onClick={onOpen}
          aria-label={tip}
          className={[
            'inline-flex shrink-0 cursor-pointer items-center justify-center',
            ...look,
          ].join(' ')}
        >
          {saved ? <IconCheck className="w-3.5 h-3.5" /> : <IconSave className="w-3.5 h-3.5" />}
        </button>
      </Tooltip>
      {dialog}
    </>
  )
}
