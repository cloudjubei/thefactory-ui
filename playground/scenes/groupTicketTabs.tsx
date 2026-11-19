import { useState, type ReactNode } from 'react'
import {
  changeGroupTicketTabs,
  colleagueReviewCardView,
  GROUP_TICKET_PAGE_LAYOUT_LABELS,
  GROUP_TICKET_PAGE_LAYOUTS,
  GROUP_TICKET_TABS_LAYOUT_LABELS,
  GROUP_TICKET_TABS_LAYOUTS,
  groupTicketsView,
  REVIEW_REPLY_BANNER_LAYOUT_LABELS,
  REVIEW_REPLY_BANNER_LAYOUTS,
  REVIEW_START_TEXT,
  type ColleagueReviewMode,
  type GroupTicketPageLayout,
  type GroupTicketPageState,
  type GroupTicketsLayout,
  type GroupTicketsShown,
  type GroupTicketsState,
  type GroupTicketTab,
  type GroupTicketTabsLayout,
  type ReviewCardMerge,
  type ReviewCommitsView,
  type ReviewReplyBannerLayout,
} from 'thefactory-ui/headless'
import {
  ColleagueReviewCard,
  ColleagueReviewPasteForm,
  GroupTicketPage,
  GroupTicketsList,
  GroupTicketTabsPanel,
  ModelChip,
  SegmentedControl,
} from 'thefactory-ui/web'
import type { ModelInfo } from '../../src/headless/api'
import type { Scene, SceneState } from '../showcase/types'
import { REVIEW_TICKET } from './colleagueReviewFixtures'
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
  OVERVIEW_NO_TICKET,
  OVERVIEW_PART_FAILED,
  OVERVIEW_PUSHED,
  OVERVIEW_REPLY,
  OVERVIEW_REPLY_FILES,
  OVERVIEW_REPLY_LONG,
  OVERVIEW_REPLY_RUN,
  PENDING_TICKETS,
  pageState,
  REVIEWING_COMMITS,
  REVIEWING_TICKETS,
  TABS_NOW,
} from './groupTicketTabsFixtures'
import { BOX_FROM_OFFER, ROUND_TWO_WITH_PRS, SLACK_NOW } from './slackReviewFixtures'

const noop = () => {}

type Width = 'page' | 'phone'

const framed = (width: Width, node: ReactNode) =>
  width === 'phone' ? <div className="w-[390px] max-w-full">{node}</div> : node

type TabsOptions = {
  state: GroupTicketsState
  tabsLayout?: GroupTicketTabsLayout
  layout?: GroupTicketsLayout
  shownFirst?: GroupTicketsShown
  commits?: Readonly<Record<string, ReviewCommitsView>>
  width?: Width
}

/** The Tickets tab on fixed data, its tabs switching on the page. */
function Tabs({ state, tabsLayout, layout, shownFirst, commits, width = 'page' }: TabsOptions) {
  const [tab, setTab] = useState(state.tab)
  const shown = { ...state, tab }
  return framed(
    width,
    <GroupTicketsList
      view={groupTicketsView(shown, TABS_NOW, commits)}
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
      {...(tabsLayout ? { tabsLayout } : {})}
      {...(layout ? { layout } : {})}
      {...(shownFirst ? { shownFirst } : {})}
    />,
  )
}

const tabs = (options: TabsOptions) => <Tabs {...options} />

const REVIEW_TAB = () => oscTickets('in-review', IN_REVIEW_TICKETS)
const PENDING_TAB = () => oscTickets('pending', PENDING_TICKETS)
const PROGRESS_TAB = () => oscTickets('in-progress', IN_PROGRESS_TICKETS)
const REVIEWING_TAB = () => oscTickets('in-review', REVIEWING_TICKETS)

function ChooseTabsLayout() {
  const [layout, setLayout] = useState<GroupTicketTabsLayout>('bar')
  return (
    <div className="flex flex-col gap-1">
      <div className="px-4 pt-4">
        <SegmentedControl
          ariaLabel="Layout"
          value={layout}
          onChange={(next) => setLayout(next as GroupTicketTabsLayout)}
          options={GROUP_TICKET_TABS_LAYOUTS.map((value) => ({
            value,
            label: GROUP_TICKET_TABS_LAYOUT_LABELS[value],
          }))}
        />
      </div>
      {tabs({ state: REVIEW_TAB(), tabsLayout: layout })}
    </div>
  )
}

