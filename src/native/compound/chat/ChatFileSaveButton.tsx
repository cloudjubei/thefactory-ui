import { useState } from 'react'
import { Pressable } from 'react-native'

import { Button } from '../../primitives/Button'
import { IconCheck, IconSave } from '../../icons'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { nativeRadii } from '../../../tokens/native'
import { useChatFileSave } from '../../../headless/hooks/useChatFileSave'
import { chatFileSaveShownAsSaved } from '../../../headless/utils/chatFileSave'
import { CHAT_FILE_SAVE_COPY } from '../../../headless/utils/chatFileSaveConstants'
import type { ChatFileSaving } from '../../../headless/utils/chatFileSaveTypes'
import ChatFileSaveDialog from './ChatFileSaveDialog'

export interface ChatFileSaveButtonProps {
  /** The shown file, project-relative. */
  source: string
  saving: ChatFileSaving
  /** `overlay` on an image or a video's poster, in its corner; `button` in a full-size view's or a preview's header. */
  variant: 'overlay' | 'button'
}

const SAVE_OVERLAY_BG = 'rgba(11,15,20,0.72)'

/**
 * "Save to project" for a file an agent showed. Reads as saved the moment Save
 * is pressed; a failure takes that back and opens the dialog again, saying why.
 * Native mirror of web's `ChatFileSaveButton`.
 */
export default function ChatFileSaveButton({ source, saving, variant }: ChatFileSaveButtonProps) {
  const { theme } = useNativeTheme()
  const { state, save, dismiss } = useChatFileSave(saving, source)
  const [open, setOpen] = useState(false)
  const [asked, setAsked] = useState(false)
  const saved = chatFileSaveShownAsSaved(state)
  const label = saved ? CHAT_FILE_SAVE_COPY.saved : CHAT_FILE_SAVE_COPY.action
  const a11y =
    saved && state.status !== 'idle' ? `${label}: ${state.destination}` : CHAT_FILE_SAVE_COPY.action

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

  const iconColor = saved
    ? theme.accent.primary
    : variant === 'overlay'
      ? '#ffffff'
      : theme.text.secondary

  if (variant === 'button') {
    return (
      <>
        <Button
          variant="secondary"
          size="sm"
          onPress={() => setOpen(true)}
          accessibilityLabel={a11y}
        >
          {saved ? (
            <IconCheck size={16} color={iconColor} />
          ) : (
            <IconSave size={16} color={iconColor} />
          )}
          {label}
        </Button>
        {dialog}
      </>
    )
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={a11y}
        onPress={() => setOpen(true)}
        hitSlop={8}
        style={{
          width: 32,
          height: 32,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: nativeRadii[3],
          backgroundColor: SAVE_OVERLAY_BG,
        }}
      >
        {saved ? (
          <IconCheck size={16} color={iconColor} />
        ) : (
          <IconSave size={16} color={iconColor} />
        )}
      </Pressable>
      {dialog}
    </>
  )
}
