import type { FeatureRequest, FeatureRequestWaitCycle } from 'thefactory-tools/types'
import { featureRequestWaitCycleWarning } from 'thefactory-ui/headless'
import { FeatureRequestCard, IncomingFeatureRequestCard } from 'thefactory-ui/web'
import { BACKEND_REQUEST, UI_REQUEST } from '../../src/fakeBackend/fixtures/featureRequests'
import type { Scene } from '../showcase/types'

const noop = () => {}

const WAIT_CYCLE: FeatureRequestWaitCycle = {
  waits: [
    {
      requestId: BACKEND_REQUEST.id,
      projectId: 'thefactory-backend',
      onRequestId: UI_REQUEST.id,
      onProjectId: 'thefactory-ui',
      reason:
        '“Define upstream cancellation and approval-card contracts” waits on thefactory-ui to answer: “Can the Tools and UI owners confirm the v1 card payload?”',
    },
    {
      requestId: UI_REQUEST.id,
      projectId: 'thefactory-ui',
      onRequestId: BACKEND_REQUEST.id,
      onProjectId: 'thefactory-backend',
      reason:
        '“Implement shared web/native stopActivity approval presentation” waits on “Define upstream cancellation and approval-card contracts” in thefactory-backend.',
    },
  ],
  decideFirstRequestId: BACKEND_REQUEST.id,
  detectedAt: '2026-10-18T12:00:00.000Z',
}

function Incoming({ request }: { request: FeatureRequest }) {
  return (
    <div className="max-w-2xl">
      <IncomingFeatureRequestCard
        request={request}
        fromLabel="thefactory-tools"
        onAccept={noop}
        onReject={noop}
        onOpenFull={noop}
        placedOn={{ label: '#7 stopActivity', onOpen: noop }}
      />
    </div>
  )
}

function Widget({ request }: { request: FeatureRequest }) {
  return (
    <div className="max-w-xl">
      <FeatureRequestCard
        request={{
          id: request.id,
          title: request.title,
          targetProjectId: request.targetProjectId,
          fromProjectId: request.requestedBy.fromProjectId,
          status: 'blocked',
          summary: request.summary,
          statusReason: request.statusReason,
          waitCycleWarning: featureRequestWaitCycleWarning(request),
        }}
        onAccept={noop}
        onReject={noop}
        onOpenFull={noop}
      />
    </div>
  )
}

export const FEATURE_REQUEST_WAIT_CYCLE_SCENES: Scene[] = [
  {
    id: 'feature-request-wait-cycle',
    title: 'Feature requests waiting on each other',
    component: 'IncomingFeatureRequestCard',
    group: 'Chat',
    description:
      'Two requests whose work waits on each other — one side’s blocker names the other’s work while the other asks it a question. Each card says so and which side decides first: the side that owns what the other waits on. Nothing is decided for the person.',
    states: [
      {
        id: 'blocked',
        title: 'Blocked',
        description: 'The look-alike base: a request whose work is blocked, in no wait cycle.',
        render: () => <Incoming request={BACKEND_REQUEST} />,
      },
      {
        id: 'decide-here',
        title: 'Waiting on each other — decide here first',
        description:
          'Paired with Blocked: the side that owns the contract the other waits on is told to decide it here first.',
        render: () => <Incoming request={{ ...BACKEND_REQUEST, waitCycle: WAIT_CYCLE }} />,
      },
      {
        id: 'decide-there',
        title: 'Waiting on each other — decide there first',
        description:
          'The other side of the same cycle: it is told which project decides first, and that it carries on once that side has.',
        render: () => <Incoming request={{ ...UI_REQUEST, waitCycle: WAIT_CYCLE }} />,
      },
    ],
  },
  {
    id: 'feature-request-wait-cycle-widget',
    title: 'Feature requests waiting on each other — in the asking chat',
    component: 'FeatureRequestCard',
    group: 'Chat',
    description:
      'The request’s card in the chat that asked for it says the same as the receiving side: which projects wait on each other, and which side decides first.',
    states: [
      {
        id: 'blocked',
        title: 'Blocked',
        description: 'The look-alike base: a request whose work is blocked, in no wait cycle.',
        render: () => <Widget request={BACKEND_REQUEST} />,
      },
      {
        id: 'decide-there',
        title: 'Waiting on each other',
        description:
          'Paired with Blocked: the card names the other project and which side decides first.',
        render: () => <Widget request={{ ...UI_REQUEST, waitCycle: WAIT_CYCLE }} />,
      },
    ],
  },
]
