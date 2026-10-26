import { useState } from 'react'
import {
  groupStoryFormFor,
  type GroupProjectStoryOption,
  type GroupStoryForm,
  type GroupStoryMembership,
  type GroupStoryPartView,
  type GroupStoryRunPreview,
  type GroupStoryView,
} from 'thefactory-ui/headless'
import {
  GroupStoriesList,
  GroupStoryFormDialog,
  GroupStoryFormFields,
  GroupStoryPage,
  GroupStoryRunDialog,
  ModelChip,
  PartOfGroupStoryChip,
  ProcessGroupRunChatButton,
} from 'thefactory-ui/web'
import type { ModelInfo } from '../../src/headless/api'
import type { Scene } from '../showcase/types'

const noop = () => {}
const asyncNoop = async () => {}
const AT = '2026-10-25T10:00:00.000Z'
const STARTED_AT = 1_761_386_400_000

const MEMBERS = [
  { id: 'thefactory-tools', title: 'TheFactory Tools' },
  { id: 'thefactory-backend', title: 'TheFactory Backend' },
  { id: 'thefactory-ui', title: 'TheFactory UI' },
  { id: 'thefactory-overseer-web', title: 'Overseer Web' },
  { id: 'overseer-local', title: 'Overseer Desktop' },
  { id: 'thefactory-overseer-mobile', title: 'Overseer Mobile' },
]

const title = (id: string) => MEMBERS.find((m) => m.id === id)?.title ?? id

function part(projectId: string, over: Partial<GroupStoryPartView> = {}): GroupStoryPartView {
  return {
    projectId,
    projectTitle: title(projectId),
    storyId: `story-${projectId}`,
    storyTitle: 'Conflict-safe editing',
    status: 'pending',
    featuresDone: 0,
    featuresTotal: 2,
    needs: [],
    step: 1,
    ...over,
  }
}

function story(
  id: string,
  storyTitle: string,
  partViews: GroupStoryPartView[],
  over: Partial<GroupStoryView> = {},
): GroupStoryView {
  const steps: string[][] = []
  for (const p of partViews) {
    if (p.step === undefined) continue
    ;(steps[p.step - 1] ??= []).push(p.projectId)
  }
  return {
    id,
    groupId: 'factory',
    groupTitle: 'TheFactory',
    title: storyTitle,
    description: '',
    parts: partViews.map((p) => ({ projectId: p.projectId, storyId: p.storyId })),
    createdAt: AT,
    updatedAt: AT,
    partViews,
    steps,
    problems: [],
    status: 'pending',
    ...over,
  }
}

const CONFLICT_SAFE = story(
  'gs-conflict',
  'Conflict-safe editing',
  [
    part('thefactory-backend', { featuresDone: 1, featuresTotal: 2, status: 'in_progress' }),
    part('thefactory-ui', { step: 2, needs: ['thefactory-backend'], featuresTotal: 4 }),
    part('thefactory-overseer-web', { step: 3, needs: ['thefactory-ui'], featuresTotal: 1 }),
    part('overseer-local', { step: 3, needs: ['thefactory-ui'], featuresTotal: 1 }),
    part('thefactory-overseer-mobile', { step: 3, needs: ['thefactory-ui'], featuresTotal: 1 }),
  ],
  {
    description:
      'When a file changes under unsaved edits, the editor shows the incoming change and offers a three-way merge instead of overwriting or dropping it.',
    status: 'in_progress',
    latestRun: {
      groupRunId: 'run-1',
      title: 'Conflict-safe editing',
      status: 'running',
      startedAt: STARTED_AT,
    },
  },
)

const EMPTY_FOLDERS = story('gs-folders', 'Files tree shows empty folders', [
  part('thefactory-tools', { storyTitle: 'Empty folders in the file listing', featuresTotal: 1 }),
  part('thefactory-ui', {
    storyTitle: 'Show empty folders in the files tree',
    step: 2,
    needs: ['thefactory-tools'],
    featuresTotal: 2,
  }),
])

const HARDENING_LOOP = story(
  'gs-hardening',
  'Chat and CLI session hardening',
  [
    part('thefactory-tools', { step: undefined, needs: ['thefactory-backend'] }),
    part('thefactory-backend', { step: undefined, needs: ['thefactory-tools'] }),
  ],
  { problems: ['thefactory-tools and thefactory-backend need each other, so neither can start.'] },
)

