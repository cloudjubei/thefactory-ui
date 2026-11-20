import { useState, type ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import {
  groupTicketsView,
  TICKET_RUN_LAYOUT_LABELS,
  TICKET_RUN_LAYOUTS,
  type GroupTicketPageState,
  type GroupTicketsState,
  type TicketRunLayout,
  type UseReviewChatSlot,
} from 'thefactory-ui/headless'
import { ReviewChatSlotCard } from '../../src/native/compound/chat/ReviewChatSlot'
import GroupTicketPage from '../../src/native/compound/groupStories/GroupTicketPage'
import GroupTicketsList from '../../src/native/compound/groupStories/GroupTicketsList'
import { useNativeTheme } from '../../src/native/hooks/useNativeTheme'
import SegmentedControl from '../../src/native/primitives/SegmentedControl'
import {
  IN_PROGRESS_TICKETS,
  oscTickets,
  REVIEWING_COMMITS,
  REVIEWING_TICKETS,
  TABS_NOW,
} from '../scenes/groupTicketTabsFixtures'
import {
  MERGE_ONE_MERGED,
  PAGE_AT_PUSH,
  PAGE_MERGING,
  PUSH_SLOT,
  TICKET_MERGES,
  TICKET_RUNS,
  workingSlot,
} from '../scenes/ticketRunFixtures'
import type { NativeView } from './views'

const noop = () => {}

function Phone({ children }: { children: ReactNode }) {
  const { theme } = useNativeTheme()
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.surface.base }}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      <View style={{ width: 390, maxWidth: '100%', gap: 12 }}>{children}</View>
    </ScrollView>
  )
}

const TABS: Record<string, () => GroupTicketsState> = {
  'in-progress-group-run': () => oscTickets('in-progress', IN_PROGRESS_TICKETS),
}

const layoutOf = (id: string): TicketRunLayout | undefined =>
  TICKET_RUN_LAYOUTS.find((layout) => id === `in-review-${layout}`)

function Rows({ state, runLayout }: { state: GroupTicketsState; runLayout?: TicketRunLayout }) {
  const [tab, setTab] = useState(state.tab)
  return (
    <GroupTicketsList
      view={groupTicketsView(
        { ...state, tab },
        TABS_NOW,
        REVIEWING_COMMITS,
        TICKET_RUNS,
        TICKET_MERGES,
      )}
      query=""
      onQueryChange={noop}
      onPickTab={setTab}
      onOpen={noop}
      onDiscuss={noop}
      onPlan={noop}
      onReview={noop}
      onDismissOffer={noop}
      onOpenStory={noop}
      onOpenRun={noop}
      onOpenSettings={noop}
      onRetry={noop}
      onLoadMore={noop}
      {...(runLayout ? { runLayout } : {})}
    />
  )
}

function ChooseRunLayout() {
  const [runLayout, setRunLayout] = useState<TicketRunLayout>('line')
  return (
    <>
      <View style={{ paddingHorizontal: 12, paddingTop: 12 }}>
        <SegmentedControl
          value={runLayout}
          onChange={(next) => setRunLayout(next as TicketRunLayout)}
          options={TICKET_RUN_LAYOUTS.map((value) => ({
            value,
            label: TICKET_RUN_LAYOUT_LABELS[value],
          }))}
        />
      </View>
      <Rows state={oscTickets('in-review', REVIEWING_TICKETS)} runLayout={runLayout} />
    </>
  )
}

function Tabs({ address }: { address: URLSearchParams }) {
  const id = address.get('state') ?? 'in-review-line'
  if (id === 'choose-layout') {
    return (
      <Phone>
        <ChooseRunLayout />
      </Phone>
    )
  }
  const state = (TABS[id] ?? (() => oscTickets('in-review', REVIEWING_TICKETS)))()
  const runLayout = layoutOf(id)
  return (
    <Phone>
      <Rows state={state} {...(runLayout ? { runLayout } : {})} />
    </Phone>
  )
}

const PAGES: Record<string, { state: GroupTicketPageState; slot: UseReviewChatSlot }> = {
  'at-push': { state: PAGE_AT_PUSH, slot: PUSH_SLOT },
  merging: { state: PAGE_MERGING, slot: workingSlot(MERGE_ONE_MERGED) },
}

function Page({ address }: { address: URLSearchParams }) {
  const shown = PAGES[address.get('state') ?? 'at-push'] ?? PAGES['at-push']!
  return (
    <Phone>
      <GroupTicketPage
        state={shown.state}
        onDiscuss={noop}
        onTake={noop}
        onReview={noop}
        onOpenStory={noop}
        onOpenPartStory={noop}
        onOpenRun={noop}
        onOpenChat={noop}
        onRetry={noop}
        runCard={<ReviewChatSlotCard slot={shown.slot} />}
      />
    </Phone>
  )
}

/** The run working a ticket on its row and on its page, on mobile, at `?view=<id>&state=…`, as the web scenes. */
export const TICKET_RUN_VIEWS: readonly NativeView[] = [
  {
    id: 'ticket-runs',
    title: 'Tickets tab — the run working a ticket',
    render: (a) => <Tabs address={a} />,
  },
  {
    id: 'ticket-page-run',
    title: 'Ticket page — the run working it',
    render: (a) => <Page address={a} />,
  },
]
