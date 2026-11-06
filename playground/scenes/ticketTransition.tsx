import { useState, type ReactNode } from 'react'
import {
  TICKET_TRANSITION_LAYOUT_LABELS,
  TICKET_TRANSITION_LAYOUTS,
  TICKET_TRANSITION_STANDING,
  type TicketTransitionLayout,
  type TicketTransitionStanding,
} from 'thefactory-ui/headless'
import { SegmentedControl, TicketTransitionField } from 'thefactory-ui/web'
import type { Scene, SceneState } from '../showcase/types'

const page = (node: ReactNode) => <div className="w-[640px] max-w-full p-4">{node}</div>
const phone = (node: ReactNode) => <div className="w-[390px] max-w-full p-4">{node}</div>

function Field({
  standing = TICKET_TRANSITION_STANDING.off,
  layout,
  initial = '31',
}: {
  standing?: TicketTransitionStanding
  layout?: TicketTransitionLayout
  initial?: string
}) {
  const [value, setValue] = useState(initial)
  return (
    <TicketTransitionField
      value={value}
      onChange={setValue}
      standing={standing}
      initialOpen
      {...(layout ? { layout } : {})}
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
    'The default that ships. One more field under the Jira limits, with what a sign-off would do right under it: nothing to open, and the off state is always in sight.',
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

const standing = (
  id: string,
  title: string,
  value: TicketTransitionStanding,
  initial = '31',
): SceneState => ({
  id,
  title,
  render: () => page(<Field standing={value} initial={initial} />),
})

export const TICKET_TRANSITION_SCENES: Scene[] = [
  {
    id: 'ticket-sign-off-transition',
    title: 'Sign-off transition on a ticket connection',
    component: 'TicketTransitionField',
    group: 'Settings',
    description:
      'The Jira transition a sign-off applies, in the Jira section of Settings → Group and → Project on all three apps. Write-back is off for now, so it says plainly that nothing is written until it is on. Three layouts; in line ships.',
    states: [
      {
        id: 'choose-layout',
        title: 'Pick a layout',
        description: 'The three layouts on one board, with the switch above them.',
        render: () => page(<ChooseLayout />),
      },
      ...layoutStates,
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
        'On, with no transition',
        TICKET_TRANSITION_STANDING.commentOnly,
        '',
      ),
      standing('moves', 'On, with a transition', TICKET_TRANSITION_STANDING.moves),
    ],
  },
]
