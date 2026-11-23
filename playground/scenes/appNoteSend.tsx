import { useEffect, useRef, useState } from 'react'
import { useChatComposer, useLLMConfigs, type AppNote } from 'thefactory-ui/headless'
import type { Chat, ChatContext } from '../../src/headless/api/generated'
import { appendFakeChatMessages, fakeChatOf } from '../../src/fakeBackend/fixtures/chats'
import { FAKE_PROJECT_ID } from '../../src/fakeBackend/fixtures/projects'
import type { Scene } from '../showcase/types'
import { OnFixtures, type FixtureRoutes } from './onFixtures'

/**
 * Settled, once the send has come back: "Sent to the launching chat", then
 * "Look at the renewal date.", "#renewal", and "Make the renewal date easier to find."
 * Until then the line is "Sending the note to the launching chat…".
 */
export const APP_NOTE_SEND_TEXT = 'Look at the renewal date.'

export const APP_NOTE_CONTEXT: ChatContext = {
  type: 'PROJECT_TOPIC',
  projectId: FAKE_PROJECT_ID,
  topicId: 'app-note-send',
}

export const APP_NOTE: AppNote = {
  id: 'app-note-1',
  projectId: FAKE_PROJECT_ID,
  comment: 'Make the renewal date easier to find.',
  targets: [
    {
      kind: 'element',
      selector: '#renewal',
      outerHtml: '<p id="renewal">Renews November 20</p>',
    },
  ],
}

/** The writes a chat send makes, answered by the same store the fake backend uses. */
export const APP_NOTE_SEND_ROUTES: FixtureRoutes = {
  'POST /api/v1/chats/get': (_params, _query, body) =>
    fakeChatOf((body as { context?: ChatContext }).context ?? APP_NOTE_CONTEXT),
  'POST /api/v1/chats/messages': (_params, _query, body) => {
    const input = body as {
      context?: ChatContext
      messages?: NonNullable<Chat['messages']>
    }
    return appendFakeChatMessages(input.context ?? APP_NOTE_CONTEXT, input.messages ?? [])
  },
  'POST /api/v1/completions/send-with-tools': () => ({ resultType: 'success', results: [] }),
}

type SentNote =
  | { status: 'sending' }
  | { status: 'sent'; content: string; selector: string; comment: string }
  | { status: 'error'; message: string }

function sentFrom(chat: Chat): SentNote {
  const message = [...(chat.messages ?? [])]
    .reverse()
    .find((item) => item.appNotes?.some((note) => note.id === APP_NOTE.id))
  const note = message?.appNotes?.find((item) => item.id === APP_NOTE.id)
  const target = note?.targets[0]
  if (!message || !note || !target || target.kind !== 'element') {
    return { status: 'error', message: 'The note was not on the sent message.' }
  }
  return {
    status: 'sent',
    content: message.content,
    selector: target.selector,
    comment: note.comment,
  }
}

let flight: Promise<SentNote> | undefined

/** One send for the life of the page, so a remount does not post the note again. */
function sendNoteOnce(send: () => Promise<SentNote>): Promise<SentNote> {
  flight ??= send().catch((err: unknown) => ({
    status: 'error' as const,
    message: err instanceof Error ? err.message : 'The note was not sent.',
  }))
  return flight
}

export function useSentAppNote(): SentNote {
  const { isLoaded, activeChatConfig } = useLLMConfigs()
  const composer = useChatComposer(APP_NOTE_CONTEXT)
  const composerRef = useRef(composer)
  composerRef.current = composer
  const [sent, setSent] = useState<SentNote>({ status: 'sending' })
  useEffect(() => {
    if (!isLoaded || !activeChatConfig) return
    let cancel = false
    const timer = setTimeout(() => {
      const current = composerRef.current
      void sendNoteOnce(async () => {
        current.setAppNotes([APP_NOTE])
        await current.send(APP_NOTE_SEND_TEXT)
        return sentFrom(fakeChatOf(APP_NOTE_CONTEXT))
      }).then((next) => {
        if (!cancel) setSent(next)
      })
    }, 0)
    return () => {
      cancel = true
      clearTimeout(timer)
    }
  }, [isLoaded, activeChatConfig])
  return sent
}

function SentNoteLines({ sent }: { sent: SentNote }) {
  if (sent.status === 'sending') return <p>Sending the note to the launching chat…</p>
  if (sent.status === 'error') return <p>{sent.message}</p>
  return (
    <div>
      <p>Sent to the launching chat</p>
      <p>{sent.content}</p>
      <p>{sent.selector}</p>
      <p>{sent.comment}</p>
    </div>
  )
}

function SendNote() {
  const sent = useSentAppNote()
  return <SentNoteLines sent={sent} />
}

export const APP_NOTE_SEND_SCENES: Scene[] = [
  {
    id: 'app-note-send',
    title: 'Send an app note',
    component: 'useChatComposer',
    group: 'Chat',
    description:
      'The composer sends one element note, with its comment, to the launching chat. The fake backend keeps that note on the message.',
    states: [
      {
        id: 'sent',
        title: 'Note sent to the launching chat',
        description:
          'Settled: Sent to the launching chat / Look at the renewal date. / #renewal / Make the renewal date easier to find.',
        render: () => (
          <OnFixtures routes={APP_NOTE_SEND_ROUTES}>
            <SendNote />
          </OnFixtures>
        ),
      },
    ],
  },
]
