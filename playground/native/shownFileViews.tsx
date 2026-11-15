import { View } from 'react-native'
import type { NativeAttachmentImages } from '../../src/native/compound/chat/chatNativeTypes'
import ChatFileSaveDialog from '../../src/native/compound/chat/ChatFileSaveDialog'
import MessageRow from '../../src/native/compound/chat/MessageRow'
import SentImageAttachment from '../../src/native/compound/chat/SentImageAttachment'
import {
  SAVE_DIALOG_STATES,
  SENT_BY_PERSON,
  SHOWN_MAP,
  SHOWN_PREVIEW_URI,
  SHOWN_REPLY,
  SHOWN_SAVING,
} from '../scenes/shownFilesFixtures'
import type { NativeView } from './views'

const noop = () => {}

const IMAGES: NativeAttachmentImages = {
  sourceOf: (path) => {
    const uri = SHOWN_PREVIEW_URI(path)
    return uri ? { uri } : undefined
  },
}

function Reply() {
  const messages = [SENT_BY_PERSON, SHOWN_REPLY]
  return (
    <View style={{ padding: 16, gap: 24, width: 390, maxWidth: '100%' }}>
      {messages.map((msg, i) => (
        <MessageRow
          key={msg.id}
          msg={msg}
          globalIndex={i}
          totalMessages={messages.length}
          isThinking={false}
          isLast={i === messages.length - 1}
          prevUserMessagesLen={1}
          enhancedTotalLength={messages.length}
          attachmentImages={IMAGES}
          fileSaving={SHOWN_SAVING}
        />
      ))}
    </View>
  )
}

/**
 * Files an agent showed, on mobile: `?view=chat-shown-files&state=reply|viewer|dialog|dialog-exists|dialog-refused`.
 */
export const SHOWN_FILE_VIEWS: readonly NativeView[] = [
  {
    id: 'chat-shown-files',
    title: 'Files an agent showed',
    render: (address) => {
      const state = address.get('state')
      if (state === 'viewer') {
        return (
          <SentImageAttachment path={SHOWN_MAP} images={IMAGES} saving={SHOWN_SAVING} defaultOpen />
        )
      }
      const kind =
        state === 'dialog'
          ? 'new'
          : state === 'dialog-exists'
            ? 'exists'
            : state === 'dialog-refused'
              ? 'refused'
              : undefined
      if (kind) {
        return (
          <ChatFileSaveDialog
            isOpen
            source={SHOWN_MAP}
            state={SAVE_DIALOG_STATES[kind]}
            onSave={noop}
            onCancel={noop}
          />
        )
      }
      return <Reply />
    },
  },
]
