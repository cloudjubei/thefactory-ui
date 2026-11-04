import { useState } from 'react'
import {
  GROUP_STORY_LIST_FILTER_DEFAULT,
  groupStoryFormFor,
  type GroupProjectStoryOption,
  type GroupStoryFolds,
  type GroupStoryForm,
  type GroupStoryListFilter,
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
import { MEMBERS } from '../../src/fakeBackend/fixtures/projects'
import type { Scene } from '../showcase/types'

const noop = () => {}
const asyncNoop = async () => {}
const AT = '2026-10-25T10:00:00.000Z'
const STARTED_AT = 1_761_386_400_000

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
      legs: [
        { projectId: 'thefactory-backend', status: 'running' },
        { projectId: 'thefactory-ui', status: 'blocked' },
      ],
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
      legs: [
        { projectId: 'thefactory-backend', status: 'integrated' },
        { projectId: 'thefactory-ui', status: 'integrated' },
      ],
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
    legs: [{ projectId: 'thefactory-backend', status: 'start-failed' }],
    startedAt: STARTED_AT,
  },
})

const OVERSIGHT_WAITING = story(
  'gs-oversight',
  'Oversight: condensed chats and the group cockpit',
  [
    part('thefactory-tools', { status: 'done', featuresDone: 2, featuresTotal: 2 }),
    part('thefactory-backend', {
      step: 2,
      needs: ['thefactory-tools'],
      status: 'in_progress',
      featuresDone: 1,
      featuresTotal: 3,
    }),
    part('thefactory-ui', { step: 3, needs: ['thefactory-backend'], featuresTotal: 2 }),
  ],
  {
    status: 'in_progress',
    latestRun: {
      groupRunId: 'run-3',
      title: 'Oversight: condensed chats and the group cockpit',
      status: 'running',
      legs: [
        { projectId: 'thefactory-tools', status: 'integrated' },
        { projectId: 'thefactory-backend', status: 'waiting' },
        { projectId: 'thefactory-ui', status: 'blocked' },
      ],
      startedAt: STARTED_AT,
    },
  },
)

const MOBILE_ASKS = story(
  'gs-mobile',
  'Mobile parity gaps',
  [
    part('thefactory-ui', { status: 'done', featuresDone: 3, featuresTotal: 3 }),
    part('thefactory-overseer-mobile', {
      step: 2,
      needs: ['thefactory-ui'],
      status: 'in_progress',
      featuresDone: 2,
      featuresTotal: 5,
    }),
  ],
  {
    status: 'in_progress',
    latestRun: {
      groupRunId: 'run-4',
      title: 'Mobile parity gaps',
      status: 'running',
      legs: [
        { projectId: 'thefactory-ui', status: 'integrated' },
        { projectId: 'thefactory-overseer-mobile', status: 'needs-you' },
      ],
      startedAt: STARTED_AT,
    },
  },
)

const CONTEXT_DESCRIPTION = [
  '**Status: design proposed, still in discussion.** Features are drafted from the proposal below. Do not start work until the open questions at the end are settled.',
  '',
  '## How it works today',
  '',
  'API chats limit their own context. Only the last `numberMessagesToSend` messages are sent, and the model keeps `dynamicContext` current through its structured reply.',
  '',
  'CLI chats do none of that. A CLI chat turn gets its history in one of three ways:',
  '',
  '1. **Live process ("resident", the default).** Every turn is fed into one running CLI; it compacts the conversation itself.',
  '2. **The CLI’s saved session.** Each turn starts a new container with `--resume <session id>`, the id held only in memory.',
  '3. **Full replay.** The whole chat is sent as text with no size limit — after 20 minutes idle, a restart or a switch of CLI.',
  '',
  '## What is wrong',
  '',
  '1. **The replay has no size limit.** A long chat can overflow the model’s context window, and nothing detects it.',
  '2. **The host does not track how full a session is.** Compaction events (`compact_boundary`) are not read.',
  '3. **A model switch is ignored on both CLI paths (bug).** The session key is `chatContextId::cli::credential::tools` — no model or effort in it.',
  '4. **Tool guidance is re-sent every turn (bug).** About 6 KB is prefixed to every prompt.',
  '',
  '## Proposed design',
  '',
  'Keep the CLI’s own session as the working memory, because it holds the tool results. Treat the chat as the source of truth.',
  '',
  '- **Freshness check.** Store the last chat message each session saw; catch it up, or rebuild it after an edit or delete.',
  '  - Only new messages since: send them in as a catch-up.',
  '  - The chat was edited: rebuild the session.',
  '- **Bounded rebuild.** The system prompt, `dynamicContext` and the last `numberMessagesToSend` messages, under a size ceiling.',
  '- **Fix the two bugs.** Model and effort in both session keys; tool guidance only when a session starts.',
  '',
  '## Update 2026-10-08: what changed, and concerns',
  '',
  '### Already changed since this design was written',
  '- Every chat turn runs in the chat’s resident session, on every CLI.',
  '- A cold resident session is seeded with the same `numberMessagesToSend` window an API request gets.',
  '',
  '### Concerns with the current feature design',
  '1. **The stale catch-up summary contradicts the design’s own reasoning.** Ask the live session to checkpoint before it is dropped.',
  '2. **A size ceiling is still needed** on top of `numberMessagesToSend`: one huge message can overflow the window.',
].join('\n')

