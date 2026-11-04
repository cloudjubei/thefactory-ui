import { useState, type ReactNode } from 'react'
import {
  GROUP_STORY_LIST_FILTER_DEFAULT,
  groupStoryTicketChip,
  groupTicketStatuses,
  LOOM_WALKTHROUGH_LAYOUT_LABELS,
  LOOM_WALKTHROUGH_LAYOUTS,
  loomWalkthroughView,
  reviewTabs,
  signoffEvidenceChips,
  TAKE_NEXT_TICKET_LAYOUT_LABELS,
  TAKE_NEXT_TICKET_LAYOUTS,
  takeNextTicketView,
  TICKET_CHIP_LAYOUT_LABELS,
  TICKET_CHIP_LAYOUTS,
  TICKET_MOVE_LAYOUT_LABELS,
  TICKET_MOVE_LAYOUTS,
  ticketChipView,
  ticketMoveField,
  type GroupStoryListFilter,
  type GroupStoryPartView,
  type GroupStoryRunPreview,
  type GroupStoryRunStartedAnswer,
  type GroupStoryView,
  type GroupTicket,
  type GroupTicketList,
  type GroupTicketsState,
  type LoomWalkthroughLayout,
  type RunWalkthroughItem,
  type RunWalkthroughState,
  type TakeNextTicketLayout,
  type TicketChipLayout,
  type TicketLaunchMove,
  type TicketMoveLayout,
} from 'thefactory-ui/headless'
import {
  CheckChip,
  GroupStoriesList,
  GroupStoryPage,
  GroupStoryRunDialog,
  LoomWalkthroughPanel,
  SegmentedControl,
  TakeNextTicket,
  TicketChip,
  TicketMoveField,
} from 'thefactory-ui/web'
import type { Scene, SceneState } from '../showcase/types'
import ToolAskCard from '../../src/web/compound/chat/ToolAskCard'
import { groupWorkAskView } from '../../src/headless/utils/toolAskCard'

const noop = () => {}
const asyncNoop = async () => {}
const AT = '2026-11-04T10:00:00.000Z'
const JIRA = 'https://acme.atlassian.net/browse'

const page = (node: ReactNode) => <div className="w-[860px] max-w-full p-4">{node}</div>
const phone = (node: ReactNode) => <div className="w-[390px] max-w-full">{node}</div>

const ticket = (key: string, summary: string, over: Partial<GroupTicket> = {}): GroupTicket => ({
  key,
  summary,
  url: `${JIRA}/${key}`,
  status: 'To Do',
  issueType: 'Task',
  ...over,
})

const WORKED = ticket('OSC-412', 'Show the renewal date on the plan page', {
  status: 'In Progress',
  priority: 'High',
  groupStory: { id: 'gs-renewal', title: 'Renewal date on the plan page' },
})
const NEXT = ticket('OSC-418', 'Check-in reminders skip people on a paused plan', {
  priority: 'Highest',
})
const SPRINT: GroupTicket[] = [
  WORKED,
  NEXT,
  ticket('OSC-421', 'Coach notes lose their line breaks after an edit', { priority: 'Medium' }),
  ticket('OSC-425', 'Weekly review email has the wrong week number', {
    status: 'In Review',
    priority: 'Medium',
    groupStory: { id: 'gs-weekly', title: 'Weekly review email fixes' },
  }),
  ticket('OSC-430', 'Add an empty state to the goals list', { priority: 'Low' }),
]
const LIST: GroupTicketList = {
  connected: true,
  access: 'read-write',
  tickets: SPRINT,
  nextTicketKey: NEXT.key,
}

const ticketsState = (over: Partial<GroupTicketsState> = {}): GroupTicketsState => ({
  list: LIST,
  readError: null,
  loadingMore: false,
  planning: undefined,
  planError: null,
  ...over,
})

type PanelOptions = {
  state?: Partial<GroupTicketsState>
  layout?: TakeNextTicketLayout
  sprintOpen?: boolean
}

function panel({ state, layout, sprintOpen }: PanelOptions = {}) {
  const view = takeNextTicketView(ticketsState(state))
  if (!view) return null
  return (
    <TakeNextTicket
      view={view}
      onPlan={noop}
      onOpenStory={noop}
      onRetry={noop}
      onLoadMore={noop}
      {...(layout ? { layout } : {})}
      {...(sprintOpen ? { sprintOpen } : {})}
    />
  )
}

