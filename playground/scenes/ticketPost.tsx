import { useState, type ReactNode } from 'react'
import {
  TICKET_POST_DEFAULT_LAYOUT,
  TICKET_POST_LAYOUT_LABELS,
  TICKET_POST_LAYOUTS,
  TICKET_POST_TEXT,
  ticketPostView,
  type TicketPost,
  type TicketPostLayout,
} from 'thefactory-ui/headless'
import { SegmentedControl, TicketPostNote } from 'thefactory-ui/web'
import type { Scene, SceneState } from '../showcase/types'

const page = (node: ReactNode) => <div className="w-[640px] max-w-full p-4">{node}</div>
const phone = (node: ReactNode) => <div className="w-[390px] max-w-full p-4">{node}</div>

const COMMENT = `Signed off: Renewal date on the plan page.

The plan page shows the renewal date, and says nothing for a plan with none.

- Return the renewal date
- Show it on the plan page`

const ticket = (externalId: string) => ({ provider: 'jira', externalId, posts: true })
const held = (externalId: string, why: string) => ({
  provider: 'jira',
  externalId,
  posts: false,
  why,
})

const OFF = 'Connector write-back is off, so nothing is posted'
const CLASSIC =
  'Write-back is disabled for a classic Jira API token: it routes by site URL. Use a scoped API token or OAuth; nothing was written'

const POSTS: TicketPost = { tickets: [ticket('ENG-214')], comment: COMMENT }
const MOVES: TicketPost = { ...POSTS, transition: 'Done' }

function Note({
  post,
  layout,
  startOpen,
}: {
  post: TicketPost
  layout?: TicketPostLayout
  startOpen?: boolean
}) {
  const view = ticketPostView(post)
  if (!view) return null
  return (
    <TicketPostNote
      view={view}
      {...(layout ? { layout } : {})}
      {...(startOpen ? { startOpen } : {})}
    />
  )
}

function ChooseLayout() {
  const [layout, setLayout] = useState<TicketPostLayout>(TICKET_POST_DEFAULT_LAYOUT)
  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        ariaLabel="Layout"
        value={layout}
        onChange={(next) => setLayout(next as TicketPostLayout)}
        options={TICKET_POST_LAYOUTS.map((value) => ({
          value,
          label: TICKET_POST_LAYOUT_LABELS[value],
        }))}
      />
      <Note post={MOVES} layout={layout} />
    </div>
  )
}

const LAYOUT_DESCRIPTIONS: Record<TicketPostLayout, string> = {
  fold: 'The default that ships. One line, with the comment a click away: the decision stays short.',
  quoted: 'The comment in full under the line: nothing to open, and a longer page before Approve.',
}

const layoutStates: SceneState[] = TICKET_POST_LAYOUTS.map((layout) => ({
  id: `layout-${layout}`,
  title: TICKET_POST_LAYOUT_LABELS[layout],
  description: LAYOUT_DESCRIPTIONS[layout],
  render: () => page(<Note post={MOVES} layout={layout} />),
}))

export const TICKET_POST_SCENES: Scene[] = [
  {
    id: 'ticket-post',
    title: 'What sign-off will post',
    component: 'TicketPostNote',
    group: 'Process',
    description:
      'On a run’s sign-off and a group’s, on all three apps: what approving would post to the tickets, in a line, before the decision. The comment reads word for word when it will post. With nothing to post it says why. Two layouts to pick from; folded ships.',
    states: [
      {
        id: 'choose-layout',
        title: 'Pick a layout',
        description: 'The two layouts, with the switch above them.',
        render: () => page(<ChooseLayout />),
      },
      ...layoutStates,
      {
        id: 'comment-open',
        title: 'The comment opened',
        render: () => page(<Note post={MOVES} startOpen />),
      },
      {
        id: 'no-transition',
        title: 'A comment and no move',
        render: () => page(<Note post={POSTS} />),
      },
      {
        id: 'several-tickets',
        title: 'Several tickets',
        description: 'Three are named, and the rest are counted.',
        render: () =>
          page(
            <Note
              post={{
                ...MOVES,
                tickets: ['ENG-214', 'ENG-215', 'ENG-216', 'ENG-217', 'ENG-218'].map(ticket),
              }}
            />,
          ),
      },
      {
        id: 'some-held-back',
        title: 'One ticket held back',
        description: 'What posts first, then which ticket does not and why.',
        render: () =>
          page(
            <Note
              post={{
                ...POSTS,
                tickets: [
                  ticket('ENG-214'),
                  held('ENG-215', 'External reference has no immutable issue identity'),
                ],
              }}
            />,
          ),
      },
      {
        id: 'write-back-off',
        title: 'Write-back off',
        description: 'No comment to read, and the reason in the line.',
        render: () => page(<Note post={{ tickets: [held('ENG-214', OFF)] }} />),
      },
      {
        id: 'classic-token',
        title: 'A classic token',
        description: 'The write policy’s own words, as a launch card gives them.',
        render: () => page(<Note post={{ tickets: [held('ENG-214', CLASSIC)] }} />),
      },
      {
        id: 'story-tickets-wait',
        title: 'The story’s tickets wait',
        description: 'This run signs off part of the story, so its tickets wait for the last run.',
        render: () =>
          page(
            <Note
              post={{
                tickets: [],
                waiting:
                  "The story's own tickets were left alone: they are written when the story is done.",
              }}
            />,
          ),
      },
      {
        id: 'could-not-read',
        title: 'Could not read it',
        description: 'Said plainly, so nobody takes silence for nothing being posted.',
        render: () =>
          page(<div className="text-[12.5px] text-(--text-muted)">{TICKET_POST_TEXT.failed}</div>),
      },
      {
        id: 'on-a-phone',
        title: 'On a phone',
        description: 'The small-screen width: the mobile app’s native note follows this.',
        render: () => phone(<Note post={MOVES} startOpen />),
      },
    ],
  },
]
