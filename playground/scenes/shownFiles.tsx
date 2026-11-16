import { useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ApiProvider, AuthProvider, type ChatVideoAttachments } from 'thefactory-ui/headless'
import { MessageRow, type ChatMessageLike } from 'thefactory-ui/web'
// Not on the package's public surface: the message draws these itself. The showcase reaches into
// the source to draw each state, as the playground renders from source.
import { chatFileSaveStore } from '../../src/headless/hooks/chatFileSaveStore'
import type { ChatFileSaving } from '../../src/headless/utils/chatFileSaveTypes'
import ChatFilePreviewDialog from '../../src/web/compound/chat/ChatFilePreviewDialog'
import ChatFileSaveDialog from '../../src/web/compound/chat/ChatFileSaveDialog'
import SentImageAttachment from '../../src/web/compound/chat/SentImageAttachment'
import type { Scene } from '../showcase/types'
import {
  SAVE_DIALOG_STATES,
  SENT_BY_PERSON,
  SENT_SCENARIO,
  SENT_SKETCH_BY_PERSON,
  SHOWN_CLIP_CHAT,
  SHOWN_CLIP_REPLY,
  SHOWN_DOCS_REPLY,
  SHOWN_MAP,
  SHOWN_MIXED_REPLY,
  SHOWN_NOTES,
  SHOWN_REPLY,
  SHOWN_ROSTER,
  SHOWN_RULES,
  SHOWN_SAVING,
  SHOWN_TAKES_REPLY,
  shownPreviewUrl,
  shownSourceOf,
} from './shownFilesFixtures'

const noop = () => {}

/** A project whose save of the map is under way for good: it reads as saved, as it does at once. */
const SAVED_SAVING: ChatFileSaving = {
  projectId: 'showcase-shown-saved',
  save: () => new Promise(() => {}),
}

function Rows({
  messages,
  saving,
  videoAttachments,
}: {
  messages: ChatMessageLike[]
  saving: ChatFileSaving
  videoAttachments?: ChatVideoAttachments
}) {
  return (
    <div className="flex max-w-3xl flex-col gap-3">
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
          getAttachmentPreviewUrl={shownPreviewUrl}
          fileSaving={saving}
          {...(videoAttachments ? { videoAttachments } : {})}
        />
      ))}
    </div>
  )
}

/** The reply with the map already saved — seeded once, before the row reads it. */
function SavedReply() {
  useState(() => {
    for (const source of [SHOWN_MAP, SHOWN_NOTES]) {
      void chatFileSaveStore.save({
        projectId: SAVED_SAVING.projectId,
        source,
        destination: source === SHOWN_MAP ? 'art/battle-map.png' : 'placement-notes.md',
        ...(SAVED_SAVING.save ? { call: SAVED_SAVING.save } : {}),
      })
    }
    return true
  })
  return <Rows messages={[SHOWN_REPLY]} saving={SAVED_SAVING} />
}

/** Signed out with no backend: the video reads its fixed digest, and nothing is asked of a server. */
function VideoReply({ messages }: { messages: ChatMessageLike[] }) {
  return (
    <AuthProvider storage={{ read: () => null, write: noop }}>
      <ApiProvider apiBaseUrl={null} wsBaseUrl={null} client="web">
        <MemoryRouter>
          <Rows messages={messages} saving={SHOWN_SAVING} videoAttachments={SHOWN_CLIP_CHAT} />
        </MemoryRouter>
      </ApiProvider>
    </AuthProvider>
  )
}

/** A file on a message opened in the document preview, read from the chat's fixture files. */
function Preview({ path, shown }: { path: string; shown: boolean }) {
  const [open, setOpen] = useState(true)
  return (
    <ChatFilePreviewDialog
      path={open ? path : null}
      sourceOf={shownSourceOf}
      onClose={() => setOpen(false)}
      {...(shown ? { saving: SHOWN_SAVING } : {})}
    />
  )
}