const KNOWLEDGE_DONE = story(
  'gs-knowledge',
  'Knowledge in every run',
  [
    part('thefactory-backend', { status: 'done', featuresDone: 3, featuresTotal: 3 }),
    part('thefactory-ui', {
      status: 'done',
      featuresDone: 1,
      featuresTotal: 1,
      step: 2,
      needs: ['thefactory-backend'],
    }),
  ],
  {
    status: 'done',
    latestRun: {
      groupRunId: 'run-0',
      title: 'Knowledge in every run',
      status: 'succeeded',
      startedAt: STARTED_AT,
    },
  },
)

const WAITING = story('gs-waiting', 'Conflict-safe editing', CONFLICT_SAFE.partViews, {
  ...CONFLICT_SAFE,
  latestRun: {
    groupRunId: 'run-1',
    title: 'Conflict-safe editing',
    status: 'parked',
    waitingOn: 'TheFactory Backend is waiting on you: its sign-off.',
    startedAt: STARTED_AT,
  },
})

const STORIES_BY_PROJECT: Record<string, GroupProjectStoryOption[]> = {
  'thefactory-tools': [
    { id: 'story-thefactory-tools', title: 'Empty folders in the file listing', status: 'pending' },
    { id: 't2', title: 'Ongoing improvements', status: 'pending' },
  ],
  'thefactory-backend': [{ id: 'b1', title: 'Say which file changed', status: 'pending' }],
  'thefactory-ui': [
    { id: 'story-thefactory-ui', title: 'Show empty folders in the files tree', status: 'pending' },
  ],
  'thefactory-overseer-web': [],
  'overseer-local': [],
  'thefactory-overseer-mobile': [],
}

const NEW_FORM = groupStoryFormFor(MEMBERS)

const FILLED_FORM: GroupStoryForm = {
  title: 'Files tree shows empty folders',
  description: 'An empty folder shows in the files tree on every client.',
  rows: NEW_FORM.rows.map((row) =>
    row.projectId === 'thefactory-tools'
      ? { ...row, choice: 'existing', storyId: 'story-thefactory-tools' }
      : row.projectId === 'thefactory-ui'
        ? { ...row, choice: 'new', needs: ['thefactory-tools'] }
        : row,
  ),
}

const LOOP_FORM: GroupStoryForm = {
  ...FILLED_FORM,
  rows: FILLED_FORM.rows.map((row) =>
    row.projectId === 'thefactory-tools' ? { ...row, needs: ['thefactory-ui'] } : row,
  ),
}

const EDIT_FORM = groupStoryFormFor(MEMBERS, EMPTY_FOLDERS)

function FormState({ start }: { start: GroupStoryForm }) {
  const [form, setForm] = useState(start)
  return (
    <div className="max-w-2xl">
      <GroupStoryFormFields form={form} onChange={setForm} storiesByProject={STORIES_BY_PROJECT} />
    </div>
  )
}

const MEMBERSHIPS: GroupStoryMembership[] = [
  {
    groupId: 'factory',
    groupTitle: 'TheFactory',
    groupStoryId: 'gs-conflict',
    title: 'Conflict-safe editing',
  },
]

const BRANCHES = { current: 'dev', preselected: 'dev', branches: ['dev', 'main'] }

function previewLeg(
  projectId: string,
  storyTitle: string,
  dependsOn: string[],
  features: number,
  over: Partial<GroupStoryRunPreview['legs'][number]> = {},
): GroupStoryRunPreview['legs'][number] {
  return {
    projectId,
    projectTitle: title(projectId),
    storyId: `story-${projectId}`,
    storyTitle,
    dependsOn,
    features,
    isPrerequisite: dependsOn.length === 0,
    baseBranches: BRANCHES,
    baseBranch: 'dev',
    ...over,
  }
}

const READY_PREVIEW: GroupStoryRunPreview = {
  groupId: 'factory',
  groupTitle: 'TheFactory',
  legs: [
    previewLeg('thefactory-tools', 'Empty folders in the file listing', [], 1),
    previewLeg('thefactory-ui', 'Show empty folders in the files tree', ['thefactory-tools'], 2, {
      isPrerequisite: false,
    }),
  ],
  waves: [['thefactory-tools'], ['thefactory-ui']],
  problems: [],
}

const NEEDS_BRANCH_PREVIEW: GroupStoryRunPreview = {
  ...READY_PREVIEW,
  legs: [
    READY_PREVIEW.legs[0]!,
    {
      ...READY_PREVIEW.legs[1]!,
      baseBranches: { branches: ['dev', 'main', 'feature/x'] },
      baseBranch: undefined,
    },
  ],
  problems: [
    'TheFactory UI has no current branch to work off: pick its branch (dev, main or feature/x).',
  ],
}