function part(projectId: string, projectTitle: string, step: number): GroupStoryPartView {
  return {
    projectId,
    projectTitle,
    storyId: `story-${projectId}`,
    storyTitle: 'Renewal date on the plan page',
    status: 'pending',
    featuresDone: 0,
    featuresTotal: 2,
    needs: step > 1 ? ['compass-be'] : [],
    step,
  }
}

function groupStory(
  id: string,
  title: string,
  key: string | undefined,
  over: Partial<GroupStoryView> = {},
): GroupStoryView {
  const partViews = [part('compass-be', 'Compass BE', 1), part('compass-web', 'Compass Web', 2)]
  return {
    id,
    groupId: 'osc',
    groupTitle: 'OSC',
    title,
    description:
      'The plan page shows when a plan renews, so a person never has to ask.\n\n## Why\nSupport answers this by hand every week.',
    parts: partViews.map((p) => ({ projectId: p.projectId, storyId: p.storyId })),
    createdAt: AT,
    updatedAt: AT,
    partViews,
    steps: [['compass-be'], ['compass-web']],
    problems: [],
    status: 'pending',
    ...(key
      ? {
          externalIds: [{ provider: 'jira', externalId: key, url: `${JIRA}/${key}`, title }],
        }
      : {}),
    ...over,
  }
}

const STORIES = [
  groupStory('gs-renewal', 'Renewal date on the plan page', 'OSC-412', { status: 'in_progress' }),
  groupStory('gs-weekly', 'Weekly review email fixes', 'OSC-425'),
  groupStory('gs-old', 'Older ticket, off this sprint', 'OSC-301', { status: 'reviewable' }),
  groupStory('gs-plain', 'A group story with no ticket', undefined),
]
const STATUSES = groupTicketStatuses(SPRINT)

function ListState({
  ticketPanel,
  start,
}: {
  ticketPanel?: ReactNode
  start?: Partial<GroupStoryListFilter>
}) {
  const [filter, setFilter] = useState<GroupStoryListFilter>({
    ...GROUP_STORY_LIST_FILTER_DEFAULT,
    ...start,
  })
  return (
    <GroupStoriesList
      stories={STORIES}
      filter={filter}
      onFilterChange={(change) => setFilter((f) => ({ ...f, ...change }))}
      onOpenStory={noop}
      onRun={noop}
      onOpenRun={noop}
      onNew={noop}
      ticketStatuses={STATUSES}
      {...(ticketPanel ? { ticketPanel } : {})}
    />
  )
}

function ChooseTicketLayout() {
  const [layout, setLayout] = useState<TakeNextTicketLayout>('card')
  return (
    <div className="flex flex-col gap-3">
      <div className="px-4 pt-4">
        <SegmentedControl
          ariaLabel="Layout"
          value={layout}
          onChange={(next) => setLayout(next as TakeNextTicketLayout)}
          options={TAKE_NEXT_TICKET_LAYOUTS.map((value) => ({
            value,
            label: TAKE_NEXT_TICKET_LAYOUT_LABELS[value],
          }))}
        />
      </div>
      <ListState ticketPanel={panel({ layout })} />
    </div>
  )
}

const TICKET_LAYOUT_DESCRIPTIONS: Record<TakeNextTicketLayout, string> = {
  card: 'The default that ships. The next ticket and what taking it does, with the sprint folded to one line that counts it: the group stories below stay near the top of the tab.',
  list: 'The sprint as one list, the next ticket marked and holding the button. Nothing to unfold, but a long sprint pushes the group stories down.',
  columns:
    'The next ticket beside the sprint on a wide page; stacked on a narrow one. Everything shows at once and takes the most room.',
}

