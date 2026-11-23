import { useEffect, useState, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { FilesProvider, useProjects } from 'thefactory-ui/headless'
import {
  GroupStoryRunDialog,
  QueuePanel,
  StoryReadinessBadge,
  SupervisorPanel,
} from 'thefactory-ui/web'
import ApprovalPanel from '../../src/web/compound/chat/ApprovalPanel'
import { FAKE_PROJECT_ID } from '../../src/fakeBackend/fixtures/projects'
import type { Scene } from '../showcase/types'
import { fakeDataGroupPreview } from './fakeDataInProductFixtures'
import { OnFixtures } from './onFixtures'
import {
  PLAN_FIRST_CASES,
  QUEUE_CANDIDATES,
  QUEUE_CASES,
  READINESS_CASES,
  SUPERVISOR_CASES,
  planFirstCase,
  planFirstGrant,
  planFirstLaunchRoutes,
  planFirstSentLine,
  queueCase,
  readinessCase,
  readinessFixture,
  supervisorCase,
  useBoardSupervisor,
  useBoardWorkQueue,
  type PlanFirstCase,
  type QueueCase,
  type ReadinessCase,
  type SupervisorCase,
} from './supervisorQueueFixtures'

const noop = () => {}

function Column({ children }: { children: ReactNode }) {
  return <div className="w-[640px] max-w-full">{children}</div>
}

function Queue({ which }: { which: QueueCase }) {
  const queue = useBoardWorkQueue(which)
  return (
    <Column>
      <QueuePanel queue={queue} candidates={QUEUE_CANDIDATES} onOpen={noop} />
    </Column>
  )
}

function Supervisor({ which }: { which: SupervisorCase }) {
  const supervisor = useBoardSupervisor(which)
  return (
    <Column>
      <SupervisorPanel supervisor={supervisor} onOpenRun={noop} onOpenChat={noop} onAnswer={noop} />
    </Column>
  )
}

function Readiness({ which }: { which: ReadinessCase }) {
  return (
    <Column>
      <StoryReadinessBadge view={readinessFixture(which)} onOpenFeature={noop} />
    </Column>
  )
}

function InProject({ children }: { children: ReactNode }) {
  const { setActiveProjectId } = useProjects()
  useEffect(() => setActiveProjectId(FAKE_PROJECT_ID), [setActiveProjectId])
  return children
}

/** The real story launch card on fixture answers; what Start run sent of planning shows under it. */
function LaunchCard({ which }: { which: PlanFirstCase }) {
  const [sent, setSent] = useState<string>()
  return (
    <OnFixtures key={which} routes={planFirstLaunchRoutes(which)}>
      <FilesProvider>
        <MemoryRouter>
          <InProject>
            <div className="flex w-full max-w-[640px] flex-col gap-2">
              <ApprovalPanel
                grant={planFirstGrant(which, (metadata) => setSent(planFirstSentLine(metadata)))}
                projectId={FAKE_PROJECT_ID}
                onDecideLater={noop}
              />
              {sent !== undefined ? (
                <code className="px-3 text-[11px] text-(--text-muted)">{sent}</code>
              ) : null}
            </div>
          </InProject>
        </MemoryRouter>
      </FilesProvider>
    </OnFixtures>
  )
}

/** The group story's Run dialog: one toggle for every part; Start says what it sent. */
function GroupRunDialog() {
  return (
    <GroupStoryRunDialog
      isOpen
      onClose={noop}
      title="Read receipts"
      preview={fakeDataGroupPreview('none-offered')}
      basePicks={{}}
      onPickBase={noop}
      onStart={async (body) => ({
        groupRunId: 'group-run-1',
        message: planFirstSentLine(body as Record<string, unknown>),
      })}
      onOpenRun={noop}
    />
  )
}

export const SUPERVISOR_QUEUE_SCENES: Scene[] = [
  {
    id: 'work-queue-panel',
    title: 'Queue panel',
    component: 'QueuePanel · useWorkQueue',
    group: 'Process',
    description:
      'The ordered queue of a project, a group or the whole Overseer. Each entry shows where it stands, read by the same picker the supervisor starts work with: next, waiting for a slot, waiting on blockers (named), not ready with planning off, running, or done. The cap in use sits in the head (“9 of 10 running”), and once it is reached the panel says nothing starts until a run finishes. Move up and down, Remove, and Add (the host’s stories not queued yet) act at once and go to the queue’s routes; a row opens its story. On the board the changes happen in the page.',
    states: QUEUE_CASES.map((item) => ({
      id: item.id,
      title: item.label,
      description: item.note,
      render: () => <Queue key={item.id} which={item.id} />,
    })),
    controls: [
      {
        id: 'case',
        label: 'Queue',
        kind: 'choice',
        options: QUEUE_CASES.map(({ id, label }) => ({ id, label })),
        default: 'mixed',
      },
    ],
    play: (values) => <Queue key={queueCase(values.case)} which={queueCase(values.case)} />,
  },
  {
    id: 'supervisor-panel',
    title: 'Supervisor panel',
    component: 'SupervisorPanel · useSupervisor · ManagerOutcomeCardView',
    group: 'Process',
    description:
      'A scope’s supervisor: the switch with one line of what it means now and the model it falls back to on a credit stop, then what it asks the person, then what it did. Each ask is a stop it hands over because the answer changes behaviour: the run, where it stopped, the question, and its answers ready with the recommended one first; the card opens the run, an answer answers it. What it did reads on the per-run manager’s own Handled cards, newest first. Open its chat goes to the supervisor’s chat.',
    states: SUPERVISOR_CASES.map((item) => ({
      id: item.id,
      title: item.label,
      description: item.note,
      render: () => <Supervisor key={item.id} which={item.id} />,
    })),
    controls: [
      {
        id: 'case',
        label: 'Supervisor',
        kind: 'choice',
        options: SUPERVISOR_CASES.map(({ id, label }) => ({ id, label })),
        default: 'on',
      },
    ],
    play: (values) => (
      <Supervisor key={supervisorCase(values.case)} which={supervisorCase(values.case)} />
    ),
  },
  {
    id: 'story-readiness-badge',
    title: 'Story readiness badge',
    component: 'StoryReadinessBadge · storyReadinessView',
    group: 'Project',
    description:
      'A story’s readiness, from the same check the planner and the queue read: “Ready”, or “Not ready · n”. Pressing it lists what the story lacks; a feature’s line opens that feature.',
    states: READINESS_CASES.map((item) => ({
      id: item.id,
      title: item.label,
      description: item.note,
      render: () => <Readiness which={item.id} />,
    })),
    controls: [
      {
        id: 'case',
        label: 'Story',
        kind: 'choice',
        options: READINESS_CASES.map(({ id, label }) => ({ id, label })),
        default: 'problems',
      },
    ],
    play: (values) => <Readiness which={readinessCase(values.case)} />,
  },
  {
    id: 'launch-plan-first',
    title: 'Launch: plan first',
    component:
      'ApprovalPanel (startFeatureWork) · GroupStoryRunDialog · GroupWorkLaunchPanel · LaunchPlanFirstToggle',
    group: 'Process',
    description:
      'Every launch card offers “Plan first”, on by default: a planner writes the story’s spec, plan and features before any is worked, and the run’s pipeline shows its Plan step first. Turned off, the preview is read again without the plan step and Start run sends planning: false. A story launch shows it when its process plans; the group story Run dialog and the chat’s group launch card show one toggle for every part.',
    states: [
      ...PLAN_FIRST_CASES.map((item) => ({
        id: item.id,
        title: item.label,
        description: item.note,
        render: () => <LaunchCard which={item.id} />,
      })),
      {
        id: 'group-dialog',
        title: 'Group story Run dialog',
        description: 'One toggle for every part, on; Start shows what it sent.',
        overlay: true,
        render: () => <GroupRunDialog />,
      },
    ],
    controls: [
      {
        id: 'case',
        label: 'Launch',
        kind: 'choice',
        options: PLAN_FIRST_CASES.map(({ id, label }) => ({ id, label })),
        default: 'on',
      },
    ],
    play: (values) => <LaunchCard which={planFirstCase(values.case)} />,
  },
]
