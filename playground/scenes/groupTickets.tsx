import { useState } from 'react'
import {
  GROUP_TICKETS_DEFAULT_LAYOUT,
  GROUP_TICKETS_LAYOUT_LABELS,
  GROUP_TICKETS_LAYOUTS,
  groupTicketsView,
  type GroupTicketsLayout,
  type GroupTicketsShown,
  type GroupTicketsState,
} from 'thefactory-ui/headless'
import { GroupTicketsList, SegmentedControl } from 'thefactory-ui/web'
import type { Scene, SceneState } from '../showcase/types'
import {
  FOUND,
  listOf,
  MINE,
  NEXT,
  NOT_READ,
  OTHERS,
  read,
  STARTED,
  ticketsState,
  WORKED,
} from './groupTicketsFixtures'

const noop = () => {}
const JIRA_DOWN = 'Jira answered 503: try again soon.'

type Options = {
  state?: Partial<GroupTicketsState>
  layout?: GroupTicketsLayout
  shownFirst?: GroupTicketsShown
}

function Tab({ state, layout, shownFirst }: Options) {
  return (
    <GroupTicketsList
      view={groupTicketsView(ticketsState(state))}
      query={state?.search?.query ?? ''}
      onQueryChange={noop}
      onDiscuss={noop}
      onPlan={noop}
      onOpenStory={noop}
      onOpenSettings={noop}
      onRetry={noop}
      onLoadMore={noop}
      {...(layout ? { layout } : {})}
      {...(shownFirst ? { shownFirst } : {})}
    />
  )
}

const tab = (options: Options = {}) => <Tab {...options} />
const phone = (options: Options = {}) => <div className="w-[390px] max-w-full">{tab(options)}</div>

const searched = (query: string, over: Partial<GroupTicketsState['search']> = {}) => ({
  search: { ...NOT_READ, query, ...over },
})

function ChooseLayout() {
  const [layout, setLayout] = useState<GroupTicketsLayout>(GROUP_TICKETS_DEFAULT_LAYOUT)
  return (
    <div className="flex flex-col gap-1">
      <div className="px-4 pt-4">
        <SegmentedControl
          ariaLabel="Layout"
          value={layout}
          onChange={(next) => setLayout(next as GroupTicketsLayout)}
          options={GROUP_TICKETS_LAYOUTS.map((value) => ({
            value,
            label: GROUP_TICKETS_LAYOUT_LABELS[value],
          }))}
        />
      </div>
      {tab({ layout })}
    </div>
  )
}

const LAYOUT_DESCRIPTIONS: Record<GroupTicketsLayout, string> = {
  sections:
    'The default that ships. Yours, the next ticket on top, then the rest of the sprint under them: one scroll, and nothing to switch to find a ticket.',
  segmented:
    'One list at a time, with a count on each. The shortest page and the least to read, but the rest of the sprint is a press away and no longer in view.',
  columns:
    'Yours beside the rest of the sprint on a wide page; stacked on a narrow one, where it is the first layout. The most at once, with half the width for each summary.',
}

const layoutStates: SceneState[] = GROUP_TICKETS_LAYOUTS.flatMap((layout) => [
  {
    id: `layout-${layout}`,
    title: GROUP_TICKETS_LAYOUT_LABELS[layout],
    description: LAYOUT_DESCRIPTIONS[layout],
    render: () => tab({ layout }),
  },
  {
    id: `layout-${layout}-phone`,
    title: `${GROUP_TICKETS_LAYOUT_LABELS[layout]}, on a phone`,
    description: 'The small-screen width: the mobile app’s native screen follows this.',
    render: () => phone({ layout }),
  },
])

