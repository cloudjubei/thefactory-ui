import type { FeatureRequest } from 'thefactory-tools/types'
import {
  FeatureRequestCard,
  IncomingFeatureRequestCard,
  type FeatureRequestCardData,
} from 'thefactory-ui/web'
import type { FeatureRequestSettleMode } from 'thefactory-ui/headless'
import type { Scene } from '../showcase/types'

const noop = () => {}

const REQUEST: FeatureRequestCardData = {
  id: '1557d939-0979-435b-bb2b-b66f2108a386',
  title: 'Stop deterministic tool-refusal loops and surface actionable dependency blockers',
  targetProjectId: 'thefactory-tools',
  fromProjectId: 'thefactory-backend',
  status: 'in_review',
  summary:
    'An agent that keeps calling a tool the host refuses the same way loops until it runs out of turns. Detect the repetition and stop it with a reason the agent can act on.',
  countsLine: 'Done when 5 · Rules 3',
  reviewBranch: 'agent/5e65f9b0ef0f',
}

function Card({
  request,
  initialSettleMode,
  startAgain,
  startWork,
}: {
  request: FeatureRequestCardData
  initialSettleMode?: FeatureRequestSettleMode
  startAgain?: boolean
  startWork?: boolean
}) {
  return (
    <div className="max-w-xl">
      <FeatureRequestCard
        request={request}
        defaultMode="process"
        onOpenFull={noop}
        onStartWork={startWork ? noop : undefined}
        onMarkDelivered={noop}
        onHandOver={noop}
        onStartAgain={startAgain ? noop : undefined}
        onOpenRequest={noop}
        initialSettleMode={initialSettleMode}
      />
    </div>
  )
}

const INCOMING: FeatureRequest = {
  id: '30f82c37-5d0e-4a51-9a7e-0c1f3b6d2e44',
  title: 'Settle a feature request delivered elsewhere',
  summary:
    'A request whose work shipped in another change can only be rejected today. Let the person mark it delivered, naming what delivered it.',
  doneWhen: [{ text: 'The request reads Done, naming what delivered it' }],
  targetProjectId: 'thefactory-tools',
  requestedBy: {
    fromProjectId: 'thefactory-backend',
    fromChatContext: { type: 'PROJECT', projectId: 'thefactory-backend' },
  },
  acceptance: 'manual',
  status: 'blocked',
  statusReason: '1 of 2 features are blocked: Settle its story.',
  handling: { storyId: 's1', featureIds: ['f1', 'f2'] },
  createdAt: '2026-10-17T09:12:00.000Z',
  updatedAt: '2026-10-17T09:12:00.000Z',
}

const TITLES: Record<string, string> = {
  '62c9a1d4-7a20-4f7e-9d1b-3e5c8a0b9f12': 'Stop deterministic refusal loops on the server',
  'e420a228-1b3c-4d5e-8f90-a1b2c3d4e5f6': 'Stop deterministic tool-refusal loops',
}

function Incoming({
  request,
  initialSettleMode,
  startAgain,
}: {
  request: FeatureRequest
  initialSettleMode?: FeatureRequestSettleMode
  startAgain?: boolean
}) {
  return (
    <div className="max-w-2xl">
      <IncomingFeatureRequestCard
        request={request}
        fromLabel="thefactory-backend"
        onAccept={noop}
        onReject={noop}
        onMarkDelivered={noop}
        onHandOver={noop}
        onStartAgain={startAgain ? noop : undefined}
        onOpenFull={noop}
        onOpenRequest={noop}
        requestTitle={(id) => TITLES[id]}
        placedOn={{ label: '#12 Feature request settling', onOpen: noop }}
        initialSettleMode={initialSettleMode}
      />
    </div>
  )
}