const TABS_LAYOUT_DESCRIPTIONS: Record<GroupTicketTabsLayout, string> = {
  bar: 'Recommended, the default that ships. The tabs as one row of underlined tabs with a count on each, scrolling sideways on a phone; Yours, then Others below. The same bar the sign-off evidence uses, so it reads as part of the app, and every tab is a press away.',
  side: 'The tabs as a list down the side on a wide page, the bar on a narrow one. Room for long tab names and many tabs, but it takes width from the rows and two layouts to learn.',
  menu: 'One menu naming the tab and its count. The least room on a phone, but the other tabs and their counts hide behind a press.',
}

const tabsLayoutStates: SceneState[] = GROUP_TICKET_TABS_LAYOUTS.flatMap((layout) => [
  {
    id: `layout-${layout}`,
    title: GROUP_TICKET_TABS_LAYOUT_LABELS[layout],
    description: TABS_LAYOUT_DESCRIPTIONS[layout],
    render: () => tabs({ state: REVIEW_TAB(), tabsLayout: layout }),
  },
  {
    id: `layout-${layout}-phone`,
    title: `${GROUP_TICKET_TABS_LAYOUT_LABELS[layout]}, on a phone`,
    render: () => tabs({ state: REVIEW_TAB(), tabsLayout: layout, width: 'phone' }),
  },
])

type PageOptions = {
  state: GroupTicketPageState
  layout?: GroupTicketPageLayout
  width?: Width
  merge?: ReviewCardMerge
  replyLayout?: ReviewReplyBannerLayout
  replyExpanded?: boolean
}

function Page({ state, layout, width = 'page', merge, replyLayout, replyExpanded }: PageOptions) {
  return framed(
    width,
    <GroupTicketPage
      state={state}
      onBack={noop}
      onDiscuss={noop}
      onTake={noop}
      onReview={noop}
      onOpenStory={noop}
      onOpenPartStory={noop}
      onOpenRun={noop}
      onOpenChat={noop}
      onRetry={noop}
      onApproveAndMerge={noop}
      {...(merge ? { merge } : {})}
      {...(layout ? { layout } : {})}
      {...(replyLayout ? { replyLayout } : {})}
      {...(replyExpanded ? { replyExpanded } : {})}
    />,
  )
}

const page = (options: PageOptions) => <Page {...options} />

function ChooseReplyLayout() {
  const [replyLayout, setReplyLayout] = useState<ReviewReplyBannerLayout>('strip')
  return (
    <div className="flex flex-col gap-1">
      <div className="px-4 pt-4">
        <SegmentedControl
          ariaLabel="Reply layout"
          value={replyLayout}
          onChange={(next) => setReplyLayout(next as ReviewReplyBannerLayout)}
          options={REVIEW_REPLY_BANNER_LAYOUTS.map((value) => ({
            value,
            label: REVIEW_REPLY_BANNER_LAYOUT_LABELS[value],
          }))}
        />
      </div>
      {page({ state: pageState(OVERVIEW_REPLY, COMMITS_NEW), replyLayout })}
    </div>
  )
}

const REPLY_LAYOUT_DESCRIPTIONS: Record<ReviewReplyBannerLayout, string> = {
  strip:
    'Recommended, the default that ships. A toned strip under the header, above the tabs or parts: who replied and when, what was pushed since the last round, what they wrote (cut to four lines), its files, Start round N and Open review chat. Unmissable, and the reply is read without a press.',
  line: 'One line in the header under its buttons, with Show to open what they wrote, and the same buttons. The page keeps its height, but the reply is a press away.',
}