export const GROUP_TICKETS_SCENES: Scene[] = [
  {
    id: 'group-tickets',
    title: 'Tickets tab',
    component: 'GroupTicketsList',
    group: 'Project',
    kind: 'screen',
    wide: true,
    description:
      'A group’s Tickets tab, right after Stories. The person’s tickets first, the next one to take on top of them, then the rest of the open sprint, and a search that finds any ticket by key or words, Done ones too. Pressing a row opens its discussion. Take ticket shows only on a ticket that can be taken, so a started one reads at a glance as one to talk about. A ticket with a group story links to it. Three layouts to pick from; One after the other ships.',
    states: [
      {
        id: 'choose-layout',
        title: 'Pick a layout',
        description: 'The three layouts on the tab itself, with the switch above them.',
        render: () => <ChooseLayout />,
      },
      ...layoutStates,
      {
        id: 'segmented-others',
        title: 'One list at a time, on Others',
        description: 'The next ticket stays with Yours.',
        render: () => tab({ layout: 'segmented', shownFirst: 'others' }),
      },
      {
        id: 'all-started',
        title: 'Nothing left to take',
        description: 'No next ticket, and every row offers Discuss alone.',
        render: () => tab({ state: { mine: read(listOf([WORKED, STARTED])) } }),
      },
      {
        id: 'nothing-assigned',
        title: 'Nothing assigned',
        description: 'The rest of the sprint can still be discussed.',
        render: () => tab({ state: { mine: read(listOf([])) } }),
      },
      {
        id: 'empty-sprint',
        title: 'An empty sprint',
        render: () => tab({ state: { mine: read(listOf([])), sprint: read(listOf([])) } }),
      },
      {
        id: 'only-next',
        title: 'The next ticket is all there is',
        render: () =>
          tab({
            state: {
              mine: read(listOf([NEXT], { nextTicketKey: NEXT.key })),
              sprint: read(listOf([])),
            },
          }),
      },
      {
        id: 'discussion-opening',
        title: 'A discussion opening',
        description: 'One chat at a time: the other rows wait; chips and story links still open.',
        render: () => tab({ state: { starting: { key: WORKED.key, action: 'discuss' } } }),
      },
      {
        id: 'plan-starting',
        title: 'A plan starting',
        render: () => tab({ state: { starting: { key: NEXT.key, action: 'plan' } } }),
      },
      {
        id: 'start-refused',
        title: 'A chat that did not open',
        description: 'The backend’s reason. The lists are read again, as they may be stale.',
        render: () =>
          tab({
            state: { startError: 'OSC-418 is In Progress, so it can be discussed but not taken.' },
          }),
      },
      {
        id: 'search-key',
        title: 'Found by key',
        description: 'The lists give way to the results. A Done ticket can be discussed.',
        render: () =>
          tab({
            state: searched('osc-287', { ...read(listOf([FOUND[0]!])) }),
          }),
      },
      {
        id: 'search-words',
        title: 'Found by words',
        description: 'Any ticket: Done, someone else’s, or one that can still be taken.',
        render: () => tab({ state: searched('renewal', { ...read(listOf(FOUND)) }) }),
      },
      {
        id: 'search-phone',
        title: 'Found by words, on a phone',
        render: () => phone({ state: searched('renewal', { ...read(listOf(FOUND)) }) }),
      },
      {
        id: 'searching',
        title: 'Searching',
        render: () => tab({ state: searched('renewal') }),
      },
      {
        id: 'search-none',
        title: 'Nothing found',
        render: () => tab({ state: searched('znr-780', { ...read(listOf([])) }) }),
      },
      {
        id: 'search-failed',
        title: 'A search that failed',
        description: 'Jira’s words, and a way to try again.',
        render: () => tab({ state: searched('renewal', { readError: JIRA_DOWN }) }),
      },
      {
        id: 'more-pages',
        title: 'A sprint of more than one page',
        render: () =>
          tab({
            state: {
              mine: {
                ...read(listOf(MINE, { nextTicketKey: NEXT.key, nextPageToken: 'p2' })),
                loadingMore: true,
              },
              sprint: read(listOf(OTHERS, { nextPageToken: 'p2' })),
            },
          }),
      },
      {
        id: 'loading',
        title: 'Being read',
        render: () => tab({ state: { mine: NOT_READ, sprint: NOT_READ } }),
      },
      {
        id: 'others-loading',
        title: 'Yours read, the rest still coming',
        render: () => tab({ state: { sprint: NOT_READ } }),
      },
      {
        id: 'read-failed',
        title: 'Jira could not be read',
        description: 'Both lists failed the same way, so it is said once.',
        render: () =>
          tab({
            state: {
              mine: { ...NOT_READ, readError: JIRA_DOWN },
              sprint: { ...NOT_READ, readError: JIRA_DOWN },
            },
          }),
      },
      {
        id: 'others-failed',
        title: 'The rest of the sprint could not be read',
        description: 'Yours stay on screen.',
        render: () => tab({ state: { sprint: { ...NOT_READ, readError: JIRA_DOWN } } }),
      },
      {
        id: 'no-jira',
        title: 'A group with no Jira',
        description: 'A short line and the way to Settings → Group.',
        render: () =>
          tab({
            state: {
              mine: read({ connected: false, tickets: [] }),
              sprint: read({ connected: false, tickets: [] }),
            },
          }),
      },
    ],
    controls: [
      {
        id: 'layout',
        label: 'Layout',
        kind: 'choice',
        options: GROUP_TICKETS_LAYOUTS.map((id) => ({
          id,
          label: GROUP_TICKETS_LAYOUT_LABELS[id],
        })),
        default: GROUP_TICKETS_DEFAULT_LAYOUT,
      },
    ],
    presets: GROUP_TICKETS_LAYOUTS.map((id) => ({
      id,
      name: GROUP_TICKETS_LAYOUT_LABELS[id],
      values: { layout: id },
    })),
    play: (values) =>
      tab({ layout: (values.layout ?? GROUP_TICKETS_DEFAULT_LAYOUT) as GroupTicketsLayout }),
  },
]
