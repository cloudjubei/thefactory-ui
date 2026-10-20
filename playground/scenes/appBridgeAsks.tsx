import { useState } from 'react'
import { AppWorkStartDialog, LiveDataTaskSourceFields, StartWorkDialog } from 'thefactory-ui/web'
import { sourceToForm, type AppWorkStartAsk, type LiveDataSourceForm } from 'thefactory-ui/headless'
import type { DataSource } from 'thefactory-ui/headless/api'
import type { Scene } from '../showcase/types'

const noop = () => {}

const DESCRIPTION = [
  'People decided these official-source revisions in the WarGames app (Official sources view). Carry the decisions out:',
  '- r3: accepted by kamilch on 2026-10-17 — matches the new PDF',
  '- r4: rejected by kamilch on 2026-10-17',
].join('\n')

const WITH_FEATURES: AppWorkStartAsk = {
  id: 1,
  draft: {
    title: 'Official sources: apply r3, reject r4',
    description: DESCRIPTION,
    features: [
      {
        title: 'Apply source revision r3',
        description: 'Read r3 in the revisions file and transcribe what changed, each value cited.',
      },
      {
        title: 'Record rejected source revision r4',
        description: 'Change no data; run `npm run monitor:sources -- --reject-revision=r4`.',
      },
    ],
  },
  progress: {},
  busy: false,
  error: null,
  launching: false,
  waiting: 0,
}

const NO_FEATURES: AppWorkStartAsk = {
  ...WITH_FEATURES,
  draft: {
    title: 'Refresh the bundled source report',
    description: 'Re-run the monitor and commit the report.',
    features: [],
  },
}

const FAILED: AppWorkStartAsk = {
  ...WITH_FEATURES,
  progress: { storyId: 's1', featureIds: ['f1', 'f2'] },
  error: 'A run of this story is already open.',
}

function WorkStartDemo({ initial }: { initial: AppWorkStartAsk }) {
  const [ask, setAsk] = useState(initial)
  return (
    <AppWorkStartDialog
      ask={ask}
      onEdit={(draft) => setAsk((a) => ({ ...a, draft }))}
      onStart={noop}
      onCancel={noop}
    />
  )
}

function ChoosingDemo() {
  return (
    <StartWorkDialog
      start={{
        target: { projectId: 'wargames', storyId: 's1', featureIds: ['f1', 'f2'] },
        mode: undefined,
        busy: false,
        error: undefined,
        choose: noop,
        launch: async () => {},
        close: noop,
        chatAgent: undefined,
      }}
      chatRunner="cli"
    />
  )
}

const TASK_SOURCE: DataSource = {
  id: 'wargames:official-sources',
  name: 'Official sources',
  recordType: 'official-source-report',
  freshness: 86_400_000,
  autoUpdate: true,
  projectId: 'wargames',
  adapter: {
    itemsPath: 'items',
    kind: 'snapshot',
    map: { key: 'key' },
    task: { script: 'monitor:sources', args: ['--json'] },
  },
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
}

function TaskSourceDemo() {
  const [form, setForm] = useState<LiveDataSourceForm>(() => sourceToForm(TASK_SOURCE))
  return (
    <div className="max-w-lg rounded-lg border border-(--border-subtle) bg-(--surface-base) p-4">
      <LiveDataTaskSourceFields
        form={form}
        onChange={(key, value) => setForm((f) => ({ ...f, [key]: value }))}
      />
    </div>
  )
}

export const APP_BRIDGE_ASK_SCENES: Scene[] = [
  {
    id: 'app-work-start',
    title: 'Start work an app asks for',
    component: 'AppWorkStartDialog',
    group: 'Process',
    description:
      'An embedded app’s `overseer:work.start`, confirmed over the App view before anything is made: title, description and features, editable until Start makes the story. Start then offers the choice every Run offers — a process run (its launch card) or in this chat; closing that choice comes back here. Cancel or X declines. It waits as long as the person takes.',
    states: [
      {
        id: 'features',
        title: 'With features',
        description: 'The app named the features to make.',
        overlay: true,
        render: () => <WorkStartDemo initial={WITH_FEATURES} />,
      },
      {
        id: 'no-features',
        title: 'No features',
        description: 'The app named none, so the work runs as one feature.',
        overlay: true,
        render: () => <WorkStartDemo initial={NO_FEATURES} />,
      },
      {
        id: 'start-failed',
        title: 'Start failed after the story was made',
        description: 'The fields are locked; Start tries again on the same story.',
        overlay: true,
        render: () => <WorkStartDemo initial={FAILED} />,
      },
      {
        id: 'choosing',
        title: 'Choosing how it runs',
        description:
          'Paired with With features: the story is made, and Start opened the same choice as every Run.',
        overlay: true,
        render: () => <ChoosingDemo />,
      },
    ],
  },
  {
    id: 'live-data-task-source',
    title: 'Edit a task source',
    component: 'LiveDataTaskSourceFields',
    group: 'Primitives',
    description:
      'The Live data edit form for a source a project declares in its package.json: name and script read-only, only freshness and auto-update editable.',
    states: [
      {
        id: 'schedule',
        title: 'Schedule only',
        render: () => <TaskSourceDemo />,
      },
    ],
  },
]