const takeLayoutStates: SceneState[] = TAKE_NEXT_TICKET_LAYOUTS.flatMap((layout) => [
  {
    id: `layout-${layout}`,
    title: TAKE_NEXT_TICKET_LAYOUT_LABELS[layout],
    description: TICKET_LAYOUT_DESCRIPTIONS[layout],
    render: () => <ListState ticketPanel={panel({ layout })} />,
  },
  {
    id: `layout-${layout}-phone`,
    title: `${TAKE_NEXT_TICKET_LAYOUT_LABELS[layout]}, on a phone`,
    description: 'The small-screen width: the mobile app’s native section follows this.',
    render: () => phone(<ListState ticketPanel={panel({ layout })} />),
  },
])

const CHIP_SAMPLES = [
  ticketChipView({
    key: 'OSC-412',
    status: 'In Progress',
    title: 'Renewal',
    url: `${JIRA}/OSC-412`,
  }),
  ticketChipView({ key: 'OSC-301', title: 'Older ticket', url: `${JIRA}/OSC-301` }),
  ticketChipView({ key: 'OSC-77', status: 'Done', title: 'No link was kept' }),
]

function ChooseChipLayout() {
  const [layout, setLayout] = useState<TicketChipLayout>('joined')
  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        ariaLabel="Layout"
        value={layout}
        onChange={(next) => setLayout(next as TicketChipLayout)}
        options={TICKET_CHIP_LAYOUTS.map((value) => ({
          value,
          label: TICKET_CHIP_LAYOUT_LABELS[value],
        }))}
      />
      {chipSamples(layout)}
    </div>
  )
}

function chipSamples(layout: TicketChipLayout) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {CHIP_SAMPLES.map((view) => (
        <TicketChip key={view.key} view={view} layout={layout} />
      ))}
    </div>
  )
}

const PAGE_STORY = STORIES[0]!

function storyPage(statuses: Record<string, string> = STATUSES) {
  const chip = groupStoryTicketChip(PAGE_STORY, statuses)
  return (
    <GroupStoryPage
      story={PAGE_STORY}
      onRun={noop}
      onOpenRun={noop}
      onEdit={noop}
      onDelete={asyncNoop}
      onOpenPartStory={noop}
      onBack={noop}
      {...(chip ? { ticket: chip } : {})}
    />
  )
}

const MOVE: TicketLaunchMove = {
  ticketKey: 'OSC-418',
  ticketTitle: 'Check-in reminders skip people on a paused plan',
  ticketUrl: `${JIRA}/OSC-418`,
  ticketStatus: 'To Do',
  change: 'OSC-418 → In Progress',
  transitionId: '31',
  toStatus: 'In Progress',
}
const NAMED = {
  ticketKey: MOVE.ticketKey,
  ticketTitle: MOVE.ticketTitle!,
  ticketUrl: MOVE.ticketUrl!,
}
const READ_ONLY: TicketLaunchMove = {
  ...NAMED,
  unavailable: 'Jira is read-only here, so the ticket stays as it is.',
}
const ALREADY: TicketLaunchMove = {
  ...NAMED,
  ticketStatus: 'In Progress',
  unavailable: 'OSC-418 is already In Progress.',
}
const NO_MOVE: TicketLaunchMove = {
  ...NAMED,
  ticketStatus: 'Blocked',
  unavailable: 'OSC-418 has no move to In Progress from Blocked.',
}
const JIRA_DOWN: TicketLaunchMove = { ...NAMED, unavailable: 'Jira did not answer.' }

const BRANCHES = { branches: ['dev', 'main'], preselected: 'dev' }

function leg(
  projectId: string,
  projectTitle: string,
  dependsOn: string[],
): GroupStoryRunPreview['legs'][number] {
  return {
    projectId,
    projectTitle,
    storyId: `story-${projectId}`,
    storyTitle: 'Check-in reminders on a paused plan',
    dependsOn,
    features: 2,
    isPrerequisite: dependsOn.length === 0,
    baseBranches: BRANCHES,
    baseBranch: 'dev',
  }
}

const previewOf = (ticketMove?: TicketLaunchMove): GroupStoryRunPreview => ({
  groupId: 'osc',
  groupTitle: 'OSC',
  legs: [
    leg('compass-be', 'Compass BE', []),
    { ...leg('compass-web', 'Compass Web', ['compass-be']), isPrerequisite: false },
  ],
  waves: [['compass-be'], ['compass-web']],
  problems: [],
  buildMode: 'on-branch',
  ...(ticketMove ? { ticketMove } : {}),
})

