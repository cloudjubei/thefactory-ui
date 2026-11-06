import { useState, type ReactNode } from 'react'
import {
  GROUP_CONSTELLATION_DEFAULT_LAYOUT,
  GROUP_CONSTELLATION_LAYOUT_LABELS,
  GROUP_CONSTELLATION_LAYOUTS,
  GROUP_HOME_DEFAULT_LAYOUT,
  GROUP_HOME_LAYOUT_LABELS,
  GROUP_HOME_LAYOUTS,
  PROCESS_RUN_WORDS,
  groupStatusView,
  type GroupConstellationLayout,
  type GroupHomeLayout,
  type GroupMemberView,
  type GroupStatusBadge,
  type GroupStatusView,
} from 'thefactory-ui/headless'
import {
  GroupHome,
  GroupHomeConnected,
  SegmentedControl,
  type GroupHomeProjectCard,
} from 'thefactory-ui/web'
import { fakeProcessRunsMatching } from '../../src/fakeBackend/fixtures/processRuns'
import { FAKE_GROUP_ID, MEMBERS } from '../../src/fakeBackend/fixtures/projects'
import {
  FAKE_GROUP_CONSTELLATION,
  FAKE_GROUP_STATUS,
  FAKE_GROUP_STATUS_AT,
} from '../../src/fakeBackend/fixtures/projectsGroups'
import { OnFixtures, type FixtureRoutes } from './onFixtures'
import type { Scene } from '../showcase/types'

const noop = () => {}
const AT = Date.parse(FAKE_GROUP_STATUS_AT)
const PROJECTS: GroupHomeProjectCard[] = MEMBERS.map(({ id, title }) => ({ id, title }))

const STATUS_PATH = '/api/v1/projects-groups/{id}/status'
const MAP_PATH = '/api/v1/projects-groups/{id}/constellation'

const notRead = () => {
  throw new Error('Not read.')
}

const QUIET: FixtureRoutes = {
  [STATUS_PATH]: () => ({
    ...FAKE_GROUP_STATUS,
    members: FAKE_GROUP_STATUS.members.map((member) => ({
      ...member,
      runs: { running: [], parked: [] },
      groupRuns: [],
      failingChecks: [],
      openRequests: [],
    })),
  }),
  '/api/v1/process-runs': () => [],
}

type MemberStatus = (typeof FAKE_GROUP_STATUS)['members'][number]

/** A quiet group with one member holding only what it is given. */
const ONLY: (over: Partial<MemberStatus>) => FixtureRoutes = (over) => ({
  ...QUIET,
  [STATUS_PATH]: () => ({
    ...FAKE_GROUP_STATUS,
    members: FAKE_GROUP_STATUS.members.map((member) => ({
      ...member,
      runs: { running: [], parked: [] },
      groupRuns: [],
      failingChecks: [],
      openRequests: [],
      ...(member.projectId === 'thefactory-backend' ? over : {}),
    })),
  }),
})

const ONE_CHECK = ONLY({
  failingChecks: [
    { kind: 'lint', status: 'failed', summary: '3 lint errors', ranAt: FAKE_GROUP_STATUS_AT },
  ],
})

const ONE_REQUEST = ONLY({
  openRequests: [
    {
      id: 'request-to-accept',
      title: 'Expose the sign-off route',
      status: 'pending',
      updatedAt: FAKE_GROUP_STATUS_AT,
    },
  ],
})

const NOT_READ: FixtureRoutes = { [STATUS_PATH]: notRead, [MAP_PATH]: notRead }

const NO_EDGES: FixtureRoutes = {
  [MAP_PATH]: () => ({ ...FAKE_GROUP_CONSTELLATION, dependencies: [] }),
}

function Home({
  layout = GROUP_HOME_DEFAULT_LAYOUT,
  dependencies = GROUP_CONSTELLATION_DEFAULT_LAYOUT,
  routes,
}: {
  layout?: GroupHomeLayout
  dependencies?: GroupConstellationLayout
  routes?: FixtureRoutes
}) {
  return (
    <OnFixtures {...(routes ? { routes } : {})}>
      <GroupHomeConnected
        groupId={FAKE_GROUP_ID}
        title="Overseer"
        typeTag="MAIN"
        projects={PROJECTS}
        layout={layout}
        constellationLayout={dependencies}
        now={AT}
        onSelectProject={noop}
        onSelectRun={noop}
        onSelectGroupRun={noop}
      />
    </OnFixtures>
  )
}