const PROBLEM_PREVIEW: GroupStoryRunPreview = {
  ...READY_PREVIEW,
  legs: [READY_PREVIEW.legs[0]!, { ...READY_PREVIEW.legs[1]!, openRunId: 'run-9' }],
  problems: [
    'Show empty folders in the files tree (thefactory-ui) already has a run working on it — finish or stop it first.',
  ],
}

const CLI_MODELS: ModelInfo[] = [
  { id: 'claude-opus-5-5', label: 'Opus 5.5', cli: 'claude-code' },
  { id: 'claude-sonnet-5-5', label: 'Sonnet 5.5', cli: 'claude-code' },
]
const API_CONFIG = {
  id: 'cfg-1',
  name: 'Claude Opus',
  provider: 'anthropic',
  model: 'claude-opus-5-5',
}

function LaunchModelChip() {
  return (
    <ModelChip
      editable
      mode="chat"
      model="claude-opus-5-5"
      activeConfig={API_CONFIG}
      recents={[API_CONFIG]}
      configs={[API_CONFIG]}
      onPick={noop}
      onOpenSettings={noop}
      getPrice={async () => undefined}
      enabledClis={['claude-code', 'codex']}
      onPickCli={noop}
      cliModels={CLI_MODELS}
      onPickCliModel={noop}
    />
  )
}

function RunDialogState({
  preview,
  loading = false,
  started,
}: {
  preview: GroupStoryRunPreview | undefined
  loading?: boolean
  started?: { groupRunId: string; message: string }
}) {
  const [picks, setPicks] = useState<Record<string, string>>({})
  return (
    <GroupStoryRunDialog
      isOpen
      onClose={noop}
      title="Files tree shows empty folders"
      preview={preview}
      previewLoading={loading}
      basePicks={picks}
      onPickBase={(projectId, branch) => setPicks((p) => ({ ...p, [projectId]: branch }))}
      renderModelChip={() => <LaunchModelChip />}
      onStart={async () => ({ groupRunId: 'run-2', message: 'Started.' })}
      onOpenRun={noop}
      {...(started ? { started } : {})}
    />
  )
}