function RunDialogState({
  move,
  layout,
  started,
}: {
  move?: TicketLaunchMove
  layout?: TicketMoveLayout
  started?: GroupStoryRunStartedAnswer
}) {
  return (
    <GroupStoryRunDialog
      isOpen
      onClose={noop}
      title="Check-in reminders on a paused plan"
      preview={previewOf(move)}
      basePicks={{}}
      onPickBase={noop}
      onStart={async () => ({ groupRunId: 'run-2', message: 'Started.' })}
      onOpenRun={noop}
      {...(layout ? { ticketMoveLayout: layout } : {})}
      {...(started ? { started } : {})}
    />
  )
}

function ChooseMoveLayout() {
  const [layout, setLayout] = useState<TicketMoveLayout>('top')
  return (
    <>
      <div className="fixed left-4 top-4 z-[100]">
        <SegmentedControl
          ariaLabel="Layout"
          value={layout}
          onChange={(next) => setLayout(next as TicketMoveLayout)}
          options={TICKET_MOVE_LAYOUTS.map((value) => ({
            value,
            label: TICKET_MOVE_LAYOUT_LABELS[value],
          }))}
        />
      </div>
      <RunDialogState move={MOVE} layout={layout} />
    </>
  )
}

function MoveField({ move, start = true }: { move: TicketLaunchMove; start?: boolean }) {
  const [ticked, setTicked] = useState(start)
  const field = ticketMoveField(move)
  return field ? <TicketMoveField field={field} ticked={ticked} onToggle={setTicked} /> : null
}

const LAUNCH_ARGS = { reason: 'The story is planned and its parts are ready.' }

function ChatLaunchCard({ move }: { move: TicketLaunchMove }) {
  const view = groupWorkAskView(
    {
      title: 'Check-in reminders on a paused plan',
      legs: [
        { projectId: 'compass-be', storyId: 'a' },
        { projectId: 'compass-web', storyId: 'b' },
      ],
    },
    LAUNCH_ARGS,
    'on-branch',
  )
  return (
    <div className="w-[560px] max-w-full p-4">
      <ToolAskCard
        view={view}
        busy={false}
        error={null}
        ready
        onApprove={noop}
        onDeny={noop}
        onLater={noop}
      >
        <MoveField move={move} />
      </ToolAskCard>
    </div>
  )
}

const STARTED = 'Started “Check-in reminders on a paused plan” across 2 projects on the API agent.'

const walkthroughItem = (
  id: string,
  title: string,
  over: Partial<RunWalkthroughItem> = {},
): RunWalkthroughItem => ({
  id,
  projectId: 'compass-web',
  evidenceId: `e-${id}`,
  title,
  open: 'Compass Web, staging, signed in as the paused test account',
  steps: [
    'Open Settings and pause the plan',
    'Wait for the check-in time to pass',
    'Open Notifications',
  ],
  mustShow: ['The plan marked Paused', 'No new check-in reminder in the list'],
  ...over,
})

const LOOM_ITEMS: RunWalkthroughItem[] = [
  walkthroughItem('paused', 'No reminder reaches a paused person', {
    result: {
      kind: 'link',
      url: 'https://www.loom.com/share/5f2a',
      evidenceId: 'r1',
    },
  }),
  walkthroughItem('resumed', 'Reminders come back after the plan resumes', {
    open: 'Compass Web, staging, the same account',
    steps: ['Resume the plan', 'Wait for the next check-in time', 'Open Notifications'],
    mustShow: ['The plan marked Active', 'The new reminder with its time'],
  }),
  walkthroughItem('mobile', 'The same on a phone', {
    open: 'Compass on a real phone',
    steps: ['Pause the plan', 'Leave the app closed past the check-in time'],
    mustShow: ['No push notification arrives'],
  }),
]

const loomState = (over: Partial<RunWalkthroughState> = {}): RunWalkthroughState => ({
  items: LOOM_ITEMS,
  sending: {},
  errors: {},
  ...over,
})

type LoomOptions = {
  state?: Partial<RunWalkthroughState>
  layout?: LoomWalkthroughLayout
  openId?: string
  replacingId?: string
  linkDraft?: string
}