const replyStates: SceneState[] = REVIEW_REPLY_BANNER_LAYOUTS.flatMap((replyLayout) => {
  const label = REVIEW_REPLY_BANNER_LAYOUT_LABELS[replyLayout]
  const at = (state: GroupTicketPageState, width?: Width, replyExpanded?: boolean) =>
    page({
      state,
      replyLayout,
      ...(width ? { width } : {}),
      ...(replyExpanded ? { replyExpanded } : {}),
    })
  return [
    {
      id: `reply-${replyLayout}`,
      title: `${label}: Aashan replied, 3 new commits`,
      description: REPLY_LAYOUT_DESCRIPTIONS[replyLayout],
      render: () => at(pageState(OVERVIEW_REPLY, COMMITS_NEW)),
    },
    {
      id: `reply-${replyLayout}-long`,
      title: `${label}: a long reply, nothing pushed`,
      description:
        'Cut to a few lines with Show all; No new commits says the developer only wrote back.',
      render: () => at(pageState(OVERVIEW_REPLY_LONG, COMMITS_NONE)),
    },
    {
      id: `reply-${replyLayout}-files`,
      title: `${label}: a reply with files`,
      render: () => at(pageState(OVERVIEW_REPLY_FILES, COMMITS_NEW), undefined, true),
    },
    {
      id: `reply-${replyLayout}-run`,
      title: `${label}: a review run holds the review`,
      description: 'The run starts its own next round, so the page offers Open run instead.',
      render: () => at(pageState(OVERVIEW_REPLY_RUN, COMMITS_NEW)),
    },
    {
      id: `reply-${replyLayout}-phone`,
      title: `${label}: on a phone`,
      render: () => at(pageState(OVERVIEW_REPLY_FILES, COMMITS_NEW), 'phone'),
    },
  ]
})
const FULL = () => pageState(OVERVIEW_FULL)
const MERGEABLE = () => mergeWith(null)

function ChoosePageLayout() {
  const [layout, setLayout] = useState<GroupTicketPageLayout>('sections')
  return (
    <div className="flex flex-col gap-1">
      <div className="px-4 pt-4">
        <SegmentedControl
          ariaLabel="Layout"
          value={layout}
          onChange={(next) => setLayout(next as GroupTicketPageLayout)}
          options={GROUP_TICKET_PAGE_LAYOUTS.map((value) => ({
            value,
            label: GROUP_TICKET_PAGE_LAYOUT_LABELS[value],
          }))}
        />
      </div>
      {page({ state: FULL(), layout, merge: MERGEABLE() })}
    </div>
  )
}

const PAGE_LAYOUT_DESCRIPTIONS: Record<GroupTicketPageLayout, string> = {
  sections:
    'Recommended, the default that ships. The ticket, its Slack updates, its review, then its pull requests, story and chats, one under the other, the tab’s actions and Approve & merge at the top. One scroll on a phone and on a desktop, the same order on both apps.',
  columns:
    'The ticket and its updates on the left, its review and work on the right, on a wide page; one column on a narrow one. The most at once on a desktop, but the halves scroll as one and the order changes with the width.',
  tabs: 'A tab per part under the header: Ticket, Slack, Review, Work, each with its count. The shortest page, but what is in the other parts is a press away.',
}

const pageLayoutStates: SceneState[] = GROUP_TICKET_PAGE_LAYOUTS.flatMap((layout) => [
  {
    id: `layout-${layout}`,
    title: GROUP_TICKET_PAGE_LAYOUT_LABELS[layout],
    description: PAGE_LAYOUT_DESCRIPTIONS[layout],
    render: () => page({ state: FULL(), layout, merge: MERGEABLE() }),
  },
  {
    id: `layout-${layout}-phone`,
    title: `${GROUP_TICKET_PAGE_LAYOUT_LABELS[layout]}, on a phone`,
    render: () => page({ state: FULL(), layout, merge: MERGEABLE(), width: 'phone' }),
  },
])

/** The tabs editor on fixed tabs, each change shown at once as Settings does. */
function Editor({
  start,
  custom,
  openFirst,
  width = 'page',
  saveError,
}: {
  start: GroupTicketTab[]
  custom: boolean
  openFirst?: string
  width?: Width
  saveError?: string
}) {
  const [shown, setShown] = useState({ tabs: start, custom })
  return framed(
    width,
    <div className="max-w-2xl p-4">
      <GroupTicketTabsPanel
        view={editorView(shown.tabs, shown.custom, saveError ? { saveError } : {})}
        onChange={(change) =>
          setShown({ tabs: changeGroupTicketTabs(shown.tabs, change), custom: true })
        }
        onReset={() => setShown({ tabs: DEFAULTS_FOR_EDITOR, custom: false })}
        onRetry={noop}
        {...(openFirst ? { openFirst } : {})}
      />
    </div>,
  )
}

