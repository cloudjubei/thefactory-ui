import { useState, type ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import {
  changeGroupTicketTabs,
  colleagueReviewCardView,
  groupTicketsView,
  type ColleagueReviewMode,
  type GroupTicketPageState,
  type GroupTicketsState,
  type ReviewCardMerge,
  type ReviewCommitsView,
  type ReviewReplyBannerLayout,
} from 'thefactory-ui/headless'
import ColleagueReviewCard from '../../src/native/compound/chat/ColleagueReviewCard'
import { RunModelChip } from '../../src/native/compound/chat/signoff'
import { ColleagueReviewPasteForm } from '../../src/native/compound/groupStories/ColleagueReviewPasteBox'
import GroupTicketPage from '../../src/native/compound/groupStories/GroupTicketPage'
import GroupTicketsList from '../../src/native/compound/groupStories/GroupTicketsList'
import { GroupTicketTabsPanel } from '../../src/native/compound/settings/GroupTicketTabsSettings'
import { useNativeTheme } from '../../src/native/hooks/useNativeTheme'
import { REVIEW_TICKET } from '../scenes/colleagueReviewFixtures'
import {
  COMMITS_NEW,
  COMMITS_NONE,
  COMMITS_REWRITTEN,
  defaultTickets,
  editorView,
  emptyTab,
  IN_PROGRESS_TICKETS,
  IN_REVIEW_TICKETS,
  MERGE_MOVED,
  MERGE_NOT_MOVED,
  mergeWith,
  OSC_TABS,
  oscTickets,
  OVERVIEW_FULL,
  OVERVIEW_LINKS_ONLY,
  OVERVIEW_NO_TICKET,
  OVERVIEW_PART_FAILED,
  OVERVIEW_PUSHED,
  OVERVIEW_REPLY,
  OVERVIEW_REPLY_FILES,
  OVERVIEW_REPLY_LONG,
  OVERVIEW_REPLY_RUN,
  pageState,
  PENDING_TICKETS,
  REVIEWING_COMMITS,
  REVIEWING_TICKETS,
  TABS_NOW,
} from '../scenes/groupTicketTabsFixtures'
import { BOX_FROM_OFFER, ROUND_TWO_WITH_PRS, SLACK_NOW } from '../scenes/slackReviewFixtures'
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
  'tabs-default': defaultTickets,
  'tabs-custom': () => oscTickets('pending', PENDING_TICKETS),
  'tabs-in-progress': () => oscTickets('in-progress', IN_PROGRESS_TICKETS),
  'yours-in-review-replies': () => oscTickets('in-review', IN_REVIEW_TICKETS),
  'empty-tab': emptyTab,
  'in-review-reviewing': () => oscTickets('in-review', REVIEWING_TICKETS),
  'in-review-reviewing-segmented': () => oscTickets('in-review', REVIEWING_TICKETS),
}

const COMMITS: Record<string, Readonly<Record<string, ReviewCommitsView>>> = {
  'in-review-reviewing': REVIEWING_COMMITS,
  'in-review-reviewing-segmented': REVIEWING_COMMITS,
}

function Tabs({ address }: { address: URLSearchParams }) {
  const id = address.get('state') ?? 'tabs-custom'
  const start = (TABS[id] ?? TABS['tabs-custom']!)()
  const [tab, setTab] = useState(start.tab)
  return (
    <Phone>
      <GroupTicketsList
        view={groupTicketsView({ ...start, tab }, TABS_NOW, COMMITS[id])}
        {...(id === 'in-review-reviewing-segmented'
          ? { layout: 'segmented' as const, shownFirst: 'others' as const }
          : {})}
        query=""
        onQueryChange={noop}
        onPickTab={setTab}
        onOpen={noop}
        onDiscuss={noop}
        onPlan={noop}
        onReview={noop}
        onDismissOffer={noop}
        onOpenStory={noop}
        onOpenSettings={noop}
        onRetry={noop}
        onLoadMore={noop}
      />
    </Phone>
  )
}

type PageShown = {
  state: GroupTicketPageState
  merge?: ReviewCardMerge
  replyLayout?: ReviewReplyBannerLayout
  replyExpanded?: boolean
}

const REPLY_PAGES = (replyLayout: ReviewReplyBannerLayout): Record<string, PageShown> => ({
  [`reply-${replyLayout}`]: { state: pageState(OVERVIEW_REPLY, COMMITS_NEW), replyLayout },
  [`reply-${replyLayout}-long`]: {
    state: pageState(OVERVIEW_REPLY_LONG, COMMITS_NONE),
    replyLayout,
  },
  [`reply-${replyLayout}-files`]: {
    state: pageState(OVERVIEW_REPLY_FILES, COMMITS_NEW),
    replyLayout,
    replyExpanded: true,
  },
  [`reply-${replyLayout}-run`]: { state: pageState(OVERVIEW_REPLY_RUN, COMMITS_NEW), replyLayout },
})