function Dialog({ kind }: { kind: keyof typeof SAVE_DIALOG_STATES }) {
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

const DIALOG_CHOICES = [
  { id: 'closed', label: 'Closed' },
  { id: 'new', label: 'Save' },
  { id: 'exists', label: 'Already there' },
  { id: 'refused', label: 'Refused path' },
] as const

export const SHOWN_FILE_SCENES: Scene[] = [
  {
    id: 'chat-shown-files',
    title: 'Files an agent showed',
    component:
      'MessageRow (MessageFiles, AttachmentFileChip, ChatFileSaveButton, ChatFileSaveDialog, ChatFilePreviewDialog)',
    group: 'Chat',
    description:
      'Files an agent shows sit under its reply, drawn exactly as a person’s attachments are — images as thumbnails that open full size, other files as chips — but left-aligned with the reply. Every thumbnail carries the file’s name under it, the store’s random prefix taken off and cut short to the thumbnail’s width (whole on hover on web, on a long press on mobile), so a reply that speaks of V1 and V3 can be matched to its pictures. Save to project is part of every preview of a shown file: in the corner of an image or a video’s poster, inside a document’s chip, and as a button in the full-size view and the document preview. A document chip — the agent’s or the person’s — opens the document preview, read from the chat’s own files; only a file an agent showed has Save. Save reads as saved at once; a failure takes that back and reopens the dialog with the reason.',
    states: [
      {
        id: 'reply',
        title: 'Reply with shown files',
        description:
          'Two images and a notes file under the reply. Every file has Save to project — in the corner of each image, inside the notes chip; pressing it opens the dialog.',
        render: () => <Rows messages={[SENT_BY_PERSON, SHOWN_REPLY]} saving={SHOWN_SAVING} />,
      },
      {
        id: 'names',
        title: 'Names under images',
        description:
          'The reply speaks of V1, V2 and V3; the name under each thumbnail says which is which. The person’s own sketch carries its name too. A name longer than the thumbnail is cut short — hover shows it whole.',
        render: () => (
          <Rows messages={[SENT_SKETCH_BY_PERSON, SHOWN_TAKES_REPLY]} saving={SHOWN_SAVING} />
        ),
      },
      {
        id: 'other-files',
        title: 'Video and other files',
        description:
          'Any file can be shown, not only images: a video plays from its poster as a person’s video does, and a PDF or spreadsheet is a chip that opens the document preview. Save to project sits in the poster’s corner and inside each chip. The person’s own PDF opens the preview too, without Save.',
        render: () => <VideoReply messages={[SENT_BY_PERSON, SHOWN_MIXED_REPLY]} />,
      },
      {
        id: 'save-on-image',
        title: 'Save on the thumbnail',
        description:
          'Save to project in the thumbnail’s top corner, always in view. Pressing it opens the save dialog, not the image; the rest of the thumbnail opens it full size.',
        render: () => (
          <SentImageAttachment
            path={SHOWN_MAP}
            getPreviewUrl={shownPreviewUrl}
            saving={SHOWN_SAVING}
          />
        ),
      },
      {
        id: 'save-on-video',
        title: 'Save on the poster',
        description:
          'Save to project in the poster’s top corner, always in view. Full screen joins it there on hover; while the video plays in the card, Save stays beside full screen and collapse. The browser’s own full-screen player has no room for it.',
        render: () => <VideoReply messages={[SHOWN_CLIP_REPLY]} />,
      },
      {
        id: 'save-in-chip',
        title: 'Save in the chip',
        description:
          'A PDF, a spreadsheet and a markdown file: Save to project sits inside each chip, at its end. Pressing Save opens the save dialog; pressing the rest of the chip opens the document preview.',
        render: () => <Rows messages={[SHOWN_DOCS_REPLY]} saving={SHOWN_SAVING} />,
      },
      {
        id: 'preview-pdf',
        title: 'Document preview: PDF',
        description:
          'A shown PDF opened from its chip: the document preview, read from the chat’s files, with Save to project in its header beside Close.',
        overlay: true,
        render: () => <Preview path={SHOWN_RULES} shown />,
      },
      {
        id: 'preview-csv',
        title: 'Document preview: spreadsheet',
        description:
          'A shown CSV in the document preview, as text, with Save to project in its header.',
        overlay: true,
        render: () => <Preview path={SHOWN_ROSTER} shown />,
      },
      {
        id: 'preview-markdown',
        title: 'Document preview: markdown',
        description:
          'Shown markdown notes in the document preview, drawn as markdown with the source switch, Save to project in its header.',
        overlay: true,
        render: () => <Preview path={SHOWN_NOTES} shown />,
      },
      {
        id: 'preview-own',
        title: 'Person’s document in the preview',
        description:
          'The person’s own PDF opened from its chip: the same document preview, without Save — it is already theirs.',
        overlay: true,
        render: () => <Preview path={SENT_SCENARIO} shown={false} />,
      },
      {
        id: 'saved',
        title: 'Saved',
        description:
          'The map and the notes are saved: their buttons turn to a check, and the tooltip says where each went. The token sheet still offers Save.',
        render: () => <SavedReply />,
      },
      {
        id: 'viewer',
        title: 'Full-size view',
        description: 'An image opened full size: Save to project in the header, beside Close.',
        overlay: true,
        render: () => (
          <SentImageAttachment
            path={SHOWN_MAP}
            getPreviewUrl={shownPreviewUrl}
            saving={SHOWN_SAVING}
            defaultOpen
          />
        ),
      },
      {
        id: 'dialog',
        title: 'Save dialog',
        description:
          'One path, the file’s own name at the project root to start with — the store’s random prefix taken off. Save and Cancel.',
        overlay: true,
        render: () => <Dialog kind="new" />,
      },
      {
        id: 'dialog-exists',
        title: 'Already there',
        description:
          'The path is taken: the reason above the field, and Save turns to Replace. Changing the path turns it back to Save.',
        overlay: true,
        render: () => <Dialog kind="exists" />,
      },
      {
        id: 'dialog-refused',
        title: 'Refused path',
        description: 'A path the project refuses: the reason, and Save to try another.',
        overlay: true,
        render: () => <Dialog kind="refused" />,
      },
    ],
    controls: [
      {
        id: 'dialog',
        label: 'Dialog',
        kind: 'choice',
        options: DIALOG_CHOICES.map(({ id, label }) => ({ id, label })),
        default: 'closed',
      },
    ],
    presets: DIALOG_CHOICES.map(({ id, label }) => ({ id, name: label, values: { dialog: id } })),
    play: (values) => {
      const kind = values.dialog
      if (kind === 'new' || kind === 'exists' || kind === 'refused') return <Dialog kind={kind} />
      return <Rows messages={[SENT_BY_PERSON, SHOWN_REPLY]} saving={SHOWN_SAVING} />
    },
  },
]