const DEFAULTS_FOR_EDITOR = defaultTickets().tabs.tabs ?? []

const CLI_MODELS: ModelInfo[] = [
  { id: 'claude-opus-5-5', label: 'Opus 5.5', cli: 'claude-code' },
  { id: 'claude-sonnet-5-5', label: 'Sonnet 5.5', cli: 'claude-code' },
]

/** The app's model chip as the paste box hands it its slot: the review's agent. */
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
      cliModels={CLI_MODELS}
      onPickCliModel={noop}
    />
  )
}

function PasteWithAgent({
  width = 'page',
  mode: first = 'process',
}: {
  width?: Width
  mode?: ColleagueReviewMode
}) {
  const [box, setBox] = useState(BOX_FROM_OFFER)
  const [mode, setMode] = useState<ColleagueReviewMode>(first)
  return (
    <div className={`${width === 'phone' ? 'w-[390px]' : 'w-[32rem]'} max-w-full p-4`}>
      <div className="flex flex-col gap-3 rounded-lg border border-(--border-subtle) bg-(--surface-raised) p-4">
        <h2 className="m-0 text-[15px] font-semibold text-(--text-primary)">
          {REVIEW_START_TEXT.nextTitle(box.ticketKey)}
        </h2>
        <ColleagueReviewPasteForm
          box={box}
          now={SLACK_NOW}
          onChange={(draft) => setBox({ ...box, draft })}
          mode={mode}
          onModeChange={setMode}
          modelChip={<AgentChip />}
          onStart={noop}
        />
      </div>
    </div>
  )
}

function MergeCard({ merge, width = 'page' }: { merge: ReviewCardMerge; width?: Width }) {
  const view = colleagueReviewCardView({
    tool: 'record',
    ticketKey: REVIEW_TICKET,
    review: ROUND_TWO_WITH_PRS,
    thread: true,
  })
  return framed(
    width,
    <div className="max-w-2xl p-4">
      <ColleagueReviewCard
        view={view}
        onDrop={noop}
        onGiven={noop}
        onPost={noop}
        merge={merge}
        onApproveAndMerge={noop}
      />
    </div>,
  )
}