export const GROUP_STORY_SCENES: Scene[] = [
  {
    id: 'group-stories-list',
    title: 'Group stories — the group’s Stories tab',
    component: 'GroupStoriesList',
    group: 'Project',
    kind: 'screen',
    wide: true,
    description:
      'A project group’s Stories tab: each group story keeps one feature’s stories across the group’s projects, one row each like a project’s stories — status, title, features done across its parts, the parts in the order they run (→ between steps) and Run; while a run is going the row shows where it stands instead. A row opens the group story.',
    states: [
      {
        id: 'mixed',
        title: 'Running, waiting on you, ready, blocked and done',
        render: () => (
          <GroupStoriesList
            stories={[CONFLICT_SAFE, WAITING, EMPTY_FOLDERS, HARDENING_LOOP, KNOWLEDGE_DONE]}
            onOpenStory={noop}
            onRun={noop}
            onOpenRun={noop}
            onNew={noop}
          />
        ),
      },
      {
        id: 'empty',
        title: 'No group stories yet',
        render: () => (
          <GroupStoriesList
            stories={[]}
            onOpenStory={noop}
            onRun={noop}
            onOpenRun={noop}
            onNew={noop}
          />
        ),
      },
      {
        id: 'loading',
        title: 'Loading',
        render: () => (
          <GroupStoriesList
            stories={[]}
            loading
            onOpenStory={noop}
            onRun={noop}
            onOpenRun={noop}
            onNew={noop}
          />
        ),
      },
    ],
  },
  {
    id: 'group-story-page',
    title: 'Group story — its parts by step',
    component: 'GroupStoryPage',
    group: 'Project',
    kind: 'screen',
    wide: true,
    description:
      'One group story: its parts in step columns — parts in one step run side by side, each step after the ones it needs (the part stories’ blockers on each other). Each part shows its project, its story (opening it), status, features done and what it needs. Run, Edit and Delete (confirmed; the part stories stay).',
    states: [
      {
        id: 'ready',
        title: 'Ready to run',
        render: () => (
          <GroupStoryPage
            story={EMPTY_FOLDERS}
            onRun={noop}
            onOpenRun={noop}
            onEdit={noop}
            onDelete={asyncNoop}
            onOpenPartStory={noop}
          />
        ),
      },
      {
        id: 'running',
        title: 'Running — three steps, three parts side by side',
        render: () => (
          <GroupStoryPage
            story={CONFLICT_SAFE}
            onRun={noop}
            onOpenRun={noop}
            onEdit={noop}
            onDelete={asyncNoop}
            onOpenPartStory={noop}
          />
        ),
      },
      {
        id: 'loop',
        title: 'Parts that need each other',
        description:
          'Neither can start: the problem says why and the parts sit under Cannot start.',
        render: () => (
          <GroupStoryPage
            story={HARDENING_LOOP}
            onRun={noop}
            onOpenRun={noop}
            onEdit={noop}
            onDelete={asyncNoop}
            onOpenPartStory={noop}
          />
        ),
      },
      {
        id: 'done',
        title: 'Every part done',
        render: () => (
          <GroupStoryPage
            story={KNOWLEDGE_DONE}
            onRun={noop}
            onOpenRun={noop}
            onEdit={noop}
            onDelete={asyncNoop}
            onOpenPartStory={noop}
          />
        ),
      },
    ],
  },
  {
    id: 'group-story-form',
    title: 'Group story — new or edit',
    component: 'GroupStoryFormFields · GroupStoryFormDialog',
    group: 'Project',
    description:
      'One form: title, description, and a row per member project — None, Use a story (one of its stories) or New story (its title optional) — with the other parts it needs first. Save stays off, saying why, until nothing stops it.',
    states: [
      { id: 'new', title: 'New — nothing picked', render: () => <FormState start={NEW_FORM} /> },
      {
        id: 'filled',
        title: 'Two parts, the UI needing the tools first',
        render: () => <FormState start={FILLED_FORM} />,
      },
      { id: 'edit', title: 'Editing a group story', render: () => <FormState start={EDIT_FORM} /> },
      {
        id: 'dialog-loop',
        title: 'Dialog — parts that need each other',
        description: 'Create stays off: the footer says the two parts need each other.',
        overlay: true,
        render: () => (
          <GroupStoryFormDialog
            isOpen
            onClose={noop}
            mode="new"
            initialForm={LOOP_FORM}
            storiesByProject={STORIES_BY_PROJECT}
            onSave={asyncNoop}
          />
        ),
      },
    ],
  },
  {
    id: 'part-of-group-story',
    title: 'Part story — the way back to its group story',
    component: 'PartOfGroupStoryChip',
    group: 'Project',
    description:
      'In a part story’s header: “Part of TheFactory › Conflict-safe editing”, opening the group story.',
    states: [
      {
        id: 'one',
        title: 'Part of one group story',
        render: () => <PartOfGroupStoryChip memberships={MEMBERSHIPS} onOpen={noop} />,
      },
    ],
  },
  {
    id: 'group-story-run',
    title: 'Run a group story',
    component: 'GroupStoryRunDialog',
    group: 'Process',
    description:
      'Run every part as one group run: the parts step by step with their stories and features, each part’s branch, the agent, a cap per part and the turn limit. No chat is opened — the run is followed on the group’s Processes page and in Needs you.',
    states: [
      {
        id: 'ready',
        title: 'Ready to start',
        overlay: true,
        render: () => <RunDialogState preview={READY_PREVIEW} />,
      },
      {
        id: 'needs-branch',
        title: 'A part needs its branch picked',
        overlay: true,
        render: () => <RunDialogState preview={NEEDS_BRANCH_PREVIEW} />,
      },
      {
        id: 'problems',
        title: 'A part’s story has a run already',
        overlay: true,
        render: () => <RunDialogState preview={PROBLEM_PREVIEW} />,
      },
      {
        id: 'loading',
        title: 'Reading the projects',
        overlay: true,
        render: () => <RunDialogState preview={undefined} loading />,
      },
      {
        id: 'started',
        title: 'Started',
        overlay: true,
        render: () => (
          <RunDialogState
            preview={READY_PREVIEW}
            started={{
              groupRunId: 'run-2',
              message:
                'Started “Files tree shows empty folders” across 2 projects on the API agent. thefactory-ui waits until what it needs is merged — you approve each of those merges.',
            }}
          />
        ),
      },
    ],
  },
  {
    id: 'group-run-chat',
    title: 'Group run — a chat for the whole group',
    component: 'ProcessGroupRunChatButton',
    group: 'Process',
    description:
      'On a group run’s page: Chat opens a chat for the whole group on the run — the one it reports to, or for a run started from a group story a new one its updates go to from then on.',
    states: [
      { id: 'idle', title: 'Chat', render: () => <ProcessGroupRunChatButton onOpen={noop} /> },
      {
        id: 'opening',
        title: 'Opening',
        render: () => <ProcessGroupRunChatButton onOpen={noop} busy />,
      },
    ],
  },
]
