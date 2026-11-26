import type { ReactNode } from 'react'
import type { UseReviewChatSlot } from 'thefactory-ui/headless'
import { ChatInput, ModelChip } from 'thefactory-ui/web'
import ReviewChatSlot from '../../src/web/compound/chat/ReviewChatSlot'
import type { Scene } from '../showcase/types'
import {
  CHAT_REPLY,
  CHAT_REPLY_LONG,
  chatSaid,
  chatSlot,
  REPLY_TICKET,
  type Said,
} from './reviewChatSlotFixtures'
import { RUN_LINE_ASKS, RUN_LINE_WORKING } from './ticketRunFixtures'

const noop = () => undefined

type Width = 'page' | 'phone'

function AgentChip() {
  return (
    <ModelChip
      editable
      model="claude-opus-5-5"
      activeConfig={{
        id: 'cfg-1',
        name: 'Claude Opus',
        provider: 'anthropic',
        model: 'claude-opus-5-5',
      }}
      recents={[]}
      configs={[]}
      onPick={noop}
      onOpenSettings={noop}
      getPrice={async () => undefined}
      useCli
      onToggleUseCli={noop}
      enabledClis={['claude-code', 'codex']}
      activeCli="claude-code"
      onPickCli={noop}
      cliModels={[{ id: 'claude-opus-5-5', label: 'Opus 5.5', cli: 'claude-code' }]}
      onPickCliModel={noop}
    />
  )
}

function Bubble({ who, children }: { who: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[11px] font-semibold text-(--text-muted)">{who}</span>
      <p className="m-0 whitespace-pre-wrap rounded-lg bg-(--surface-raised) px-3 py-2 text-(--text-primary)">
        {children}
      </p>
    </div>
  )
}

/** The bottom of an inline review chat: its last messages, then its slot — in the composer's place, or above it. */
function ChatFrame({
  children,
  ticketKey,
  said,
  width = 'page',
}: {
  children: ReactNode
  ticketKey: string
  said: Said[]
  width?: Width
}) {
  return (
    <div className={`${width === 'phone' ? 'w-[390px]' : 'w-[720px]'} max-w-full p-4`}>
      <div className="flex h-[680px] flex-col overflow-hidden rounded-lg border border-(--border-subtle) bg-(--surface-base)">
        <div className="border-b border-(--border-subtle) px-4 py-2 text-[13px] font-semibold text-(--text-primary)">
          Review · {ticketKey}
        </div>
        <div className="flex min-h-0 flex-1 flex-col justify-end gap-3 overflow-hidden px-4 py-3 text-[13px]">
          {said.map((one) => (
            <Bubble key={one.text} who={one.who}>
              {one.text}
            </Bubble>
          ))}
        </div>
        {children}
      </div>
    </div>
  )
}

function slotIn(slot: UseReviewChatSlot, width?: Width) {
  const said = chatSaid(slot.kind)
  return (
    <ChatFrame ticketKey={REPLY_TICKET} said={said} {...(width ? { width } : {})}>
      <ReviewChatSlot slot={slot} renderModelChip={() => <AgentChip />} onOpenRun={noop} />
      {slot.kind === 'run-link' ? <ChatInput value="" onChange={noop} onSend={noop} /> : null}
    </ChatFrame>
  )
}

const REPLY = chatSlot({ kind: 'reply', reply: CHAT_REPLY })

export const REVIEW_CHAT_SLOT_SCENES: Scene[] = [
  {
    id: 'review-chat-slot',
    title: 'Review chat: what needs you',
    component: 'ReviewChatSlot · ReviewReplyComposerCard · TicketRunLine',
    group: 'Chat',
    description:
      'In a ticket’s inline review chat (review-<KEY>). Reviewed inline: once someone other than you replies in the update’s thread, the composer’s place shows who replied and when, what was pushed since the last round, what they wrote and its files, and Start round N on the agent picked — nothing starts by itself; Not now brings the composer back for this view. Reviewed as a run: the run never works in this chat and shows none of its cards here — while one is going the chat says it in one line above the composer, with Open run, and the composer stays.',
    states: [
      {
        id: 'reply',
        title: 'Aashan replied, 3 new commits',
        render: () => slotIn(REPLY),
      },
      {
        id: 'reply-long',
        title: 'A long reply, nothing pushed',
        description: 'Cut to four lines with Show all; No new commits says only words came back.',
        render: () => slotIn(chatSlot({ kind: 'reply', reply: CHAT_REPLY_LONG })),
      },
      {
        id: 'starting',
        title: 'Starting round 3',
        description: 'At once after the press; a second press does nothing.',
        render: () => slotIn({ ...REPLY, starting: true }),
      },
      {
        id: 'start-failed',
        title: 'The round did not start',
        render: () => slotIn({ ...REPLY, startError: 'Offer o-3 already started round 3.' }),
      },
      {
        id: 'reply-phone',
        title: 'On a phone',
        render: () => slotIn(REPLY, 'phone'),
      },
      {
        id: 'run-link',
        title: 'The review goes as a run: one line to it',
        description:
          'Round 3 is reviewed in a run, which never works in this chat. The chat says the run in one line above its composer, with Open run; the composer stays, and what is typed here goes to this chat’s agent, never to the run.',
        render: () => slotIn(chatSlot({ kind: 'run-link', runLine: RUN_LINE_WORKING })),
      },
      {
        id: 'run-link-asks',
        title: 'The run waits for you',
        description:
          'The same line, tinted: the run’s own cards are on its page and on the ticket’s, never here.',
        render: () => slotIn(chatSlot({ kind: 'run-link', runLine: RUN_LINE_ASKS })),
      },
      {
        id: 'run-link-phone',
        title: 'The run’s line, on a phone',
        render: () => slotIn(chatSlot({ kind: 'run-link', runLine: RUN_LINE_ASKS }), 'phone'),
      },
    ],
  },
]
