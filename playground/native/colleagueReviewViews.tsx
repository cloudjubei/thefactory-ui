import { useState, type ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import type { ColleagueReview } from 'thefactory-tools/types'
import {
  colleagueReviewCardView,
  groupTicketsView,
  type ColleagueReviewCardLayout,
  type ReviewPasteBox,
} from 'thefactory-ui/headless'
import ColleagueReviewCard from '../../src/native/compound/chat/ColleagueReviewCard'
import { ColleagueReviewPasteForm } from '../../src/native/compound/groupStories/ColleagueReviewPasteBox'
import GroupTicketsList from '../../src/native/compound/groupStories/GroupTicketsList'
import {
  BOX_EMPTY,
  BOX_FAILED,
  BOX_FILLED,
  BOX_NEXT_ROUND,
  REVIEW_REFUSAL,
  REVIEW_TICKET,
  ROUND_ONE,
  ROUND_THREE,
  ROUND_THREE_STARTED,
  ROUND_TWO,
} from '../scenes/colleagueReviewFixtures'
import { listOf, OTHERS_REVIEWED, read, ticketsState } from '../scenes/groupTicketsFixtures'
import type { NativeView } from './views'

const noop = () => {}
const pick = async () => []

function Phone({ children }: { children: ReactNode }) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={{ width: 390, maxWidth: '100%', padding: 12, gap: 12 }}>{children}</View>
    </ScrollView>
  )
}

const REVIEWS: Record<string, { review: ColleagueReview | null | undefined; round?: number }> = {
  'round-1': { review: ROUND_ONE },
  'round-2': { review: ROUND_TWO },
  'being-reviewed': { review: ROUND_THREE_STARTED, round: 3 },
  approve: { review: ROUND_THREE },
  'older-row': { review: ROUND_TWO, round: 1 },
  none: { review: null },
  loading: { review: undefined },
}

function Card({ address }: { address: URLSearchParams }) {
  const state = address.get('state') ?? 'round-2'
  const layout = (address.get('layout') ?? 'stacked') as ColleagueReviewCardLayout
  const shown = REVIEWS[state] ?? { review: ROUND_TWO }
  const view = colleagueReviewCardView({
    tool: 'record',
    ticketKey: REVIEW_TICKET,
    review: shown.review,
    ...(shown.round ? { round: shown.round } : {}),
    ...(state === 'refused' ? { refusal: REVIEW_REFUSAL } : {}),
    ...(state === 'action-failed'
      ? { actionError: 'The review of ZNR-809 has no finding F9.' }
      : {}),
  })
  return (
    <Phone>
      <ColleagueReviewCard
        view={view}
        layout={layout}
        onDrop={noop}
        onGiven={noop}
        {...(state === 'evidence' ? { openFinding: 'F1' } : {})}
        {...(state === 'drop' ? { noteOpen: { kind: 'drop' as const, id: 'F2' } } : {})}
        {...(state === 'earlier' ? { expanded: true } : {})}
      />
    </Phone>
  )
}

const BOXES: Record<string, ReviewPasteBox> = {
  empty: BOX_EMPTY,
  filled: BOX_FILLED,
  'next-round': BOX_NEXT_ROUND,
  failed: BOX_FAILED,
}

function Paste({ address }: { address: URLSearchParams }) {
  const [box, setBox] = useState(BOXES[address.get('state') ?? 'filled'] ?? BOX_FILLED)
  return (
    <Phone>
      <ColleagueReviewPasteForm
        box={box}
        onChange={(draft) => setBox({ ...box, draft })}
        onStart={noop}
        pickFiles={pick}
      />
    </Phone>
  )
}

function Tickets() {
  return (
    <ScrollView>
      <GroupTicketsList
        view={groupTicketsView(
          ticketsState({
            sprint: read(listOf(OTHERS_REVIEWED)),
            reviewing: { 'OSC-415': { step: 'uploading', done: 2, total: 6 } },
          }),
        )}
        query=""
        onQueryChange={noop}
        onDiscuss={noop}
        onPlan={noop}
        onReview={noop}
        onOpenStory={noop}
        onOpenSettings={noop}
        onRetry={noop}
        onLoadMore={noop}
      />
    </ScrollView>
  )
}

/** The colleague review on mobile, at `?view=<id>&state=…`, the same states as the web scenes. */
export const COLLEAGUE_REVIEW_VIEWS: readonly NativeView[] = [
  {
    id: 'colleague-review-card',
    title: 'Colleague review',
    render: (address) => <Card address={address} />,
  },
  {
    id: 'colleague-review-paste',
    title: 'Review paste box',
    render: (address) => <Paste address={address} />,
  },
  {
    id: 'group-tickets-review',
    title: 'Tickets tab with Review',
    render: () => <Tickets />,
  },
]
