import { useMemo, useState, type ReactNode } from 'react'
import {
  ChatActionsProvider,
  TICKET_STORY_PROPOSAL_LAYOUT_LABELS,
  TICKET_STORY_PROPOSAL_LAYOUTS,
  TicketLinksProvider,
  ticketStoryProposalView,
  type ChatActions,
  type PendingToolGrant,
  type TicketStoryProposalLayout,
} from 'thefactory-ui/headless'
import { SegmentedControl, TicketStoryProposalCard, ToolCallCard } from 'thefactory-ui/web'
// Not on the package's public surface: the chat renders it itself.
import ToolAskApprovalPanel from '../../src/web/compound/chat/ToolAskApprovalPanel'
import type { Scene, SceneState } from '../showcase/types'
import {
  STORY_PROPOSAL_ARGS,
  STORY_PROPOSAL_CREATED,
  STORY_PROPOSAL_LONG_ARGS,
  STORY_PROPOSAL_MANY_ARGS,
  STORY_PROPOSAL_REFUSAL,
  TICKET_SITE_URL,
  fakeTicketLinks,
} from './ticketLinkFixtures'

const noop = () => {}
const never = () => new Promise<void>(noop)

const page = (node: ReactNode) => <div className="w-[640px] max-w-full p-4">{node}</div>
const phone = (node: ReactNode) => <div className="w-[390px] max-w-full p-4">{node}</div>

const CHAT: ChatActions = {
  openReview: noop,
  reviewTargetOf: () => undefined,
  draftMessage: noop,
  groupId: 'g-acme',
  openGroupStory: noop,
}

/** A group chat bound to the made-up Jira, with a way to open a group story that goes nowhere. */
function InChat({ children }: { children: ReactNode }) {
  const links = useMemo(() => fakeTicketLinks('ready'), [])
  return (
    <ChatActionsProvider value={CHAT}>
      <TicketLinksProvider value={links}>{children}</TicketLinksProvider>
    </ChatActionsProvider>
  )
}

function Row({
  args = STORY_PROPOSAL_ARGS,
  result,
  resultType,
}: {
  args?: Record<string, unknown>
  result?: unknown
  resultType: string
}) {
  return (
    <InChat>
      <ToolCallCard
        toolCall={{ toolCallId: 't-story', name: 'proposeTicketGroupStory', arguments: args }}
        result={result}
        resultType={resultType}
      />
    </InChat>
  )
}

function Ask({ args = STORY_PROPOSAL_ARGS }: { args?: Record<string, unknown> }) {
  const grant: PendingToolGrant = {
    id: 'g-story',
    chatRunner: 'cli',
    label: 'proposeTicketGroupStory',
    toolName: 'proposeTicketGroupStory',
    args,
    detail: { tool: 'proposeTicketGroupStory', args },
    alwaysAllowScopes: [],
    grantCovers: 'exact-call',
    inline: true,
    decide: never,
  }
  return (
    <InChat>
      <ToolAskApprovalPanel grant={grant} onDecideLater={noop} />
    </InChat>
  )
}

function Card({
  args = STORY_PROPOSAL_ARGS,
  layout,
  expanded = false,
}: {
  args?: Record<string, unknown>
  layout?: TicketStoryProposalLayout
  expanded?: boolean
}) {
  return (
    <InChat>
      <div className="rounded-md border border-(--border-subtle) bg-(--surface-base) px-3 py-2.5">
        <TicketStoryProposalCard
          view={ticketStoryProposalView({
            args,
            resultType: 'require_confirmation',
            siteUrl: TICKET_SITE_URL,
          })}
          defaultExpanded={expanded}
          {...(layout ? { layout } : {})}
        />
      </div>
    </InChat>
  )
}

/** The two ways to draw the parts on one board, with the switch above them. */
function ChooseLayout() {
  const [layout, setLayout] = useState<TicketStoryProposalLayout>('rows')
  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        ariaLabel="Layout"
        value={layout}
        onChange={(next) => setLayout(next as TicketStoryProposalLayout)}
        options={TICKET_STORY_PROPOSAL_LAYOUTS.map((value) => ({
          value,
          label: TICKET_STORY_PROPOSAL_LAYOUT_LABELS[value],
        }))}
      />
      <Card args={STORY_PROPOSAL_MANY_ARGS} layout={layout} />
    </div>
  )
}