function loomPanel({ state, layout, openId, replacingId, linkDraft }: LoomOptions = {}) {
  const view = loomWalkthroughView(loomState(state))
  if (!view) return null
  return (
    <LoomWalkthroughPanel
      view={view}
      attachLink={async () => true}
      attachFile={async () => true}
      {...(layout ? { layout } : {})}
      {...(openId ? { openId } : {})}
      {...(replacingId ? { replacingId } : {})}
      {...(linkDraft ? { linkDraft } : {})}
    />
  )
}

function ChooseLoomLayout() {
  const [layout, setLayout] = useState<LoomWalkthroughLayout>('folds')
  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        ariaLabel="Layout"
        value={layout}
        onChange={(next) => setLayout(next as LoomWalkthroughLayout)}
        options={LOOM_WALKTHROUGH_LAYOUTS.map((value) => ({
          value,
          label: LOOM_WALKTHROUGH_LAYOUT_LABELS[value],
        }))}
      />
      {loomPanel({ layout })}
    </div>
  )
}

const LOOM_LAYOUT_DESCRIPTIONS: Record<LoomWalkthroughLayout, string> = {
  folds:
    'The default that ships. One step open at a time, the first still to record; attaching moves on to the next, so the person follows the script without scrolling past what is done.',
  cards: 'Every step open at once: the whole job in one read, and the longest page.',
  script:
    'Each step’s script beside its attach box on a wide page, so the box stays in sight while recording; stacked on a narrow one.',
}

const loomLayoutStates: SceneState[] = LOOM_WALKTHROUGH_LAYOUTS.flatMap((layout) => [
  {
    id: `layout-${layout}`,
    title: LOOM_WALKTHROUGH_LAYOUT_LABELS[layout],
    description: LOOM_LAYOUT_DESCRIPTIONS[layout],
    render: () => page(loomPanel({ layout })),
  },
  {
    id: `layout-${layout}-phone`,
    title: `${LOOM_WALKTHROUGH_LAYOUT_LABELS[layout]}, on a phone`,
    description: 'The small-screen width: the mobile app’s native tab follows this.',
    render: () => <div className="w-[390px] max-w-full p-4">{loomPanel({ layout })}</div>,
  },
])

function SignoffChips({ left, active = false }: { left: number; active?: boolean }) {
  const tabs = reviewTabs({
    screens: 0,
    walkthroughs: 0,
    reports: 1,
    testCount: 214,
    testChecks: 1,
    buildChecks: 1,
    changedFiles: undefined,
    loom: { total: 3, left },
  })
  const passed = (id: 'tests' | 'build' | 'report') =>
    ({
      id,
      label: tabs.find((t) => t.id === id)?.label ?? id,
      noun: id,
      state: 'passed',
      detail: '',
      available: true,
      fill: 'run',
      action: { kind: 'open-proof', tab: id },
    }) as unknown as Parameters<typeof signoffEvidenceChips>[0][number]
  const chips = signoffEvidenceChips([passed('report'), passed('tests'), passed('build')], tabs, [
    'report',
    'loom',
    'tests',
    'build',
  ])
  return (
    <section className="overflow-hidden rounded-xl border border-(--border-subtle) bg-(--surface-raised)">
      <div
        role="tablist"
        className="flex flex-wrap items-center gap-2 border-b border-(--border-subtle) px-5 py-3.5"
      >
        {chips.map((chip) => (
          <CheckChip
            key={chip.key}
            row={chip.row}
            role="tab"
            selected={active ? chip.key === 'tab-loom' : chip.key === 'report'}
            onClick={noop}
          />
        ))}
      </div>
      {active ? (
        <div className="px-5 pb-5">
          {loomPanel(left === 0 ? { state: { items: recordedItems() } } : {})}
        </div>
      ) : null}
    </section>
  )
}

function recordedItems(): RunWalkthroughItem[] {
  return LOOM_ITEMS.map((item, i) => ({
    ...item,
    result:
      i === 2
        ? { kind: 'video', name: 'paused-on-phone.mp4', evidenceId: 'r3' }
        : { kind: 'link', url: `https://www.loom.com/share/${i}`, evidenceId: `r${i}` },
  }))
}

