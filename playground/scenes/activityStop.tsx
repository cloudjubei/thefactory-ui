import type { ReactNode } from 'react'
import type { ActivityStopCard, ActivityStopResult } from 'thefactory-tools/types'
import { ToolCallCard } from 'thefactory-ui/web'
import type { Scene } from '../showcase/types'
import ApprovalPanel from '../../src/web/compound/chat/ApprovalPanel'
import type { PendingToolGrant } from '../../src/headless/utils/chatTypes'

const noop = () => {}

const RUNNING: ActivityStopCard = {
  kind: 'activity-stop',
  version: 1,
  projectId: 'thefactory-knowledge',
  activityId: '6f1c2d3e-9a4b-4c1d-8e2f-31a7c0d5b9e4',
  activityType: 'knowledge-evaluate',
  recordType: 'knowledge-evaluation',
  status: 'running',
  paused: false,
  launchParams: { stage: 'full', promptMode: 'neutral', buildMode: 'llm', cells: 120 },
  startedAt: '2026-10-20T09:12:00.000Z',
  snapshotAt: '2026-10-20T10:14:05.000Z',
  elapsedMs: 3_725_000,
  steps: [
    { key: 'grade', status: 'running', done: 42, total: 120 },
    { key: 'report', status: 'running', done: 0, total: 0 },
  ],
  costUSD: 3.41,
}

const PAUSED: ActivityStopCard = {
  ...RUNNING,
  activityId: 'b2a1c3d4-1111-4222-8333-944455556666',
  activityType: 'train',
  recordType: 'cartpole-run',
  paused: true,
  launchParams: { spec: { matrix: 'lr x seed', cells: 12 }, market: 'GB' },
  elapsedMs: 18_640_000,
  steps: [{ key: 'train', status: 'running', done: 7, total: 12 }],
  costUSD: undefined,
}

const QUEUED: ActivityStopCard = {
  ...RUNNING,
  activityId: 'c9d8e7f6-2222-4333-8444-a55566667777',
  activityType: 'build-catalog',
  recordType: 'catalog-car',
  status: 'queued',
  launchParams: { market: 'DE', supplierQuery: 'family cars' },
  elapsedMs: 95_000,
  steps: [{ key: 'build-catalog', status: 'queued', done: 0, total: 0 }],
  costUSD: 0,
}

const REDACTED: ActivityStopCard = {
  ...RUNNING,
  launchParams: undefined,
  paramsOmitted: 'too-large',
  redactedParams: ['apiKey', 'source.auth.token'],
}

const WITH_CHILDREN: ActivityStopCard = {
  ...RUNNING,
  liveChildCount: 3,
  liveChildTypes: ['train', 'evaluate'],
}

function stopGrant(card: ActivityStopCard | undefined, reason?: string): PendingToolGrant {
  const args = {
    activityId: card?.activityId ?? '6f1c2d3e-9a4b-4c1d-8e2f-31a7c0d5b9e4',
    ...(reason ? { reason } : {}),
  }
  return {
    id: `grant-stop-${card?.activityId ?? 'unread'}-${reason ? 'reason' : 'none'}`,
    chatRunner: 'api',
    label: 'stopActivity',
    toolName: 'stopActivity',
    args,
    alwaysAllowScopes: [],
    grantCovers: 'exact-call',
    detail: { tool: 'stopActivity', args, ...(card ? { detail: card } : {}) },
    decide: () => new Promise<void>(noop),
  }
}

function Dock({ grant, width = 'max-w-2xl' }: { grant: PendingToolGrant; width?: string }) {
  return (
    <div className={`${width} rounded-xl border border-(--border-subtle) bg-(--surface-base)`}>
      <ApprovalPanel grant={grant} onDecideLater={noop} />
    </div>
  )
}

const phone = (node: ReactNode) => <div className="w-[375px] max-w-full">{node}</div>

const REASON = 'The first 40 cells already answer the comparison; the rest only add spend.'

const STOPPED_ID = RUNNING.activityId

function StopRow({ result }: { result: ActivityStopResult }) {
  return (
    <div className="max-w-2xl">
      <ToolCallCard
        toolCall={{
          toolCallId: `stop-row-${result.outcome}-${result.children?.length ?? 0}`,
          name: 'stopActivity',
          arguments: { activityId: result.activityId, reason: REASON },
          decisionNote: 'Approved by you',
          executionResult: JSON.stringify(result),
        }}
        result={result}
        resultType="success"
        durationMs={4_120}
      />
    </div>
  )
}

const child = (
  activityId: string,
  outcome: ActivityStopResult['outcome'],
  extra: Partial<ActivityStopResult> = {},
) => ({ activityId, parentActivityId: STOPPED_ID, outcome, ...extra })