const CONTEXT_FRESH = story(
  'gs-context',
  'CLI agents: keep conversation context fresh and bounded (design in discussion)',
  [
    part('thefactory-tools', {
      storyTitle: 'Chats: shared context plan for API and CLI (design settled, not started)',
      status: 'in_progress',
      featuresDone: 4,
      featuresTotal: 5,
    }),
    part('thefactory-backend', {
      storyTitle: 'Unified API+CLI context — backend slices for workstreams B, C, D',
      status: 'blocked',
      step: 2,
      needs: ['thefactory-tools'],
      featuresTotal: 3,
    }),
    part('thefactory-ui', {
      storyTitle: 'CLI agents: keep conversation context fresh and bounded',
      step: 3,
      needs: ['thefactory-backend'],
      featuresTotal: 6,
    }),
  ],
  { description: CONTEXT_DESCRIPTION, status: 'in_progress' },
)

/** The same group story under its own id per state, so each state's folds start as it says. */
const contextFresh = (id: string): GroupStoryView => ({ ...CONTEXT_FRESH, id: `gs-context-${id}` })

const LIST = [
  CONFLICT_SAFE,
  WAITING,
  OVERSIGHT_WAITING,
  MOBILE_ASKS,
  EMPTY_FOLDERS,
  HARDENING_LOOP,
  KNOWLEDGE_DONE,
]

function ListState({
  stories = LIST,
  start = {},
  loading = false,
}: {
  stories?: GroupStoryView[]
  start?: Partial<GroupStoryListFilter>
  loading?: boolean
}) {
  const [filter, setFilter] = useState<GroupStoryListFilter>({
    ...GROUP_STORY_LIST_FILTER_DEFAULT,
    ...start,
  })
  return (
    <GroupStoriesList
      stories={stories}
      filter={filter}
      onFilterChange={(change) => setFilter((f) => ({ ...f, ...change }))}
      loading={loading}
      onOpenStory={noop}
      onRun={noop}
      onOpenRun={noop}
      onNew={noop}
    />
  )
}

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

