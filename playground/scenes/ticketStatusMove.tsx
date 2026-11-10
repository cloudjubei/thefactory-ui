import { useMemo, useState, type ReactNode } from 'react'
import {
  TICKET_STATUS_MOVE_LAYOUT_LABELS,
  TICKET_STATUS_MOVE_LAYOUTS,
  TicketLinksProvider,
  ticketStatusMoveView,
  type PendingToolGrant,
  type TicketStatusMoveLayout,
} from 'thefactory-ui/headless'
import { SegmentedControl, TicketStatusMoveCard, ToolCallCard } from 'thefactory-ui/web'
// Not on the package's public surface: the chat renders it itself.
import ToolAskApprovalPanel from '../../src/web/compound/chat/ToolAskApprovalPanel'
import type { Scene, SceneState } from '../showcase/types'
import {
  MOVE_ARGS,
  MOVE_COMMENT,
  MOVE_LONG_RESULT,
  MOVE_REFUSAL,
  MOVE_RESULT,
  TICKET_IN_PROGRESS,
  fakeTicketLinks,
  type FakeTicketRead,
} from './ticketLinkFixtures'

const noop = () => {}
const never = () => new Promise<void>(noop)

const page = (node: ReactNode) => <div className="w-[640px] max-w-full p-4">{node}</div>
const phone = (node: ReactNode) => <div className="w-[390px] max-w-full p-4">{node}</div>

/** The made-up Jira the chat is bound to, answering the ticket's preview one way. */
function InChat({ read = 'ready', children }: { read?: FakeTicketRead; children: ReactNode }) {
  const links = useMemo(() => fakeTicketLinks(read), [read])
  return <TicketLinksProvider value={links}>{children}</TicketLinksProvider>
}

function Row({
  result,
  resultType,
  args = MOVE_ARGS,
  read,
}: {
  result?: unknown
  resultType: string
  args?: Record<string, unknown>
  read?: FakeTicketRead
}) {
  return (
    <InChat {...(read ? { read } : {})}>
      <ToolCallCard
        toolCall={{ toolCallId: 't-move', name: 'transitionJiraIssue', arguments: args }}
        result={result}
        resultType={resultType}
        {...(resultType === 'success' ? { durationMs: 840 } : {})}
      />
    </InChat>
  )
}

function Ask({ read, comment }: { read: FakeTicketRead; comment?: string }) {
  const args = { ...MOVE_ARGS, ...(comment ? { comment } : {}) }
  const grant: PendingToolGrant = {
    id: 'g-move',
    chatRunner: 'cli',
    label: 'transitionJiraIssue',
    toolName: 'transitionJiraIssue',
    args,
    detail: { tool: 'transitionJiraIssue', args },
    alwaysAllowScopes: [],
    grantCovers: 'exact-call',
    inline: true,
    decide: never,
  }
  return (
    <InChat read={read}>
      <ToolAskApprovalPanel grant={grant} onDecideLater={noop} />
    </InChat>
  )
}

const MOVED = ticketStatusMoveView({ args: MOVE_ARGS, result: MOVE_RESULT, resultType: 'success' })

/** The two ways to draw the statuses on one board, with the switch above them. */
function ChooseLayout() {
  const [layout, setLayout] = useState<TicketStatusMoveLayout>('lozenges')
  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        ariaLabel="Layout"
        value={layout}
        onChange={(next) => setLayout(next as TicketStatusMoveLayout)}
        options={TICKET_STATUS_MOVE_LAYOUTS.map((value) => ({
          value,
          label: TICKET_STATUS_MOVE_LAYOUT_LABELS[value],
        }))}
      />
      <div className="rounded-md border border-(--border-subtle) bg-(--surface-base) px-3 py-2.5">
        <TicketStatusMoveCard view={MOVED} layout={layout} />
      </div>
    </div>
  )
}

const LAYOUT_DESCRIPTIONS: Record<TicketStatusMoveLayout, string> = {
  lozenges:
    'The default that ships. Each status is the lozenge a ticket shows everywhere else in the app, coloured by Jira’s category: to-do grey, in progress blue, done green. The eye finds the change by colour.',
  line: 'One line of text, no colour: the quietest, and the category is lost.',
}

const layoutStates: SceneState[] = TICKET_STATUS_MOVE_LAYOUTS.map((layout) => ({
  id: `layout-${layout}`,
  title: TICKET_STATUS_MOVE_LAYOUT_LABELS[layout],
  description: LAYOUT_DESCRIPTIONS[layout],
  render: () =>
    page(
      <div className="rounded-md border border-(--border-subtle) bg-(--surface-base) px-3 py-2.5">
        <TicketStatusMoveCard view={MOVED} layout={layout} />
      </div>,
    ),
}))

