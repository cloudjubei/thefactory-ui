import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import { reviewDecisionVerdict, type UseReviewChatSlot } from 'thefactory-ui/headless'
import ColleagueReviewDecisionCard from '../../src/native/compound/chat/ColleagueReviewDecisionCard'
import ReviewChatSlot from '../../src/native/compound/chat/ReviewChatSlot'
import { RunModelChip } from '../../src/native/compound/chat/signoff'
import { useNativeTheme } from '../../src/native/hooks/useNativeTheme'
import { REVIEW_TICKET } from '../scenes/colleagueReviewFixtures'
import {
  CHAT_REPLY,
  CHAT_REPLY_LONG,
  CHAT_RUN_ACTIONS,
  chatSaid,
  chatSlot,
  DECISION_SAID,
  type Said,
} from '../scenes/reviewChatSlotFixtures'
import { REVIEW_RUN_PUSH_PASSED, REVIEW_RUN_REPLIED } from '../scenes/reviewRunRoundsFixtures'
import { ROUND_TWO_PRS, ROUND_TWO_REPLY, ROUND_TWO_WITH_PRS } from '../scenes/slackReviewFixtures'
import {
  BRINGING_BASE_SLOT,
  MERGE_DONE,
  MERGE_FIRST_CHECKS,
  MERGE_ONE_MERGED,
  MERGE_STOPPED,
  workingSlot,
} from '../scenes/ticketRunFixtures'
import type { NativeView } from './views'

const noop = () => undefined

function Bubble({ who, children }: { who: string; children: string }) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: 2 }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: theme.text.muted }}>{who}</Text>
      <Text
        style={{
          fontSize: 13,
          color: theme.text.primary,
          backgroundColor: theme.surface.raised,
          borderRadius: 10,
          padding: 10,
        }}
      >
        {children}
      </Text>
    </View>
  )
}

function ChatFrame({ children, said }: { children: ReactNode; said: Said[] }) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ flex: 1, width: 390, maxWidth: '100%', backgroundColor: theme.surface.base }}>
      <View
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          gap: 12,
          padding: 12,
        }}
      >
        {said.map((one) => (
          <Bubble key={one.text} who={one.who}>
            {one.text}
          </Bubble>
        ))}
      </View>
      {children}
    </View>
  )
}

const chip = () => (
  <RunModelChip model={{ tool: 'claude-code', tag: 'CLI', model: 'Opus 5.5', effort: undefined }} />
)

function RunDecision() {
  const { theme } = useNativeTheme()
  const verdict = reviewDecisionVerdict(ROUND_TWO_WITH_PRS)
  return (
    <View
      style={{
        gap: 8,
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: theme.border.default,
      }}
    >
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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable accessibilityRole="link">
          <Text style={{ fontSize: 13, color: theme.accent.primary }}>Open run</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={{ marginLeft: 'auto' }}>
          <Text style={{ fontSize: 13, color: theme.text.secondary }}>Not now</Text>
        </Pressable>
      </View>
    </View>
  )
}

const REPLY = chatSlot({ kind: 'reply', reply: CHAT_REPLY })

const SLOTS: Record<string, UseReviewChatSlot> = {
  reply: REPLY,
  'reply-long': chatSlot({ kind: 'reply', reply: CHAT_REPLY_LONG }),
  starting: { ...REPLY, starting: true },
  'start-failed': { ...REPLY, startError: 'Offer o-3 already started round 3.' },
  'run-outside': chatSlot({ kind: 'run-outside', run: REVIEW_RUN_REPLIED }),
  'run-push': chatSlot({ kind: 'run-push', run: REVIEW_RUN_PUSH_PASSED }),
  'run-working-base': BRINGING_BASE_SLOT,
  'run-working-checks': workingSlot(MERGE_FIRST_CHECKS),
  'run-working-one-merged': workingSlot(MERGE_ONE_MERGED),
  'run-working-failed': workingSlot(MERGE_STOPPED),
  'run-working-done': workingSlot(MERGE_DONE, 'report'),
}

function Slot({ address }: { address: URLSearchParams }) {
  const id = address.get('state') ?? 'reply'
  const slot = SLOTS[id] ?? REPLY
  return (
    <ChatFrame said={id === 'run-decision' ? DECISION_SAID : chatSaid(slot.kind)}>
      {id === 'run-decision' ? (
        <RunDecision />
      ) : (
        <ReviewChatSlot slot={slot} renderModelChip={chip} onOpenRun={noop} />
      )}
    </ChatFrame>
  )
}

/** A review chat's composer place on mobile, at `?view=review-chat-slot&state=…`, as the web scene. */
export const REVIEW_CHAT_SLOT_VIEWS: readonly NativeView[] = [
  {
    id: 'review-chat-slot',
    title: 'Review chat: what needs you',
    render: (a) => <Slot address={a} />,
  },
]