const PAGES: Record<string, PageShown> = {
  ...REPLY_PAGES('strip'),
  ...REPLY_PAGES('line'),
  'pushed-no-reply': { state: pageState(OVERVIEW_PUSHED, COMMITS_REWRITTEN) },
  'page-full': { state: pageState(OVERVIEW_FULL), merge: mergeWith(null) },
  'page-links-only': { state: pageState(OVERVIEW_LINKS_ONLY) },
  'page-part-failed': { state: pageState(OVERVIEW_PART_FAILED), merge: mergeWith(null) },
  'page-no-ticket': { state: pageState(OVERVIEW_NO_TICKET) },
  'page-loading': { state: { kind: 'loading' } },
}

function Page({ address }: { address: URLSearchParams }) {
  const shown = PAGES[address.get('state') ?? 'page-full'] ?? PAGES['page-full']!
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
        onApproveAndMerge={noop}
        {...(shown.merge ? { merge: shown.merge } : {})}
        {...(shown.replyLayout ? { replyLayout: shown.replyLayout } : {})}
        {...(shown.replyExpanded ? { replyExpanded: true } : {})}
      />
    </Phone>
  )
}

function Editor({ address }: { address: URLSearchParams }) {
  const custom = address.get('state') !== 'editor-default'
  const [shown, setShown] = useState({
    tabs: custom ? OSC_TABS : (defaultTickets().tabs.tabs ?? []),
    custom,
  })
  return (
    <Phone>
      <View style={{ padding: 12 }}>
        <GroupTicketTabsPanel
          view={editorView(shown.tabs, shown.custom)}
          onChange={(change) =>
            setShown({ tabs: changeGroupTicketTabs(shown.tabs, change), custom: true })
          }
          onReset={noop}
          onRetry={noop}
          {...(custom ? { openFirst: 'in-review' } : {})}
        />
      </View>
    </Phone>
  )
}

function Paste({ address }: { address: URLSearchParams }) {
  const [box, setBox] = useState(BOX_FROM_OFFER)
  const [mode, setMode] = useState<ColleagueReviewMode>(
    address.get('state') === 'in-chat' ? 'inline' : 'process',
  )
  return (
    <Phone>
      <View style={{ padding: 12 }}>
        <ColleagueReviewPasteForm
          box={box}
          now={SLACK_NOW}
          onChange={(draft) => setBox({ ...box, draft })}
          mode={mode}
          onModeChange={setMode}
          modelChip={
            <RunModelChip
              model={{ tool: 'claude-code', tag: 'CLI', model: 'Opus 5.5', effort: undefined }}
            />
          }
          onStart={noop}
          pickFiles={async () => []}
        />
      </View>
    </Phone>
  )
}

function Merge({ address }: { address: URLSearchParams }) {
  const merge = mergeWith(address.get('state') === 'not-moved' ? MERGE_NOT_MOVED : MERGE_MOVED)
  const view = colleagueReviewCardView({
    tool: 'record',
    ticketKey: REVIEW_TICKET,
    review: ROUND_TWO_WITH_PRS,
    thread: true,
  })
  return (
    <Phone>
      <View style={{ padding: 12 }}>
        <ColleagueReviewCard
          view={view}
          onDrop={noop}
          onGiven={noop}
          onPost={noop}
          merge={merge}
          onApproveAndMerge={noop}
        />
      </View>
    </Phone>
  )
}

/** The Tickets tab by status, the ticket page and their settings on mobile, at `?view=<id>&state=…`, as the web scenes. */
export const TICKET_TAB_VIEWS: readonly NativeView[] = [
  { id: 'ticket-tabs', title: 'Tickets by status tab', render: (a) => <Tabs address={a} /> },
  { id: 'ticket-page', title: 'Ticket page', render: (a) => <Page address={a} /> },
  {
    id: 'ticket-tabs-settings',
    title: 'Ticket tabs in Settings',
    render: (a) => <Editor address={a} />,
  },
  {
    id: 'review-agent-pick',
    title: 'Review paste box — agent',
    render: (a) => <Paste address={a} />,
  },
  {
    id: 'review-merge-move',
    title: 'Approve & merge — ticket move',
    render: (a) => <Merge address={a} />,
  },
]
