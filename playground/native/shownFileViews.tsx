import { useState } from 'react'
import { View } from 'react-native'
import { ApiProvider, AuthProvider } from 'thefactory-ui/headless'
import { ChatFileChipLookContext } from '../../src/headless/contexts/ChatFileChipLookContext'
import { CHAT_FILE_CHIP_LOOK } from '../../src/headless/utils/chatFileChipConstants'
import type { ChatFileChipLook } from '../../src/headless/utils/chatFileChipTypes'
import type { ChatMessageLike } from '../../src/headless/utils/chatTypes'
import type { NativeAttachmentImages } from '../../src/native/compound/chat/chatNativeTypes'
import ChatFilePreviewSheet from '../../src/native/compound/chat/ChatFilePreviewSheet'
import ChatFileSaveDialog from '../../src/native/compound/chat/ChatFileSaveDialog'
import MessageRow from '../../src/native/compound/chat/MessageRow'
import SentImageAttachment from '../../src/native/compound/chat/SentImageAttachment'
import { DesignHostProvider } from '../../src/native/compound/design/DesignHostContext'
import {
  SAVE_DIALOG_STATES,
  SENT_BY_PERSON,
  SENT_SCENARIO,
  SENT_SKETCH_BY_PERSON,
  SHOWN_CLIP_CHAT,
  SHOWN_CLIP_REPLY,
  SHOWN_CHIPS_REPLY,
  SHOWN_MAP,
  SHOWN_MIXED_REPLY,
  SHOWN_NOTES,
  SHOWN_PREVIEW_URI,
  SHOWN_REPLY,
  SHOWN_ROSTER,
  SHOWN_RULES,
  SHOWN_SAVING,
  SHOWN_TAKES_REPLY,
  SHOWN_V3,
  shownSourceOf,
} from '../scenes/shownFilesFixtures'
import { HOST, Phone } from './filePreviewViews'
import type { NativeView } from './views'

const noop = () => {}

const IMAGES: NativeAttachmentImages = {
  sourceOf: (path) => {
    const uri = SHOWN_PREVIEW_URI(path)
    return uri ? { uri } : undefined
  },
}

function Reply({
  messages,
  video = false,
  look = CHAT_FILE_CHIP_LOOK,
}: {
  messages: ChatMessageLike[]
  video?: boolean
  look?: ChatFileChipLook
}) {
  const rows = (
    <ChatFileChipLookContext.Provider value={look}>
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
            {...(video ? { videoAttachments: SHOWN_CLIP_CHAT } : {})}
          />
        ))}
      </View>
    </ChatFileChipLookContext.Provider>
  )
  if (!video) return <DesignHostProvider value={HOST}>{rows}</DesignHostProvider>
  return (
    <AuthProvider storage={{ read: () => null, write: noop }}>
      <ApiProvider apiBaseUrl={null} wsBaseUrl={null} client="web">
        <DesignHostProvider value={HOST}>{rows}</DesignHostProvider>
      </ApiProvider>
    </AuthProvider>
  )
}

/** A file on a message opened in the document preview on a phone, read from the chat's fixture files. */
function Preview({ path, shown }: { path: string; shown: boolean }) {
  const [open, setOpen] = useState(true)
  return (
    <DesignHostProvider value={HOST}>
      <View style={{ alignItems: 'center', padding: 12 }}>
        <Phone>
          <ChatFilePreviewSheet
            path={open ? path : null}
            sourceOf={shownSourceOf}
            onClose={() => setOpen(false)}
            {...(shown ? { saving: SHOWN_SAVING } : {})}
          />
        </Phone>
      </View>
    </DesignHostProvider>
  )
}

const CHIP_LOOKS: Record<string, ChatFileChipLook> = {
  'chip-a': 'pill',
  'chip-b': 'labelled',
  'chip-c': 'tile',
}

const PREVIEWS: Record<string, { path: string; shown: boolean }> = {
  'preview-pdf': { path: SHOWN_RULES, shown: true },
  'preview-csv': { path: SHOWN_ROSTER, shown: true },
  'preview-markdown': { path: SHOWN_NOTES, shown: true },
  'preview-own': { path: SENT_SCENARIO, shown: false },
}

/**
 * Files an agent showed, on mobile: `?view=chat-shown-files&state=reply|names|name-whole|other-files|save-on-image|save-on-video|chip-a|chip-b|chip-c|preview-pdf|preview-csv|preview-markdown|preview-own|viewer|dialog|dialog-exists|dialog-refused`.
 */
export const SHOWN_FILE_VIEWS: readonly NativeView[] = [
  {
    id: 'chat-shown-files',
    title: 'Files an agent showed',
    render: (address) => {
      const state = address.get('state')
      if (state === 'names') return <Reply messages={[SENT_SKETCH_BY_PERSON, SHOWN_TAKES_REPLY]} />
      if (state === 'other-files') {
        return <Reply messages={[SENT_BY_PERSON, SHOWN_MIXED_REPLY]} video />
      }
      if (state === 'save-on-image') {
        return (
          <View style={{ padding: 16 }}>
            <SentImageAttachment path={SHOWN_MAP} images={IMAGES} saving={SHOWN_SAVING} />
          </View>
        )
      }
      if (state === 'save-on-video') return <Reply messages={[SHOWN_CLIP_REPLY]} video />
      const look = state ? CHIP_LOOKS[state] : undefined
      if (look) return <Reply messages={[SENT_BY_PERSON, SHOWN_CHIPS_REPLY]} look={look} />
      const preview = state ? PREVIEWS[state] : undefined
      if (preview) return <Preview path={preview.path} shown={preview.shown} />
      if (state === 'name-whole') {
        return (
          <View style={{ padding: 16 }}>
            <SentImageAttachment path={SHOWN_V3} images={IMAGES} defaultWholeName />
          </View>
        )
      }
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
      return <Reply messages={[SENT_BY_PERSON, SHOWN_REPLY]} />
    },
  },
]
