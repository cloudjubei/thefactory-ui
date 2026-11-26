import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import type { UseReviewChatSlot } from 'thefactory-ui/headless'
import ChatInput from '../../src/native/compound/chat/ChatInput'
import ReviewChatSlot from '../../src/native/compound/chat/ReviewChatSlot'
import { RunModelChip } from '../../src/native/compound/chat/signoff'
import { useNativeTheme } from '../../src/native/hooks/useNativeTheme'
import {
  CHAT_REPLY,
  CHAT_REPLY_LONG,
  chatSaid,
  chatSlot,
  type Said,
} from '../scenes/reviewChatSlotFixtures'
import { RUN_LINE_ASKS, RUN_LINE_WORKING } from '../scenes/ticketRunFixtures'
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

const Composer = () => <ChatInput value="" onChange={noop} onSend={noop} />

const REPLY = chatSlot({ kind: 'reply', reply: CHAT_REPLY })

const SLOTS: Record<string, UseReviewChatSlot> = {
  reply: REPLY,
  'reply-long': chatSlot({ kind: 'reply', reply: CHAT_REPLY_LONG }),
  starting: { ...REPLY, starting: true },
  'start-failed': { ...REPLY, startError: 'Offer o-3 already started round 3.' },
  'run-link': chatSlot({ kind: 'run-link', runLine: RUN_LINE_WORKING }),
  'run-link-asks': chatSlot({ kind: 'run-link', runLine: RUN_LINE_ASKS }),
}

function Slot({ address }: { address: URLSearchParams }) {
  const id = address.get('state') ?? 'reply'
  const slot = SLOTS[id] ?? REPLY
  return (
    <ChatFrame said={chatSaid(slot.kind)}>
      <ReviewChatSlot slot={slot} renderModelChip={chip} onOpenRun={noop} />
      {slot.kind === 'run-link' ? <Composer /> : null}
    </ChatFrame>
  )
}

/** An inline review chat's slot on mobile — in the composer's place, or one line to its run above it — at `?view=review-chat-slot&state=…`, as the web scene. */
export const REVIEW_CHAT_SLOT_VIEWS: readonly NativeView[] = [
  {
    id: 'review-chat-slot',
    title: 'Review chat: what needs you',
    render: (a) => <Slot address={a} />,
  },
]