const LAYOUT_DESCRIPTIONS: Record<TicketStoryProposalLayout, string> = {
  rows: 'The default that ships. A row per part in the order the agent gave them, then the order in one plain line: short for the usual two or three parts.',
  steps:
    'The parts grouped under the step they run in, no sentence. Clearer once there are many parts; heavier for two.',
}

const layoutStates: SceneState[] = TICKET_STORY_PROPOSAL_LAYOUTS.map((layout) => ({
  id: `layout-${layout}`,
  title: TICKET_STORY_PROPOSAL_LAYOUT_LABELS[layout],
  description: LAYOUT_DESCRIPTIONS[layout],
  render: () => page(<Card args={STORY_PROPOSAL_MANY_ARGS} layout={layout} />),
}))

export const TICKET_STORY_PROPOSAL_SCENES: Scene[] = [
  {
    id: 'ticket-story-proposal',
    title: 'A ticket’s group story, proposed in a chat',
    component: 'TicketStoryProposalCard',
    group: 'Chat',
    description:
      'An agent’s proposeTicketGroupStory call, on its ask and on its tool row, in all three apps: the ticket’s chip, the story’s title as the heading, the description as formatted text folded past a few lines, a row per part (the project, and a new story or the one it already has), and the order from `needs` said plainly. Nothing is read to draw it, so the ask never waits: the ticket’s link comes from the chat’s Jira site and its preview opens on hover. Once approved the row names the group story that was made and opens it; a refusal is one plain line. Fixed sample data.',
    states: [
      {
        id: 'choose-layout',
        title: 'Pick a layout',
        description: 'Rows or steps, switched on the board, over a proposal with seven parts.',
        render: () => page(<ChooseLayout />),
      },
      ...layoutStates,
      {
        id: 'ask',
        title: 'The ask',
        description:
          'The approval card. The headline names the ticket and the story; Create makes the story and links it.',
        render: () => page(<Ask />),
      },
      {
        id: 'ask-row',
        title: 'Waiting, on its row',
        render: () => page(<Row resultType="require_confirmation" />),
      },
      {
        id: 'approved',
        title: 'Approved: the story was made',
        description:
          'The part stories by the titles they were made with, and the group story as a chip that opens it.',
        render: () => page(<Row result={STORY_PROPOSAL_CREATED} resultType="success" />),
      },
      {
        id: 'refused',
        title: 'Refused',
        description: 'Why no story was made, in the backend’s words, on one plain line.',
        render: () => page(<Row result={{ error: STORY_PROPOSAL_REFUSAL }} resultType="success" />),
      },
      {
        id: 'declined',
        title: 'Declined by the person',
        render: () =>
          page(<Row result={{ reason: 'You declined it.' }} resultType="not_allowed" />),
      },
      {
        id: 'long-description',
        title: 'A long description, folded',
        description: 'Folded past five lines, with Show more.',
        render: () => page(<Card args={STORY_PROPOSAL_LONG_ARGS} />),
      },
      {
        id: 'long-description-open',
        title: 'A long description, opened',
        description: 'Headings, a list and code, drawn as formatted text.',
        render: () => page(<Card args={STORY_PROPOSAL_LONG_ARGS} expanded />),
      },
      {
        id: 'many-parts',
        title: 'Many parts',
        description: 'Seven parts in four steps: the order line names each step.',
        render: () => page(<Ask args={STORY_PROPOSAL_MANY_ARGS} />),
      },
      {
        id: 'one-part',
        title: 'One part, no description',
        description: 'Nothing to order, so no order is said.',
        render: () =>
          page(
            <Card
              args={{
                ticketKey: 'ZNR-781',
                title: 'Add a sign-out button',
                parts: [{ projectId: 'Web' }],
              }}
            />,
          ),
      },
      {
        id: 'ask-phone',
        title: 'The ask, on a phone',
        description: 'The small-screen width: the mobile app’s native card follows this.',
        render: () => phone(<Ask />),
      },
      {
        id: 'approved-phone',
        title: 'Approved, on a phone',
        render: () => phone(<Row result={STORY_PROPOSAL_CREATED} resultType="success" />),
      },
      {
        id: 'many-parts-phone',
        title: 'Many parts, on a phone',
        render: () => phone(<Card args={STORY_PROPOSAL_MANY_ARGS} />),
      },
    ],
  },
]