export const TICKET_STATUS_MOVE_SCENES: Scene[] = [
  {
    id: 'ticket-status-move',
    title: 'A Jira status move in a chat',
    component: 'TicketStatusMoveCard',
    group: 'Chat',
    description:
      'An agent’s transitionJiraIssue call, on its tool row and on its ask, in all three apps: Jira’s mark, the key as a link, the title, and the status it moves from → to as the shared status lozenges. Before approval nothing has moved, so the ask shows the target the agent asked for, and where the ticket stands now once its preview is read through the chat’s own Jira binding; the ask never waits on that read. A failed or refused move shows why and no statuses. Fixed sample data: no Jira is read.',
    states: [
      {
        id: 'choose-layout',
        title: 'Pick a layout',
        description: 'Lozenges or an arrow line, switched on the board.',
        render: () => page(<ChooseLayout />),
      },
      ...layoutStates,
      {
        id: 'ask',
        title: 'The ask, the ticket read',
        description:
          'The approval card: the ticket’s title and where it stands now, read beside the ask, then the target. The target is what the agent asked for, so it has no category colour yet.',
        render: () => page(<Ask read="ready" />),
      },
      {
        id: 'ask-target-only',
        title: 'The ask, before the ticket is read',
        description:
          'The key and the target alone. The card is ready to approve at once; the title and the current status fill in when the read answers, and stay out if it fails.',
        render: () => page(<Ask read="reading" />),
      },
      {
        id: 'ask-with-comment',
        title: 'The ask, with a comment',
        description: 'The comment the move would post, word for word.',
        render: () => page(<Ask read="ready" comment={MOVE_COMMENT} />),
      },
      {
        id: 'ask-row',
        title: 'Waiting, on its row',
        description: 'The row of a call that waits on the person.',
        render: () => page(<Row resultType="require_confirmation" />),
      },
      {
        id: 'done',
        title: 'Moved',
        description:
          'What Jira answered: the key, the title, and both statuses in their category colours.',
        render: () => page(<Row result={MOVE_RESULT} resultType="success" />),
      },
      {
        id: 'done-with-comment',
        title: 'Moved, with a comment',
        render: () =>
          page(
            <Row
              args={{ ...MOVE_ARGS, comment: MOVE_COMMENT }}
              result={MOVE_RESULT}
              resultType="success"
            />,
          ),
      },
      {
        id: 'failed',
        title: 'Not moved: Jira refused',
        description: 'The refusal in Jira’s own words, and no from → to: nothing moved.',
        render: () => page(<Row result={{ error: MOVE_REFUSAL }} resultType="success" />),
      },
      {
        id: 'failed-errored',
        title: 'Not moved: the call failed',
        render: () => page(<Row result="Jira returned 503" resultType="errored" />),
      },
      {
        id: 'declined',
        title: 'Not moved: declined',
        render: () =>
          page(<Row result={{ reason: 'You declined it.' }} resultType="not_allowed" />),
      },
      {
        id: 'old-row',
        title: 'An older row with no answer',
        description:
          'A move made before the tool answered anything: the key and the target the agent asked for.',
        render: () => page(<Row result={{ ok: true }} resultType="success" read="failed" />),
      },
      {
        id: 'long-title',
        title: 'A long title and long status names',
        description: 'The title folds to two lines; the lozenges wrap under each other.',
        render: () =>
          page(
            <Row
              args={{ issueKey: 'ZNR-812', transition: 'Ready for release to production' }}
              result={MOVE_LONG_RESULT}
              resultType="success"
            />,
          ),
      },
      {
        id: 'done-phone',
        title: 'Moved, on a phone',
        description: 'The small-screen width: the mobile app’s native card follows this.',
        render: () => phone(<Row result={MOVE_RESULT} resultType="success" />),
      },
      {
        id: 'long-title-phone',
        title: 'A long title, on a phone',
        render: () =>
          phone(
            <Row
              args={{ issueKey: 'ZNR-812', transition: 'Ready for release to production' }}
              result={MOVE_LONG_RESULT}
              resultType="success"
            />,
          ),
      },
      {
        id: 'ask-phone',
        title: 'The ask, on a phone',
        render: () => phone(<Ask read="ready" />),
      },
      {
        id: 'ask-card-alone',
        title: 'The card on its own',
        description: `The card as the ask shows it for ${TICKET_IN_PROGRESS.key}, without the approval around it.`,
        render: () =>
          page(
            <TicketStatusMoveCard
              view={ticketStatusMoveView({
                args: MOVE_ARGS,
                resultType: 'require_confirmation',
                preview: TICKET_IN_PROGRESS,
              })}
            />,
          ),
      },
    ],
  },
]