type NeedsYouCount = 'items' | 'projects' | 'runs'

const NEEDS_YOU_COUNTS: readonly NeedsYouCount[] = ['items', 'projects', 'runs']

const NEEDS_YOU_COUNT_LABELS: Record<NeedsYouCount, string> = {
  items: 'Every item',
  projects: 'Projects',
  runs: 'Runs only',
}

const needsYouBadge = (badges: readonly GroupStatusBadge[], count: number): GroupStatusBadge[] =>
  badges.flatMap((badge) => {
    if (badge.id !== 'needs-you') return [badge]
    return count > 0 ? [{ ...badge, label: `${PROCESS_RUN_WORDS.needsYou} ${count}` }] : []
  })

const runsWaiting = (member: GroupMemberView): number =>
  member.runs.filter((run) => run.section === 'needs-you').length

/** The roll-up's real view, its Needs you pills read the way the option counts. */
function countedAs(option: NeedsYouCount): GroupStatusView {
  const runs = fakeProcessRunsMatching(new URLSearchParams({ rootOnly: 'true' }))
  const view = groupStatusView(FAKE_GROUP_STATUS, runs, AT)
  if (option === 'items') return view
  if (option === 'projects') {
    const waiting = view.members.filter((member) => member.attention === 'needs-you').length
    return { ...view, headline: needsYouBadge(view.headline, waiting) }
  }
  const members = view.members.map((member) => ({
    ...member,
    badges: needsYouBadge(member.badges, runsWaiting(member)),
  }))
  const total = view.members.reduce((sum, member) => sum + runsWaiting(member), 0)
  const held = new Map(members.map((member) => [member.projectId, member]))
  return {
    ...view,
    headline: needsYouBadge(view.headline, total),
    members,
    sections: view.sections.map((section) => ({
      ...section,
      members: section.members.map((member) => held.get(member.projectId) ?? member),
    })),
  }
}

function Board<T extends string>({
  options,
  labels,
  initial,
  label,
  board,
}: {
  options: readonly T[]
  labels: Record<T, string>
  initial: T
  label: string
  board: (choice: T) => ReactNode
}) {
  const [choice, setChoice] = useState(initial)
  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        size="sm"
        ariaLabel={label}
        value={choice}
        onChange={(value) => setChoice(value as T)}
        options={options.map((id) => ({ value: id, label: labels[id] }))}
        className="w-fit"
      />
      {board(choice)}
    </div>
  )
}

