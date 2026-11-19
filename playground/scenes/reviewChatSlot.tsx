import type { ReactNode } from 'react'
import { reviewDecisionVerdict, type UseReviewChatSlot } from 'thefactory-ui/headless'
import { ColleagueReviewDecisionCard, ModelChip } from 'thefactory-ui/web'
import ReviewChatSlot from '../../src/web/compound/chat/ReviewChatSlot'
import type { Scene } from '../showcase/types'
import { REVIEW_TICKET } from './colleagueReviewFixtures'
import { REVIEW_RUN_PUSH_PASSED, REVIEW_RUN_REPLIED } from './reviewRunRoundsFixtures'
import {
  CHAT_REPLY,
  CHAT_REPLY_LONG,
  CHAT_RUN_ACTIONS,
  chatSaid,
  chatSlot,
  DECISION_SAID,
  REPLY_TICKET,
  type Said,
} from './reviewChatSlotFixtures'
import { ROUND_TWO_PRS, ROUND_TWO_REPLY, ROUND_TWO_WITH_PRS } from './slackReviewFixtures'

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

/** The bottom of a review chat: its last messages, then what takes the composer's place. */
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
  const ticketKey = slot.run?.ticketReview?.ticketKey ?? REPLY_TICKET
  const said = chatSaid(slot.kind)
  return (
    <ChatFrame ticketKey={ticketKey} said={said} {...(width ? { width } : {})}>
      <ReviewChatSlot slot={slot} renderModelChip={() => <AgentChip />} onOpenRun={noop} />
    </ChatFrame>
  )
}

/** The run's decision card in the chat, as ReviewChatSlot draws RunReviewDecisionCard once the round is read. */
function RunDecisionIn({ width }: { width?: Width }) {
  const verdict = reviewDecisionVerdict(ROUND_TWO_WITH_PRS)
  return (
    <ChatFrame ticketKey={REVIEW_TICKET} said={DECISION_SAID} {...(width ? { width } : {})}>
      <div className="flex max-h-[65%] min-h-0 shrink flex-col gap-2 overflow-y-auto border-t border-(--border-default) bg-(--surface-raised) px-3 py-3">
        <ColleagueReviewDecisionCard
          ticketKey={REVIEW_TICKET}
          {...(verdict ? { verdict } : {})}
          loading={false}
          draft={ROUND_TWO_REPLY}
          actions={CHAT_RUN_ACTIONS}
          prs={ROUND_TWO_PRS}
          embedded
          onChoose={noop}
        />
        <div className="flex items-center gap-3">
          <button type="button" className="text-[12px] text-(--accent-primary) hover:underline">
            Open run
          </button>
          <button
            type="button"
            className="ml-auto text-[12px] text-(--text-secondary) hover:underline"
          >
            Not now
          </button>
        </div>
      </div>
    </ChatFrame>
  )
}

const REPLY = chatSlot({ kind: 'reply', reply: CHAT_REPLY })

export const REVIEW_CHAT_SLOT_SCENES: Scene[] = [
  {
    id: 'review-chat-slot',
    title: 'Review chat: what needs you',
    component: 'ReviewChatSlot · ReviewReplyComposerCard',
    group: 'Chat',
    description:
      'In a ticket’s review chat (review-<KEY>), in the composer’s place. Reviewed inline: once someone other than you replies in the update’s thread, who replied and when, what was pushed since the last round, what they wrote and its files, and Start round N on the agent picked — nothing starts by itself. Reviewed as a run: the run’s own card whenever it needs you (its approval, a push to approve, the reply it waited for), answered here as on the run’s page, with Open run. Not now brings the composer back for this view; a message typed then answers the run’s approval as a note.',
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
        id: 'run-decision',
        title: 'The run at its approval',
        description:
          'A colleague review run parked at Your approval: the same decision card as on the run’s page, answered through the run, with Open run.',
        render: () => <RunDecisionIn />,
      },
      {
        id: 'run-decision-phone',
        title: 'The run at its approval, on a phone',
        render: () => <RunDecisionIn width="phone" />,
      },
      {
        id: 'run-outside',
        title: 'The run’s reply came',
        description: 'The run waited on the developer; Start round 2 carries it on.',
        render: () => slotIn(chatSlot({ kind: 'run-outside', run: REVIEW_RUN_REPLIED })),
      },
      {
        id: 'run-push',
        title: 'The run asks to approve a push',
        render: () => slotIn(chatSlot({ kind: 'run-push', run: REVIEW_RUN_PUSH_PASSED })),
      },
    ],
  },
]
