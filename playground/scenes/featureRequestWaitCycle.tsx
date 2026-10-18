import type { FeatureRequest, FeatureRequestWaitCycle } from 'thefactory-tools/types'
import { featureRequestWaitCycleWarning } from 'thefactory-ui/headless'
import { FeatureRequestCard, IncomingFeatureRequestCard } from 'thefactory-ui/web'
import type { Scene } from '../showcase/types'

const noop = () => {}

const BACKEND_REQUEST: FeatureRequest = {
  id: '8a95cafa-96a2-4dcd-b7e6-124f6cd16764',
  title: 'Wire human-approved stopActivity across all background activities',
  summary:
    'Register stopActivity for API and CLI agents behind a person’s approval, with trusted card details, and route every stop through one shared cancellation path.',
  targetProjectId: 'thefactory-backend',
  requestedBy: {
    fromProjectId: 'thefactory-tools',
    fromChatContext: { type: 'PROJECT', projectId: 'thefactory-tools' },
  },
  acceptance: 'manual',
  status: 'blocked',
  statusReason:
    '3 of 5 features are blocked: Define upstream cancellation and approval-card contracts.',
  handling: { storyId: '8f9c5993-8463-46c1-98f7-cbd25a019211' },
  createdAt: '2026-10-17T09:12:00.000Z',
  updatedAt: '2026-10-18T12:00:00.000Z',
}

const UI_REQUEST: FeatureRequest = {
  ...BACKEND_REQUEST,
  id: '1f88f34d-532a-45e0-a72f-1c804c5e6112',
  title: 'Shared stopActivity approval card and adoption in derived apps',
  summary:
    'Show a reusable approval card for stopActivity on web and native, from host-supplied facts, and carry it into the apps built on it.',
  targetProjectId: 'thefactory-ui',
  statusReason:
    '3 of 5 features are blocked: Discover approval consumers and coordinate the trusted backend contract.',
  handling: { storyId: '2d20d84b-5ec6-4054-bbb5-1eedf9e41861' },
}

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