export const GROUP_HOME_SCENES: Scene[] = [
  {
    id: 'group-home',
    title: 'Group cockpit',
    component: 'GroupHomeConnected',
    group: 'Project',
    wide: true,
    kind: 'screen',
    description:
      'A group of projects at a glance: what needs the person, what is running, how far each project is, its failing checks, how far its branch has moved and its open requests, then how the projects depend on each other. It reads the real hooks over the fake backend’s fixtures, and re-reads on the backend’s signal. Needs you first ships; Group order and Table are on the board.',
    states: [
      {
        id: 'choose-layout',
        title: 'Pick a layout',
        description: 'The three layouts on one board, with the switch above them.',
        render: () => (
          <Board
            options={GROUP_HOME_LAYOUTS}
            labels={GROUP_HOME_LAYOUT_LABELS}
            initial={GROUP_HOME_DEFAULT_LAYOUT}
            label="Layout"
            board={(layout) => <Home key={layout} layout={layout} />}
          />
        ),
      },
      ...GROUP_HOME_LAYOUTS.map((layout) => ({
        id: layout,
        title: GROUP_HOME_LAYOUT_LABELS[layout],
        description:
          layout === 'needs-you-first'
            ? 'What wants the person comes first, then what is working, then what is quiet.'
            : layout === 'cards'
              ? 'The same cards in the order the person keeps the group in.'
              : 'One row per project, one column per thing the roll-up says.',
        render: () => <Home layout={layout} />,
      })),
      {
        id: 'needs-you-count',
        title: 'What Needs you counts',
        description:
          'A failing check and a request nobody accepted put a project under Needs you. Every item ships: the pill adds up runs, checks and requests, a project’s pill and the group’s agree. Projects counts the cards under Needs you. Runs only is how it read before.',
        render: () => (
          <Board
            options={NEEDS_YOU_COUNTS}
            labels={NEEDS_YOU_COUNT_LABELS}
            initial="items"
            label="Needs you counts"
            board={(option) => (
              <GroupHome
                title="Overseer"
                typeTag="MAIN"
                projects={PROJECTS}
                view={countedAs(option)}
                onSelectProject={noop}
              />
            )}
          />
        ),
      },
      {
        id: 'only-a-check',
        title: 'Only a failing check',
        description: 'No run is waiting: the failing check alone puts the project under Needs you.',
        render: () => <Home routes={ONE_CHECK} />,
      },
      {
        id: 'only-a-request',
        title: 'Only a request to accept',
        description:
          'A request nobody accepted yet does the same, and says it waits to be accepted.',
        render: () => <Home routes={ONE_REQUEST} />,
      },
      {
        id: 'quiet',
        title: 'Nothing going on',
        description: 'A quiet group says so, and every project sits in Quiet.',
        render: () => <Home routes={QUIET} />,
      },
      {
        id: 'not-read',
        title: 'Status not read',
        description: 'The roll-up could not be read: the projects stay, as plain cards.',
        render: () => <Home routes={NOT_READ} />,
      },
    ],
    controls: [
      {
        id: 'layout',
        label: 'Layout',
        kind: 'choice',
        options: GROUP_HOME_LAYOUTS.map((id) => ({ id, label: GROUP_HOME_LAYOUT_LABELS[id] })),
        default: GROUP_HOME_DEFAULT_LAYOUT,
      },
      {
        id: 'dependencies',
        label: 'Dependencies',
        kind: 'choice',
        options: GROUP_CONSTELLATION_LAYOUTS.map((id) => ({
          id,
          label: GROUP_CONSTELLATION_LAYOUT_LABELS[id],
        })),
        default: GROUP_CONSTELLATION_DEFAULT_LAYOUT,
      },
    ],
    presets: GROUP_HOME_LAYOUTS.map((id) => ({
      id,
      name: GROUP_HOME_LAYOUT_LABELS[id],
      values: { layout: id },
    })),
    play: (values) => (
      <Home
        layout={(values.layout ?? GROUP_HOME_DEFAULT_LAYOUT) as GroupHomeLayout}
        dependencies={
          (values.dependencies ?? GROUP_CONSTELLATION_DEFAULT_LAYOUT) as GroupConstellationLayout
        }
      />
    ),
  },
  {
    id: 'group-dependencies',
    title: 'Group dependencies',
    component: 'GroupConstellation',
    group: 'Project',
    wide: true,
    description:
      'The cross-repo graph of a group, from the backend’s constellation of its members. A box’s dot is what the project wants from the person; a box or chip opens the project. A dashed line is a dependency only while developing. Layers ships; Ring and List are on the board.',
    states: [
      {
        id: 'choose-layout',
        title: 'Pick a layout',
        description: 'The three drawings on one board, with the switch above them.',
        render: () => (
          <Board
            options={GROUP_CONSTELLATION_LAYOUTS}
            labels={GROUP_CONSTELLATION_LAYOUT_LABELS}
            initial={GROUP_CONSTELLATION_DEFAULT_LAYOUT}
            label="Dependencies"
            board={(dependencies) => (
              <Home key={dependencies} layout="table" dependencies={dependencies} />
            )}
          />
        ),
      },
      {
        id: 'none',
        title: 'No dependencies',
        description: 'Members that do not depend on each other: it says so, with no empty map.',
        render: () => <Home layout="table" routes={NO_EDGES} />,
      },
    ],
  },
]
