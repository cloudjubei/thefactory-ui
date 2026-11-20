import type { ReactNode } from 'react'
import { testSessionDisplay } from 'thefactory-ui/headless'
import { TestWithMePanel } from 'thefactory-ui/web'
import RunModelChip from '../../src/web/compound/chat/signoff/RunModelChip'
import type { Scene, SceneState } from '../showcase/types'
import { TEST_WITH_ME_STATES, type TestWithMeState } from './testWithMeFixtures'

const noop = () => {}

function Column({ children }: { children: ReactNode }) {
  return <div className="max-w-2xl p-4">{children}</div>
}

function Phone({ children }: { children: ReactNode }) {
  return <div className="w-[390px] max-w-full p-4">{children}</div>
}

function Block({ state, confirmingStop }: { state: TestWithMeState; confirmingStop?: boolean }) {
  const display = testSessionDisplay(TEST_WITH_ME_STATES[state])
  if (!display) return null
  return (
    <TestWithMePanel
      display={display}
      onStart={noop}
      onStop={noop}
      onOpenChat={noop}
      modelChip={
        <RunModelChip
          model={{ tool: 'claude-code', tag: 'CLI', model: 'Opus 5.5', effort: undefined }}
        />
      }
      {...(confirmingStop ? { confirmingStop } : {})}
    />
  )
}

const STATES: Array<{ id: TestWithMeState; title: string; description: string; phone?: true }> = [
  {
    id: 'idle',
    title: 'Ready to start',
    description: 'The run waits at its sign-off; one press serves the app from this work.',
    phone: true,
  },
  {
    id: 'starting',
    title: 'Starting',
    description: 'Shown the moment the person presses, before the backend answers.',
    phone: true,
  },
  {
    id: 'just-up',
    title: 'Just up',
    description: 'Served and followed; nothing worth reporting yet.',
  },
  {
    id: 'running',
    title: 'Running, with findings',
    description:
      'The app to open, the data environment, counts, the latest error, warning and change lines, and proof newest first.',
    phone: true,
  },
  {
    id: 'stopping',
    title: 'Stopping',
    description: 'Shown the moment the person confirms the stop.',
    phone: true,
  },
  {
    id: 'stopped',
    title: 'Stopped',
    description: 'Taken down by the person; log and proof stay, and it can start again.',
    phone: true,
  },
  {
    id: 'run-ended',
    title: 'Stopped as the run ended',
    description: 'Stopped by the run ending, which says so; nothing new can start.',
  },
  {
    id: 'failed',
    title: 'Could not start',
    description: 'The stack failed to come up, with the reason; it can start again.',
    phone: true,
  },
  {
    id: 'start-refused',
    title: 'Start refused',
    description: 'The backend refused the start: the block is back as it was, with why.',
  },
  {
    id: 'helper-gathering',
    title: 'Helper gathering proof',
    description:
      'Started with the session on the agent picked beside Test with me; Open chat goes to its chat.',
    phone: true,
  },
  {
    id: 'helper-not-started',
    title: 'Helper did not start',
    description:
      'The session runs on; the helper says why it did not start, and its chat is a press away.',
    phone: true,
  },
  {
    id: 'helper-stopped',
    title: 'Helper stopped',
    description:
      'Stopped with the session; starting the test again starts it again in the same chat.',
    phone: true,
  },
  {
    id: 'no-data-environment',
    title: 'No data environment',
    description: 'The serve stack names no data environment, and the block says so.',
  },
]

const sceneStates: SceneState[] = [
  ...STATES.flatMap(({ id, title, description, phone }): SceneState[] => [
    {
      id,
      title,
      description,
      render: () => (
        <Column>
          <Block state={id} />
        </Column>
      ),
    },
    ...(phone
      ? [
          {
            id: `${id}-phone`,
            title: `${title} (phone)`,
            description,
            render: () => (
              <Phone>
                <Block state={id} />
              </Phone>
            ),
          },
        ]
      : []),
  ]),
  {
    id: 'stop-confirm',
    title: 'Stop asks first',
    description: 'Stop opens a confirmation; nothing stops until the person confirms.',
    overlay: true,
    render: () => (
      <Column>
        <Block state="running" confirmingStop />
      </Column>
    ),
  },
]

export const TEST_WITH_ME_SCENES: Scene[] = [
  {
    id: 'test-with-me',
    title: 'Test with me',
    component: 'TestWithMePanel',
    group: 'Process',
    description:
      'On a run’s sign-off, under Try it on your phone, and once on a group run’s sign-off: the app served from the work’s branches while the person tests, a helper chat on the agent picked beside the start that gathers what the change wrote, its log’s errors, warnings and the change’s own lines, and the proof, each with its source and data environment.',
    states: sceneStates,
  },
]