const moveStates: SceneState[] = [
  {
    id: 'offer-unticked',
    title: 'Left unticked',
    description: 'The run starts and the ticket stays where it is.',
    render: () => (
      <div className="w-[560px] max-w-full p-4">
        <MoveField move={MOVE} start={false} />
      </div>
    ),
  },
  {
    id: 'read-only',
    title: 'Jira is read-only here',
    description: 'No tick box, and why. The run still starts.',
    render: () => (
      <div className="w-[560px] max-w-full p-4">
        <MoveField move={READ_ONLY} />
      </div>
    ),
  },
  {
    id: 'already-moved',
    title: 'Already in progress',
    render: () => (
      <div className="w-[560px] max-w-full p-4">
        <MoveField move={ALREADY} />
      </div>
    ),
  },
  {
    id: 'no-move',
    title: 'Its workflow has no such move',
    render: () => (
      <div className="w-[560px] max-w-full p-4">
        <MoveField move={NO_MOVE} />
      </div>
    ),
  },
  {
    id: 'jira-failed',
    title: 'Jira did not answer',
    description: 'Jira failing costs the offer, never the launch.',
    render: () => (
      <div className="w-[560px] max-w-full p-4">
        <MoveField move={JIRA_DOWN} />
      </div>
    ),
  },
]