export const FEATURE_REQUEST_CARD_SCENES: Scene[] = [
  {
    id: 'feature-request-card',
    title: 'Feature request card',
    component: 'FeatureRequestCard',
    group: 'Chat',
    description:
      'A cross-project request as the asking chat sees it. Its status is read off the features it placed, never the run’s word that it finished: work not delivered reads Blocked, with why.',
    states: [
      {
        id: 'in-review',
        title: 'In review',
        description:
          'The look-alike base: every feature was worked and the review is open, so the work waits for sign-off.',
        render: () => <Card request={REQUEST} />,
      },
      {
        id: 'blocked-features',
        title: 'Blocked — features blocked',
        description:
          'The run left a review, but a feature it placed is blocked: Blocked, naming the feature, instead of In review.',
        render: () => (
          <Card
            request={{
              ...REQUEST,
              status: 'blocked',
              statusReason:
                '1 of 5 features are blocked: Detect deterministic refusal repetition with a small window.',
            }}
          />
        ),
      },
      {
        id: 'blocked-start-again',
        title: 'Blocked — start again',
        description:
          'Paired with Blocked — features blocked: where the person may start the work again, Start again is offered with why.',
        render: () => (
          <Card
            startAgain
            request={{
              ...REQUEST,
              status: 'blocked',
              statusReason:
                '1 of 5 features are blocked: Detect deterministic refusal repetition with a small window.',
            }}
          />
        ),
      },
      {
        id: 'failed-start-again',
        title: 'Failed — start again',
        description:
          'Paired with Blocked — start again: a failed request offers the same, saying its work failed.',
        render: () => <Card startAgain request={{ ...REQUEST, status: 'failed' }} />,
      },
      {
        id: 'accepted-work-started',
        title: 'Accepted — work started',
        description:
          'The look-alike base: accepted, and its work already started, so the card offers nothing to start.',
        render: () => (
          <Card startWork request={{ ...REQUEST, status: 'accepted', reviewBranch: undefined }} />
        ),
      },
      {
        id: 'accepted-start-work',
        title: 'Accepted — start work',
        description:
          'Paired with Accepted — work started: accepted while its launch card was left unconfirmed, the card in the asking chat offers Start work, as the request’s own card and full view do.',
        render: () => (
          <Card
            startWork
            request={{
              ...REQUEST,
              status: 'accepted',
              reviewBranch: undefined,
              workNotStarted: true,
            }}
          />
        ),
      },
      {
        id: 'blocked-review-rejected',
        title: 'Blocked — review rejected',
        description:
          'Its review was rejected: the request leaves review and says why, rather than reading In review forever.',
        render: () => (
          <Card
            request={{
              ...REQUEST,
              status: 'blocked',
              statusReason:
                'Its review was rejected: The loop belongs in the completion loop, not the MCP server.',
            }}
          />
        ),
      },
      {
        id: 'mark-delivered-form',
        title: 'Mark as delivered — form open',
        description:
          'Paired with Blocked — features blocked: the same card with Mark as delivered… open, asking what delivered it.',
        render: () => (
          <Card
            request={{
              ...REQUEST,
              status: 'blocked',
              statusReason:
                '1 of 5 features are blocked: Detect deterministic refusal repetition with a small window.',
            }}
            initialSettleMode="delivered"
          />
        ),
      },
      {
        id: 'delivered-elsewhere',
        title: 'Delivered elsewhere',
        description:
          'Paired with In review: marked delivered by a commit, it reads Completed and names what delivered it. Nothing more to settle.',
        render: () => (
          <Card
            request={{
              ...REQUEST,
              status: 'completed',
              reviewBranch: undefined,
              settled: {
                text: 'Delivered by 5146baba',
                note: 'Shipped with the reasoning effort change.',
              },
            }}
          />
        ),
      },
      {
        id: 'rejected-can-settle',
        title: 'Rejected — can still be marked delivered',
        description:
          'A request rejected by mistake keeps Mark as delivered… and Hand over…, so it can be settled after all.',
        render: () => (
          <Card
            request={{
              ...REQUEST,
              status: 'rejected',
              reviewBranch: undefined,
              rejectionReason: 'Already done in the backend.',
            }}
          />
        ),
      },
      {
        id: 'hand-over-form',
        title: 'Hand over — form open',
        description:
          'Paired with Blocked — features blocked: Hand over… open, asking for the project and the request or story that took the work over.',
        render: () => (
          <Card
            request={{
              ...REQUEST,
              status: 'blocked',
              statusReason:
                '1 of 5 features are blocked: Detect deterministic refusal repetition with a small window.',
            }}
            initialSettleMode="handed-over"
          />
        ),
      },
      {
        id: 'handed-over',
        title: 'Handed over',
        description:
          'Paired with In review: its work moved to another project’s request. It reads Handed over and links that request.',
        render: () => (
          <Card
            request={{
              ...REQUEST,
              status: 'handed_over',
              reviewBranch: undefined,
              settled: {
                text: 'Handed over to thefactory-backend',
                link: {
                  requestId: '62c9a1d4-7a20-4f7e-9d1b-3e5c8a0b9f12',
                  label: 'Stop deterministic refusal loops on the server',
                },
                note: 'The loop is the server’s to stop.',
              },
            }}
          />
        ),
      },
      {
        id: 'takes-over',
        title: 'Takes over another request',
        description: 'The request a hand-over named links back to the one whose work it took over.',
        render: () => (
          <Card
            request={{
              ...REQUEST,
              title: 'Stop deterministic refusal loops on the server',
              targetProjectId: 'thefactory-backend',
              fromProjectId: 'thefactory-tools',
              status: 'in_progress',
              reviewBranch: undefined,
              takenOver: [
                {
                  requestId: 'e420a228-1b3c-4d5e-8f90-a1b2c3d4e5f6',
                  label: 'Stop deterministic tool-refusal loops',
                },
              ],
            }}
          />
        ),
      },
    ],
  },
  {
    id: 'feature-request-decision',
    title: 'Feature request in its own chat',
    component: 'IncomingFeatureRequestCard',
    group: 'Chat',
    description:
      'A request as the receiving project sees it in the request’s chat: the decision while it waits, how its work stands once accepted, and Mark as delivered… / Hand over… until it is settled.',
    states: [
      {
        id: 'blocked',
        title: 'Accepted — work blocked',
        description:
          'The look-alike base: accepted, its work blocked, with the settle actions offered.',
        render: () => <Incoming request={INCOMING} />,
      },
      {
        id: 'blocked-start-again',
        title: 'Accepted — work blocked, start again',
        description:
          'Paired with Accepted — work blocked: Start again readies what its work left blocked and starts it again on its story — needed even with no question open.',
        render: () => <Incoming request={INCOMING} startAgain />,
      },
      {
        id: 'failed-start-again',
        title: 'Accepted — work failed, start again',
        description:
          'Paired with Accepted — work blocked, start again: a failed run offers the same.',
        render: () => (
          <Incoming
            request={{ ...INCOMING, status: 'failed', statusReason: undefined }}
            startAgain
          />
        ),
      },
      {
        id: 'mark-delivered-form',
        title: 'Mark as delivered — form open',
        description:
          'Paired with Accepted — work blocked: the form asks what delivered it, and says the asking chat is told.',
        render: () => <Incoming request={INCOMING} initialSettleMode="delivered" />,
      },
      {
        id: 'delivered-elsewhere',
        title: 'Delivered elsewhere',
        description:
          'Paired with Accepted — work blocked: marked delivered, it reads Done with what delivered it and the note.',
        render: () => (
          <Incoming
            request={{
              ...INCOMING,
              status: 'completed',
              statusReason: 'Delivered by 5146baba.',
              deliveredBy: {
                ref: '5146baba',
                note: 'Shipped with the reasoning effort change.',
                at: '2026-10-18T10:00:00.000Z',
              },
            }}
          />
        ),
      },
      {
        id: 'rejected-can-settle',
        title: 'Rejected — can still be marked delivered',
        description: 'A wrongly rejected request keeps Mark as delivered… and Hand over….',
        render: () => (
          <Incoming
            request={{
              ...INCOMING,
              status: 'rejected',
              rejectionReason: 'Already done in the backend.',
              handling: undefined,
            }}
          />
        ),
      },
      {
        id: 'hand-over-form',
        title: 'Hand over — form open',
        description:
          'Paired with Accepted — work blocked: the form asks for the project and the request or story that took the work over.',
        render: () => <Incoming request={INCOMING} initialSettleMode="handed-over" />,
      },
      {
        id: 'handed-over',
        title: 'Handed over',
        description:
          'Paired with Accepted — work blocked: handed over to the backend’s request, linked by its title.',
        render: () => (
          <Incoming
            request={{
              ...INCOMING,
              status: 'handed_over',
              statusReason:
                'Handed over to thefactory-backend/62c9a1d4-7a20-4f7e-9d1b-3e5c8a0b9f12.',
              handedOverTo: {
                projectId: 'thefactory-backend',
                ref: '62c9a1d4-7a20-4f7e-9d1b-3e5c8a0b9f12',
                requestId: '62c9a1d4-7a20-4f7e-9d1b-3e5c8a0b9f12',
                note: 'The loop is the server’s to stop.',
                at: '2026-10-18T10:00:00.000Z',
              },
            }}
          />
        ),
      },
    ],
  },
]