export const ACTIVITY_STOP_SCENES: Scene[] = [
  {
    id: 'activity-stop-ask',
    title: 'Agent asks to stop an activity',
    component: 'ApprovalPanel (ActivityStopApprovalPanel)',
    group: 'Chat',
    description:
      'An agent’s stopActivity waits on the person in the composer’s place, on a danger card: the activity as the host read it — type, status, elapsed time, cost so far, each step’s progress and what it was launched with — and the agent’s reason as the agent’s. Stop it is the confirmation; nothing is stopped before it.',
    states: [
      {
        id: 'running',
        title: 'Running evaluation, with a reason',
        description: 'The look-alike base: a live knowledge evaluation with its cost so far.',
        render: () => <Dock grant={stopGrant(RUNNING, REASON)} />,
      },
      {
        id: 'no-reason',
        title: 'No reason given',
        description: 'Paired with the base: the agent gave no reason, so no reason line.',
        render: () => <Dock grant={stopGrant(RUNNING)} />,
      },
      {
        id: 'with-children',
        title: 'Stops what it started too',
        description:
          'Paired with the base: three live activities it started, and theirs, stop with it — counted before you decide, with their types.',
        render: () => <Dock grant={stopGrant(WITH_CHILDREN, REASON)} />,
      },
      {
        id: 'paused',
        title: 'Paused campaign, cost not recorded',
        description:
          'Recorded running with no worker: said to be paused and not progressing; an unknown cost reads Not recorded, never $0.',
        render: () => <Dock grant={stopGrant(PAUSED, 'It was interrupted by a restart.')} />,
      },
      {
        id: 'queued',
        title: 'Queued build, nothing spent yet',
        description: 'A queued run: no progress yet, and a recorded zero cost shown as $0.00.',
        render: () => <Dock grant={stopGrant(QUEUED, 'Launched for the wrong market.')} />,
      },
      {
        id: 'params-left-out',
        title: 'Parameters too large, secrets left out',
        description:
          'Paired with the base: the launch parameters are too large to show, and the secret-looking ones are named, never shown.',
        render: () => <Dock grant={stopGrant(REDACTED, REASON)} />,
      },
      {
        id: 'unreadable',
        title: 'Details couldn’t be read',
        description:
          'The ask carries no card this client reads: the card says so, and shows nothing the agent claims as fact.',
        render: () => <Dock grant={stopGrant(undefined, REASON)} />,
      },
      {
        id: 'phone',
        title: 'Narrow web',
        description: 'The base at phone width, as the narrow web layout shows it.',
        render: () => phone(<Dock grant={stopGrant(RUNNING, REASON)} width="w-full" />),
      },
    ],
  },
  {
    id: 'activity-stop-row',
    title: 'A decided stop’s row',
    component: 'ToolCallCard (stopActivity outcome line)',
    group: 'Chat',
    description:
      'Once the person decides, the stopActivity row says what the stop observed, read live from the execution its action recorded: only Stopped reads as done; an activity that had already ended, one that ended on its own first, a teardown that never settled and a refusal each say so. What it started is counted on the same line.',
    states: [
      {
        id: 'stopped',
        title: 'Stopped',
        description: 'The look-alike base: the work ended and was waited for.',
        render: () => (
          <StopRow
            result={{
              activityId: STOPPED_ID,
              outcome: 'stopped',
              status: 'aborted',
              attemptId: 'approval:act-1',
            }}
          />
        ),
      },
      {
        id: 'stopped-with-children',
        title: 'Stopped, with what it started',
        description: 'Paired with the base: the two activities it started were stopped with it.',
        render: () => (
          <StopRow
            result={{
              activityId: STOPPED_ID,
              outcome: 'stopped',
              status: 'aborted',
              children: [
                child('b2a1c3d4-1111-4222-8333-944455556666', 'stopped', { status: 'aborted' }),
                child('c9d8e7f6-2222-4333-8444-a55566667777', 'stopped', { status: 'aborted' }),
              ],
            }}
          />
        ),
      },
      {
        id: 'children-unconfirmed',
        title: 'Stopped, one it started may still run',
        description:
          'Paired with the base: of three it started, one was stopped, one had already ended and one could not be confirmed — so the line warns.',
        render: () => (
          <StopRow
            result={{
              activityId: STOPPED_ID,
              outcome: 'stopped',
              status: 'aborted',
              children: [
                child('b2a1c3d4-1111-4222-8333-944455556666', 'stopped', { status: 'aborted' }),
                child('c9d8e7f6-2222-4333-8444-a55566667777', 'noop', { status: 'completed' }),
                child('d1e2f3a4-3333-4444-8555-b66677778888', 'failed', {
                  code: 'adapter-failed',
                  status: 'running',
                }),
              ],
            }}
          />
        ),
      },
      {
        id: 'noop',
        title: 'Already finished',
        description: 'Paired with the base: it had completed before the stop; nothing changed.',
        render: () => (
          <StopRow result={{ activityId: STOPPED_ID, outcome: 'noop', status: 'completed' }} />
        ),
      },
      {
        id: 'not-stopped',
        title: 'Ended on its own first',
        description: 'Paired with the base: completion won while the stop awaited it.',
        render: () => (
          <StopRow
            result={{
              activityId: STOPPED_ID,
              outcome: 'not-stopped',
              status: 'completed',
              attemptId: 'approval:act-1',
            }}
          />
        ),
      },
      {
        id: 'failed',
        title: 'Not confirmed stopped',
        description: 'Paired with the base: its teardown did not settle; it may still be running.',
        render: () => (
          <StopRow
            result={{
              activityId: STOPPED_ID,
              outcome: 'failed',
              code: 'adapter-failed',
              status: 'running',
              attemptId: 'approval:act-1',
            }}
          />
        ),
      },
      {
        id: 'refused',
        title: 'Refused',
        description:
          'Paired with the base: the approval had already been used; nothing was touched.',
        render: () => (
          <StopRow
            result={{ activityId: STOPPED_ID, outcome: 'refused', code: 'approval-replayed' }}
          />
        ),
      },
    ],
  },
]
