import { useState, type ReactNode } from 'react'
import {
  TICKET_TRANSITION_LAYOUT_LABELS,
  TICKET_TRANSITION_LAYOUTS,
  TICKET_TRANSITION_STANDING,
  type TicketStatusList,
  type TicketTransitionLayout,
  type TicketTransitionStanding,
} from 'thefactory-ui/headless'
import { SegmentedControl, TicketTransitionField } from 'thefactory-ui/web'
import type { Scene, SceneState } from '../showcase/types'

const page = (node: ReactNode) => <div className="w-[640px] max-w-full p-4">{node}</div>
const phone = (node: ReactNode) => <div className="w-[390px] max-w-full p-4">{node}</div>

const JIRA_STATUSES: TicketStatusList = {
  kind: 'ready',
  statuses: ['Done', 'In Progress', 'In Review', 'To Do'],
}
const GITHUB_STATES: TicketStatusList = { kind: 'ready', statuses: ['open', 'closed'] }
const NO_SCOPE: TicketStatusList = {
  kind: 'failed',
  reason: 'This token cannot read Jira statuses. It needs the read:jira-work scope.',
}

function Field({
  standing = TICKET_TRANSITION_STANDING.off,
  layout,
  initial = 'Done',
  statuses = JIRA_STATUSES,
  provider,
}: {
  standing?: TicketTransitionStanding
  layout?: TicketTransitionLayout
  initial?: string
  statuses?: TicketStatusList
  provider?: string
}) {
  const [value, setValue] = useState(initial)
  return (
    <TicketTransitionField
      value={value}
      onChange={setValue}
      statuses={statuses}
      standing={standing}
      initialOpen
      {...(layout ? { layout } : {})}
      {...(provider ? { provider } : {})}
    />
  )
}

/** The three layouts on one board, with the switch above them. */
function ChooseLayout() {
  const [layout, setLayout] = useState<TicketTransitionLayout>('inline')
  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        ariaLabel="Layout"
        value={layout}
        onChange={(next) => setLayout(next as TicketTransitionLayout)}
        options={TICKET_TRANSITION_LAYOUTS.map((value) => ({
          value,
          label: TICKET_TRANSITION_LAYOUT_LABELS[value],
        }))}
      />
      <Field key={layout} layout={layout} />
    </div>
  )
}

const LAYOUT_DESCRIPTIONS: Record<TicketTransitionLayout, string> = {
  inline:
    'The default that ships. One more list under the Jira limits, with what a sign-off would do right under it: nothing to open, and the off state is always in sight.',
  fold: 'Closed to one row under the picker, the state on the row: the shortest, and the words saying why are a click away.',
  panel: 'A panel of its own, the state at the top: the plainest, and the heaviest for one field.',
}

const layoutStates: SceneState[] = TICKET_TRANSITION_LAYOUTS.flatMap((layout) => [
  {
    id: `layout-${layout}`,
    title: TICKET_TRANSITION_LAYOUT_LABELS[layout],
    description: LAYOUT_DESCRIPTIONS[layout],
    render: () => page(<Field layout={layout} />),
  },
  {
    id: `layout-${layout}-phone`,
    title: `${TICKET_TRANSITION_LAYOUT_LABELS[layout]}, on a phone`,
    description: 'The small-screen width: the mobile app’s native field follows this.',
    render: () => phone(<Field layout={layout} />),
  },
])

const listState = (
  id: string,
  title: string,
  description: string,
  props: { initial?: string; statuses?: TicketStatusList; provider?: string },
): SceneState => ({
  id,
  title,
  description,
  render: () => page(<Field standing={TICKET_TRANSITION_STANDING.moves} {...props} />),
})

const standing = (
  id: string,
  title: string,
  value: TicketTransitionStanding,
  initial = 'Done',
): SceneState => ({
  id,
  title,
  render: () => page(<Field standing={value} initial={initial} />),
})

export const TICKET_TRANSITION_SCENES: Scene[] = [
  {
    id: 'ticket-sign-off-transition',
    title: 'Sign-off status on a ticket connection',
    component: 'TicketTransitionField',
    group: 'Settings',
    description:
      'The status a sign-off moves a ticket to, in the Tickets section of Settings → Group and → Project on all three apps. It lists what the connection can reach, and each ticket’s own move is found at sign-off, since transition ids differ per workflow. Write-back is off for now, so it says plainly that nothing is written until it is on. Three layouts; in line ships.',
    states: [
      {
        id: 'choose-layout',
        title: 'Pick a layout',
        description: 'The three layouts on one board, with the switch above them.',
        render: () => page(<ChooseLayout />),
      },
      ...layoutStates,
      listState(
        'list-leave',
        'Leave the ticket where it is',
        'The first row, and what nothing saved means: sign-off comments and moves nothing.',
        { initial: '' },
      ),
      listState(
        'list-reading',
        'Reading the statuses',
        'The list waits for the connection, keeping what is saved in sight.',
        { statuses: { kind: 'reading' } },
      ),
      listState(
        'list-saved-off-list',
        'A saved value not on the list',
        'Such as a status since renamed. It stays shown, and a ticket with no move to it stays where it is and says so.',
        { initial: 'Shipped' },
      ),
      listState(
        'list-other-case',
        'A saved status in another case',
        'A sign-off matches in any case, so the list finds it rather than adding a row.',
        { initial: 'done' },
      ),
      listState(
        'list-failed',
        'The list could not be read',
        'It falls back to typing a status name, and says why: here a token without the scope.',
        { statuses: NO_SCOPE },
      ),
      listState(
        'list-failed-empty',
        'Could not be read, nothing saved',
        'Blank still means leave the ticket where it is.',
        { statuses: NO_SCOPE, initial: '' },
      ),
      listState(
        'github-closed',
        'A GitHub connection',
        'GitHub has two states and no workflow, so the list is fixed. No read of GitHub, so it cannot fail.',
        { statuses: GITHUB_STATES, provider: 'github', initial: 'closed' },
      ),
      listState(
        'github-leave',
        'A GitHub connection, left alone',
        'Comment only, the same as Jira.',
        { statuses: GITHUB_STATES, provider: 'github', initial: '' },
      ),
      standing('write-back-off', 'Write-back off', TICKET_TRANSITION_STANDING.off),
      standing(
        'write-back-off-empty',
        'Write-back off, nothing set yet',
        TICKET_TRANSITION_STANDING.off,
        '',
      ),
      standing(
        'read-only',
        'On, but the binding is read only',
        TICKET_TRANSITION_STANDING.readOnly,
      ),
      standing(
        'project-limit',
        'On, but limited to Jira projects',
        TICKET_TRANSITION_STANDING.projectLimit,
      ),
      standing(
        'classic-token',
        'On, but with a classic API token',
        TICKET_TRANSITION_STANDING.classicToken,
      ),
      standing(
        'connection-gone',
        'On, but the connection is gone',
        TICKET_TRANSITION_STANDING.noConnection,
      ),
      standing(
        'comment-only',
        'On, leaving the ticket where it is',
        TICKET_TRANSITION_STANDING.commentOnly,
        '',
      ),
      standing('moves', 'On, with a status', TICKET_TRANSITION_STANDING.moves),
    ],
  },
]