export const GROUP_TICKET_TAB_SCENES: Scene[] = [
  {
    id: 'ticket-tabs',
    title: 'Tickets tab — status tabs',
    component: 'GroupTicketsList (onPickTab, tabsLayout, onOpen)',
    group: 'Project',
    kind: 'screen',
    wide: true,
    description:
      'The group’s Tickets tab by status: each tab the group set (name, Jira statuses, sprint) with its count, and inside it Yours then Others, each row with the tab’s actions for its side — Take ticket, Carry on, Review / Next round, Approve & merge, Discuss — and the replies to the person’s own update on their rows in review. Pressing a row opens the ticket’s page; Discuss is its own button. A group with no tabs of its own gets To do / In progress / Done. Tabs on top ships.',
    states: [
      {
        id: 'choose-layout',
        title: 'Pick a layout',
        description: 'The three tab layouts on the tab itself, with the switch above them.',
        render: () => <ChooseTabsLayout />,
      },
      ...tabsLayoutStates,
      {
        id: 'tabs-default',
        title: 'Default tabs',
        description:
          'A group that set no tabs: To do, In progress and Done from Jira’s status categories, on To do with Take ticket on both sides.',
        render: () => tabs({ state: defaultTickets() }),
      },
      {
        id: 'tabs-custom',
        title: 'The group’s own tabs, Yours and Others',
        description:
          'OSC’s six tabs, on Pending: the next ticket to take on top of Yours, Take ticket and Discuss on every row of both sides.',
        render: () => tabs({ state: PENDING_TAB() }),
      },
      {
        id: 'tabs-in-progress',
        title: 'In progress: Carry on on yours',
        description: 'Yours offer Carry on, opening its group story; Others only Discuss.',
        render: () => tabs({ state: PROGRESS_TAB() }),
      },
      {
        id: 'yours-in-review-replies',
        title: 'In review, with replies',
        description:
          'Yours show the new Slack replies under the person’s own update and the GitHub comments on their pull requests, with when the latest came, and Approve & merge; Others offer Review / Next round, a colleague’s update from Slack waiting on one.',
        render: () => tabs({ state: REVIEW_TAB() }),
      },
      {
        id: 'yours-in-review-replies-phone',
        title: 'In review, on a phone',
        render: () => tabs({ state: REVIEW_TAB(), width: 'phone' }),
      },
      {
        id: 'in-review-reviewing',
        title: 'In review: Reviewing and To review',
        description:
          'Everyone else’s tickets under review stand apart above the ones not reviewed yet, in any tab. A reply waiting on one puts it on top, newest first, saying who replied, when and what was pushed since the last round: 3 new commits, or No new commits (nothing changed: the round can wait). A ticket with no reply but history rewritten since review says so; a ticket where nothing came stays plain. To review keeps board order. With nothing under review the list shows as before, no headings.',
        render: () => tabs({ state: REVIEWING_TAB(), commits: REVIEWING_COMMITS }),
      },
      {
        id: 'in-review-reviewing-phone',
        title: 'Reviewing and To review, on a phone',
        render: () => tabs({ state: REVIEWING_TAB(), commits: REVIEWING_COMMITS, width: 'phone' }),
      },
      {
        id: 'in-review-reviewing-columns',
        title: 'Reviewing and To review, side by side',
        description: 'The same split in the Others column of the side-by-side layout.',
        render: () =>
          tabs({ state: REVIEWING_TAB(), commits: REVIEWING_COMMITS, layout: 'columns' }),
      },
      {
        id: 'in-review-reviewing-segmented',
        title: 'Reviewing and To review, one list at a time',
        description: 'The same split on Others in the one-list-at-a-time layout.',
        render: () =>
          tabs({
            state: REVIEWING_TAB(),
            commits: REVIEWING_COMMITS,
            layout: 'segmented',
            shownFirst: 'others',
          }),
      },
      {
        id: 'empty-tab',
        title: 'An empty tab',
        description: 'In QA holds nothing: said once, no empty Yours and Others.',
        render: () => tabs({ state: emptyTab() }),
      },
      {
        id: 'tab-loading',
        title: 'A tab being read',
        description:
          'Picked for the first time: Loading until its first read; a tab read before shows at once.',
        render: () => tabs({ state: { ...PENDING_TAB(), tab: 'icebox' } }),
      },
      {
        id: 'tabs-failed',
        title: 'The tabs could not be read',
        render: () =>
          tabs({
            state: {
              ...PENDING_TAB(),
              tabs: {
                tabs: undefined,
                custom: false,
                readError: 'Could not read the ticket tabs.',
              },
            },
          }),
      },
    ],
  },
  {
    id: 'ticket-page',
    title: 'Ticket page',
    component: 'GroupTicketPage',
    group: 'Project',
    kind: 'screen',
    wide: true,
    description:
      'What a ticket row opens (web /groups/:groupId/tickets/:key, a pushed screen on mobile): the ticket with its status, priority, assignee, sprint, description and Jira link; its Slack updates (waiting, dismissed, reviewed) with files and links; its review rounds with verdicts, posted replies and review runs; its pull requests with state and checks; its group story and chats; and the tab’s actions, Approve & merge first when it applies. One column ships.',
    states: [
      {
        id: 'choose-layout',
        title: 'Pick a layout',
        render: () => <ChoosePageLayout />,
      },
      ...pageLayoutStates,
      {
        id: 'choose-reply-layout',
        title: 'Pick the reply layout',
        description:
          'A reply waiting in the developer’s thread, shown on top of the page: the two layouts on the board, Strip above the tabs first.',
        render: () => <ChooseReplyLayout />,
      },
      ...replyStates,
      {
        id: 'pushed-no-reply',
        title: 'Pushed since review, no reply yet',
        description:
          'One quiet line under the header: Rewritten since review (or N new commits) while nobody replied; nothing when nothing moved.',
        render: () => page({ state: pageState(OVERVIEW_PUSHED, COMMITS_REWRITTEN) }),
      },
      {
        id: 'page-full',
        title: 'Everything read',
        render: () => page({ state: FULL(), merge: MERGEABLE() }),
      },
      {
        id: 'page-full-phone',
        title: 'Everything read, on a phone',
        render: () => page({ state: FULL(), merge: MERGEABLE(), width: 'phone' }),
      },
      {
        id: 'page-part-failed',
        title: 'A part could not be read',
        description:
          'GitHub and the chats failed: each says so in a quiet line under the header, and the rest of the page still shows.',
        render: () => page({ state: pageState(OVERVIEW_PART_FAILED), merge: MERGEABLE() }),
      },
      {
        id: 'page-no-ticket',
        title: 'Jira could not be read',
        description: 'Named by its key; the updates, review and work still show.',
        render: () => page({ state: pageState(OVERVIEW_NO_TICKET) }),
      },
      {
        id: 'page-loading',
        title: 'Loading',
        render: () => page({ state: { kind: 'loading' } }),
      },
      {
        id: 'page-failed',
        title: 'Not read',
        render: () => page({ state: { kind: 'failed', error: 'Could not read the ticket.' } }),
      },
    ],
  },
  {
    id: 'ticket-tabs-settings',
    title: 'Ticket tabs in Settings',
    component: 'GroupTicketTabsSettings · GroupTicketTabsPanel',
    group: 'Settings',
    description:
      'Settings → Group → Ticket tabs, next to Slack: the group’s tabs in order, each with what it shows; open one to rename it, pick its status groups and statuses, its sprint (In the open sprint / Not in an open sprint / Any) and what Yours and Others may do. Add, move, delete; Reset to default. Every change shows at once and is saved.',
    states: [
      {
        id: 'editor-default',
        title: 'The default tabs',
        render: () => <Editor start={DEFAULTS_FOR_EDITOR} custom={false} />,
      },
      {
        id: 'editor-custom',
        title: 'OSC’s tabs, one open',
        render: () => <Editor start={OSC_TABS} custom openFirst="in-review" />,
      },
      {
        id: 'editor-custom-phone',
        title: 'OSC’s tabs, on a phone',
        render: () => <Editor start={OSC_TABS} custom openFirst="in-review" width="phone" />,
      },
      {
        id: 'editor-refused',
        title: 'A change refused',
        description: 'The change is undone and the backend’s words say why.',
        render: () => (
          <Editor
            start={OSC_TABS}
            custom
            saveError="Tab names must differ: “In QA” is used twice."
          />
        ),
      },
    ],
  },
  {
    id: 'review-agent-pick',
    title: 'Review paste box — agent',
    component: 'ColleagueReviewPasteForm (modelChip)',
    group: 'Project',
    description:
      'The app’s model chip in the paste box, the same one every run launch uses, under How it is reviewed: in either mode the round runs on the agent picked here, the chat’s until one is picked, and the last pick stays for the next review.',
    states: [
      { id: 'as-a-run', title: 'As a run', render: () => <PasteWithAgent /> },
      { id: 'in-chat', title: 'In chat', render: () => <PasteWithAgent mode="inline" /> },
      { id: 'phone', title: 'On a phone', render: () => <PasteWithAgent width="phone" /> },
    ],
  },
  {
    id: 'review-merge-move',
    title: 'Approve & merge — ticket move',
    component: 'ColleagueReviewCard (merge.view.ticketMove)',
    group: 'Project',
    description:
      'Once every pull request merged, the merge moves the ticket to the group’s “After merging, move the ticket to” status (Settings → Group → Slack) and says so last on the merge progress, or why it did not.',
    states: [
      { id: 'moved', title: 'Moved', render: () => <MergeCard merge={mergeWith(MERGE_MOVED)} /> },
      {
        id: 'not-moved',
        title: 'Not moved',
        render: () => <MergeCard merge={mergeWith(MERGE_NOT_MOVED)} />,
      },
      {
        id: 'moved-phone',
        title: 'Moved, on a phone',
        render: () => <MergeCard merge={mergeWith(MERGE_MOVED)} width="phone" />,
      },
    ],
  },
]