const FOLLOWS_PREVIEW: GroupStoryRunPreview = {
  ...READY_PREVIEW,
  legs: [
    READY_PREVIEW.legs[0]!,
    {
      ...READY_PREVIEW.legs[1]!,
      openRunId: 'run-9',
      followsOpenRun:
        'Follows its open run “Show empty folders in the files tree”, still running — no second run starts.',
    },
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

function PageState({
  story,
  withBack = true,
  folds,
}: {
  story: GroupStoryView
  withBack?: boolean
  folds?: Partial<GroupStoryFolds>
}) {
  return (
    <GroupStoryPage
      story={story}
      onRun={noop}
      onOpenRun={noop}
      onEdit={noop}
      onDelete={asyncNoop}
      onOpenPartStory={noop}
      {...(withBack ? { onBack: noop } : {})}
      {...(folds ? { initialFolds: folds } : {})}
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
      'A project group’s Stories tab, filtered and laid out like a project’s Home: each group story keeps one feature’s stories across the group’s projects, one row each — its place in the group’s order, status, title, features done across its parts, the parts in the order they run (→ between steps) and Run; while a run is going the row shows where it stands instead. A row opens the group story.',
    states: [
      {
        id: 'mixed',
        title: 'Running, waiting, needing you, ready, blocked and done',
        description:
          'The toolbar of a project’s Home: search, status, project and run filters, the order, how many show and List / Board. A row’s pill reads its run’s projects: “Waiting” while every project still moving waits on other work, “Needs you” while one asks — even though the group run itself is still going.',
        render: () => <ListState />,
      },
      {
        id: 'filtered',
        title: 'One project’s group stories that are not done',
        render: () => <ListState start={{ status: 'not-done', projectId: 'thefactory-ui' }} />,
      },
      {
        id: 'run-waiting',
        title: 'Only runs waiting on other work',
        render: () => <ListState start={{ run: 'waiting' }} />,
      },
      {
        id: 'board',
        title: 'Board — columns by status',
        render: () => <ListState start={{ layout: 'board' }} />,
      },
      {
        id: 'no-match',
        title: 'Nothing matches the filters',
        render: () => <ListState start={{ query: 'payments' }} />,
      },
      {
        id: 'empty',
        title: 'No group stories yet',
        render: () => <ListState stories={[]} />,
      },
      {
        id: 'loading',
        title: 'Loading',
        render: () => <ListState stories={[]} loading />,
      },
    ],
  },
  {
    id: 'group-story-page',
    title: 'Group story — Parts and Overview',
    component: 'GroupStoryPage',
    group: 'Project',
    kind: 'screen',
    wide: true,
    description:
      'One group story, laid out like a story page: its Parts first, then its Overview, each a panel that folds to its heading and one line — Parts to the projects in the order they run (a status dot each, → between steps), Overview to the description’s first line. Parts sit in step columns — parts in one step run side by side, each step after the ones it needs (the part stories’ blockers on each other); each part shows its project, its story (opening it), status, features done and what it needs. The Overview folds the description at its headings: the text before the first heading always shows, then one row per heading with its first line and how much it holds (“4 points”, “2 subsections”), opening to its text; a heading’s subsections open the same way, and Expand all / Collapse all open or fold every one. What is open is kept per group story for the session. The header starts with the back button to the group’s Stories, as a story page’s does, and ends with Run, Edit and Delete as the icon buttons a story has: Run the filled play button (turned off, saying why on hover, while it cannot run; gone while a run is going and its status shows instead), Edit the pencil and Delete the red bin (confirmed; the part stories stay). The page lays itself out by its own width: below 768 px the title takes its own lines and the parts count leaves the header for the Parts heading, the panels run edge to edge, the steps stack, every heading row is at least 44 px tall and a section’s size moves in front of its summary.',
    states: [
      {
        id: 'ready',
        title: 'Ready to run',
        render: () => <PageState story={EMPTY_FOLDERS} />,
      },
      {
        id: 'running',
        title: 'Running — three steps, three parts side by side',
        description: 'No Run while the run is going: its status pill opens it.',
        render: () => <PageState story={CONFLICT_SAFE} />,
      },
      {
        id: 'loop',
        title: 'Parts that need each other',
        description:
          'Neither can start: the problem says why, the parts sit under Cannot start and Run is turned off.',
        render: () => <PageState story={HARDENING_LOOP} />,
      },
      {
        id: 'done',
        title: 'Every part done',
        description: 'Run is turned off: every part is done.',
        render: () => <PageState story={KNOWLEDGE_DONE} />,
      },
      {
        id: 'long-description',
        title: 'A long description — folded at its headings',
        description:
          'The text before the first heading shows; each heading is one row with its first line and size, opening on click. A description with no headings shows whole.',
        render: () => <PageState story={contextFresh('folded-sections')} />,
      },
      {
        id: 'sections-open',
        title: 'Sections opened — one with its subsections',
        description:
          'An open heading shows its text; the update’s subsections open one at a time. Expand all becomes Collapse all once every one is open.',
        render: () => (
          <PageState
            story={contextFresh('open-sections')}
            folds={{ sections: ['1', '3', '3.1'] }}
          />
        ),
      },
      {
        id: 'folded',
        title: 'Parts and Overview folded',
        description:
          'Folded, Parts shows its projects in run order with a status dot each, Overview its first line.',
        render: () => (
          <PageState story={contextFresh('folded')} folds={{ parts: false, overview: false }} />
        ),
      },
      {
        id: 'phone',
        title: 'At a phone’s width',
        description:
          '390 px wide: the title on its own lines, panels edge to edge, steps stacked, 44 px heading rows, each folded heading’s size before its summary. The mobile app draws the same page natively.',
        render: () => (
          <div style={{ width: 390, height: 844, border: '1px solid var(--border-default)' }}>
            <PageState story={contextFresh('phone')} withBack={false} folds={{ sections: ['1'] }} />
          </div>
        ),
      },
      {
        id: 'small-screen',
        title: 'On a small screen — back is the app bar’s',
        description:
          'Below the desktop width the page has no back button of its own: the app bar’s back arrow returns to the group’s Stories, as on a story page.',
        render: () => <PageState story={EMPTY_FOLDERS} withBack={false} />,
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
        id: 'follows-open-run',
        title: 'A part’s story has a run open already — the part follows it',
        description:
          'A story run started elsewhere — from a feature request or by a person — is not refused: the part follows it, and the parts that need it wait for it to merge.',
        overlay: true,
        render: () => <RunDialogState preview={FOLLOWS_PREVIEW} />,
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