export const TICKET_SCENES: Scene[] = [
  {
    id: 'take-next-ticket',
    title: 'Take next ticket',
    component: 'TakeNextTicket',
    group: 'Project',
    kind: 'screen',
    wide: true,
    description:
      'On a group’s Stories tab, for a group with Jira: the top ticket assigned to the person in the open sprint that has no work yet, with its title and priority, and the sprint in board order with what already has work. A row with work opens its group story; a row without one starts its plan: an agent reads the ticket in a chat of its own and proposes a group story for the person to approve there. A group with no Jira sees none of this. Three layouts to pick from; the card ships.',
    states: [
      {
        id: 'choose-layout',
        title: 'Pick a layout',
        description: 'The three layouts on the tab itself, with the switch above them.',
        render: () => <ChooseTicketLayout />,
      },
      ...takeLayoutStates,
      {
        id: 'sprint-open',
        title: 'The sprint unfolded',
        description:
          'Each row: the ticket’s chip, priority, title, and its group story or “No work yet”.',
        render: () => <ListState ticketPanel={panel({ sprintOpen: true })} />,
      },
      {
        id: 'planning',
        title: 'A plan starting',
        description: 'One at a time: the rows with no work wait; rows with work still open.',
        render: () => (
          <ListState ticketPanel={panel({ sprintOpen: true, state: { planning: NEXT.key } })} />
        ),
      },
      {
        id: 'plan-refused',
        title: 'A plan that did not start',
        description:
          'The backend’s reason. The list is read again, as a refusal may mean it was stale.',
        render: () =>
          page(
            panel({
              state: { planError: 'OSC-418 already has the group story “Paused plan reminders”.' },
            }),
          ),
      },
      {
        id: 'all-have-work',
        title: 'Every ticket has work',
        render: () =>
          page(
            panel({
              state: {
                list: {
                  connected: true,
                  tickets: [WORKED, SPRINT[3]!],
                },
              },
              sprintOpen: true,
            }),
          ),
      },
      {
        id: 'no-tickets',
        title: 'Nothing assigned',
        render: () => page(panel({ state: { list: { connected: true, tickets: [] } } })),
      },
      {
        id: 'read-failed',
        title: 'Jira could not be read',
        description: 'Jira’s words, and a way to try again.',
        render: () =>
          page(
            panel({ state: { list: undefined, readError: 'Jira answered 503: try again soon.' } }),
          ),
      },
      {
        id: 'read-failed-later',
        title: 'A later read failed',
        description: 'What was read stays on screen.',
        render: () => page(panel({ state: { readError: 'Jira answered 503: try again soon.' } })),
      },
      {
        id: 'more-pages',
        title: 'A sprint of more than one page',
        render: () =>
          page(panel({ state: { list: { ...LIST, nextPageToken: 'p2' } }, sprintOpen: true })),
      },
      {
        id: 'no-jira',
        title: 'A group with no Jira',
        description: 'The tab as it always was.',
        render: () => <ListState />,
      },
    ],
    controls: [
      {
        id: 'layout',
        label: 'Layout',
        kind: 'choice',
        options: TAKE_NEXT_TICKET_LAYOUTS.map((id) => ({
          id,
          label: TAKE_NEXT_TICKET_LAYOUT_LABELS[id],
        })),
        default: 'card',
      },
    ],
    presets: TAKE_NEXT_TICKET_LAYOUTS.map((id) => ({
      id,
      name: TAKE_NEXT_TICKET_LAYOUT_LABELS[id],
      values: { layout: id },
    })),
    play: (values) => (
      <ListState
        ticketPanel={panel({ layout: (values.layout ?? 'card') as TakeNextTicketLayout })}
      />
    ),
  },
  {
    id: 'ticket-chip',
    title: 'Ticket chip on a group story',
    component: 'TicketChip',
    group: 'Project',
    description:
      'The ticket a group story works: its key and status, opening it in Jira in a new tab. On the group story page beside its title, and first among the chips of its row on the Stories tab. Status comes from the person’s sprint list, so a ticket off that list says its key alone. Two layouts to pick from; one chip ships.',
    states: [
      {
        id: 'choose-layout',
        title: 'Pick a layout',
        description: 'With a status, off the sprint list, and with no link to open.',
        render: () => page(<ChooseChipLayout />),
      },
      ...TICKET_CHIP_LAYOUTS.map((layout) => ({
        id: `layout-${layout}`,
        title: TICKET_CHIP_LAYOUT_LABELS[layout],
        description:
          layout === 'joined'
            ? 'The default that ships. Key and status read as one thing and take the least room on a row of chips.'
            : 'The status as a pill beside the key. Clearer apart, but a pill next to a run’s pill reads as a run’s state.',
        render: () => page(chipSamples(layout)),
      })),
      {
        id: 'on-the-rows',
        title: 'On the Stories tab',
        description: 'First among a row’s chips. A press on the chip opens Jira, not the row.',
        render: () => <ListState />,
      },
      {
        id: 'on-the-board',
        title: 'On the board',
        render: () => <ListState start={{ layout: 'board' }} />,
      },
      {
        id: 'on-the-page',
        title: 'On the group story page',
        render: () => storyPage(),
      },
      {
        id: 'on-the-page-off-sprint',
        title: 'On the page, off the sprint list',
        render: () => storyPage({}),
      },
      {
        id: 'on-the-page-phone',
        title: 'On the page, on a phone',
        render: () => phone(storyPage()),
      },
    ],
  },
  {
    id: 'ticket-launch-move',
    title: 'Moving the ticket at launch',
    component: 'TicketMoveField',
    group: 'Project',
    description:
      'Launching a group story with a ticket names the ticket and the one change approving makes to it, ticked by default, on the Run dialog and on the chat’s launch card alike. With no move to offer it says why and has no tick box. A move that fails never stops the run: the Run dialog says so, and a chat says so in its launch line. Two layouts to pick from; first on the card ships.',
    states: [
      {
        id: 'choose-layout',
        title: 'Pick a layout',
        overlay: true,
        description: 'The Run dialog, with the switch above it.',
        render: () => <ChooseMoveLayout />,
      },
      ...TICKET_MOVE_LAYOUTS.map((layout) => ({
        id: `layout-${layout}`,
        title: TICKET_MOVE_LAYOUT_LABELS[layout],
        overlay: true,
        description:
          layout === 'top'
            ? 'The default that ships. Read before the parts, as it is the one thing the launch changes outside the code.'
            : 'With the agent and the limits: tidier, but the only outside write sits below the fold on a long launch.',
        render: () => <RunDialogState move={MOVE} layout={layout} />,
      })),
      {
        id: 'chat-card',
        title: 'On the chat’s launch card',
        render: () => <ChatLaunchCard move={MOVE} />,
      },
      {
        id: 'chat-card-read-only',
        title: 'On the chat’s launch card, read-only',
        render: () => <ChatLaunchCard move={READ_ONLY} />,
      },
      ...moveStates,
      {
        id: 'started-moved',
        title: 'Started, ticket moved',
        overlay: true,
        description: 'Said in the sentence that says the run started.',
        render: () => (
          <RunDialogState
            move={MOVE}
            started={{
              groupRunId: 'run-2',
              message: `${STARTED} OSC-418 moved to In Progress.`,
              ticketMove: {
                ticketKey: 'OSC-418',
                moved: true,
                toStatus: 'In Progress',
                message: 'OSC-418 moved to In Progress.',
              },
            }}
          />
        ),
      },
      {
        id: 'started-not-moved',
        title: 'Started, ticket not moved',
        overlay: true,
        description: 'The run carries on, and the failure stands on its own line.',
        render: () => {
          const message =
            'OSC-418 was not moved: that move is no longer open to it. The run carries on.'
          return (
            <RunDialogState
              move={MOVE}
              started={{
                groupRunId: 'run-2',
                message: `${STARTED} ${message}`,
                ticketMove: { ticketKey: 'OSC-418', moved: false, message },
              }}
            />
          )
        },
      },
    ],
  },
  {
    id: 'loom-walkthrough',
    title: 'Loom walkthrough at sign-off',
    component: 'LoomWalkthroughPanel',
    group: 'Process',
    description:
      'What an agent could not capture, for a person to record: a chip beside Report, Tests and Build on a run’s sign-off, there only when the run has items. It lists each step with what to open, what to do and what must be visible, and takes a Loom link or a video for each. Three layouts to pick from; one step open ships.',
    states: [
      {
        id: 'choose-layout',
        title: 'Pick a layout',
        description: 'The three layouts on one board, with the switch above them.',
        render: () => page(<ChooseLoomLayout />),
      },
      ...loomLayoutStates,
      {
        id: 'chip-left',
        title: 'The chip, with steps left',
        description: 'It counts what is left to record, and carries no pass mark until nothing is.',
        render: () => page(<SignoffChips left={2} />),
      },
      {
        id: 'chip-opened',
        title: 'The chip, opened',
        render: () => page(<SignoffChips left={2} active />),
      },
      {
        id: 'chip-recorded',
        title: 'All recorded',
        description: 'Every step has a link or a video: the chip passes.',
        render: () => page(<SignoffChips left={0} active />),
      },
      {
        id: 'link-typed',
        title: 'A link ready to add',
        render: () => page(loomPanel({ linkDraft: 'https://www.loom.com/share/8c1d' })),
      },
      {
        id: 'bad-link',
        title: 'A link that is not one',
        description: 'Said before anything is sent.',
        render: () =>
          page(
            loomPanel({
              linkDraft: 'loom.com/share/8c1d',
              state: { errors: { resumed: 'A link must start with http:// or https://.' } },
            }),
          ),
      },
      {
        id: 'uploading',
        title: 'A video uploading',
        render: () =>
          page(
            loomPanel({
              state: { sending: { resumed: { kind: 'file', sentBytes: 42, totalBytes: 100 } } },
            }),
          ),
      },
      {
        id: 'upload-too-large',
        title: 'A video too large',
        description: 'The backend’s reason, on the step it belongs to.',
        render: () =>
          page(
            loomPanel({
              state: { errors: { resumed: 'clip.mp4 is larger than the 2 GB limit.' } },
            }),
          ),
      },
      {
        id: 'replacing',
        title: 'Replacing what was attached',
        description: 'A new link or video stands over what came before.',
        render: () => page(loomPanel({ openId: 'paused', replacingId: 'paused' })),
      },
    ],
    controls: [
      {
        id: 'layout',
        label: 'Layout',
        kind: 'choice',
        options: LOOM_WALKTHROUGH_LAYOUTS.map((id) => ({
          id,
          label: LOOM_WALKTHROUGH_LAYOUT_LABELS[id],
        })),
        default: 'folds',
      },
    ],
    presets: LOOM_WALKTHROUGH_LAYOUTS.map((id) => ({
      id,
      name: LOOM_WALKTHROUGH_LAYOUT_LABELS[id],
      values: { layout: id },
    })),
    play: (values) =>
      page(loomPanel({ layout: (values.layout ?? 'folds') as LoomWalkthroughLayout })),
  },
]
