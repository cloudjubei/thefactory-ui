import type { ReactNode } from 'react'
import type { ProcessLedgerEntry, ProcessRun } from 'thefactory-tools/types'
import { StepsStrip, ToneBadge } from 'thefactory-ui/web'
import {
  chatListRow,
  chatListSections,
  DEFAULT_APP_SETTINGS,
  inkBadgeLook,
  processRunAttentionSections,
  processRunChatContext,
  processRunStripEntries,
  STEPS_STRIP_LABELS,
  type ChatListFilter,
  type ChatListRowInput,
  type ChatListScope,
  type ProcessStatusTone,
} from 'thefactory-ui/headless'
// Not on the package's public surface: the pipeline draws its head, the chat list and the
// Processes list their sections. The showcase reaches into the source for them.
import { ChatListSectionView } from '../../src/web/compound/chat/ChatList'
import { RunHead } from '../../src/web/compound/process/ProcessPipeline'
import { RunSection } from '../../src/web/screens/ProcessRunsView'
import type { Scene } from '../showcase/types'

const noop = () => {}
const NOW = 1_760_000_000_000
const QUIET = {
  isThinking: false,
  isAgentRunning: false,
  unreadCount: 0,
  needsYou: 0,
  muted: false,
  retired: false,
}
const LOOK = inkBadgeLook(DEFAULT_APP_SETTINGS.userPreferences)
const BADGE_COLORS = DEFAULT_APP_SETTINGS.notifications.badgeColors

const STEPS = [
  { id: 'plan', name: 'Plan', kind: 'agent', agentType: 'planner' },
  { id: 'spec', name: 'Spec', kind: 'agent', agentType: 'planner' },
  { id: 'model', name: 'Data model', kind: 'agent', agentType: 'developer' },
  { id: 'rules', name: 'Rules engine refinements', kind: 'agent', agentType: 'developer' },
  { id: 'checks', name: 'Checks', kind: 'check' },
  { id: 'review', name: 'Code review', kind: 'judge' },
  { id: 'sign-off', name: 'Sign-off', kind: 'gate' },
] as const satisfies ProcessRun['plan']['steps']

function entry(stepId: string, over: Partial<ProcessLedgerEntry> = {}): ProcessLedgerEntry {
  return {
    id: `${stepId}-1`,
    stepId,
    iteration: 1,
    status: 'done',
    outcome: 'passed',
    startedAt: 0,
    ...over,
  }
}

const passed = (ids: readonly string[]) => ids.map((id) => entry(id))

function run(id: string, title: string, over: Partial<ProcessRun>): ProcessRun {
  return {
    id,
    projectId: 'p1',
    title,
    status: 'running',
    loopCounts: {},
    ledger: [],
    startedAt: 0,
    updatedAt: 0,
    workBranch: { name: `factory/${id}`, baseRef: 'main', baseSha: '0'.repeat(40) },
    plan: {
      definitionId: 'story',
      definitionScope: 'global',
      definitionVersion: 1,
      name: 'Story',
      steps: [...STEPS],
      loops: [],
      frozenAt: 0,
    },
    ...over,
  }
}

/** Three steps done, the fourth with its agent at work. */
const RUNNING = run('run-rules', 'Pricing rules engine', {
  cursor: { stepId: 'rules' } as ProcessRun['cursor'],
  ledger: [
    ...passed(['plan', 'spec', 'model']),
    entry('rules', { status: 'running', outcome: undefined }),
  ],
})

/** Stopped on a failed check, its agent manager looking at it. */
const MANAGER_ON_IT = run('run-export', 'CSV export for invoices', {
  status: 'parked',
  park: {
    reason: 'step-failed',
    stepId: 'checks',
    message: 'Checks failed.',
    parkedAt: NOW - 120_000,
  },
  ledger: [...passed(['plan', 'spec', 'model', 'rules']), entry('checks', { outcome: 'failed' })],
  manager: {
    turn: {
      runId: 'run-export',
      parkedAt: NOW - 120_000,
      signature: 's',
      startedAt: NOW - 60_000,
      chatContextId: 'c',
    },
  },
})

/** Every step through code review passed; waiting at the sign-off gate. */
const AT_SIGN_OFF = run('run-search', 'Search across projects', {
  status: 'parked',
  park: { reason: 'gate', stepId: 'sign-off', message: 'Ready to sign off.', parkedAt: 0 },
  ledger: passed(['plan', 'spec', 'model', 'rules', 'checks', 'review']),
})

/** Stopped on a question only the person can answer. */
const NEEDS_YOU = run('run-auth', 'Single sign-on', {
  status: 'parked',
  park: { reason: 'step-failed', stepId: 'model', message: 'Data model failed.', parkedAt: 0 },
  ledger: [...passed(['plan', 'spec']), entry('model', { outcome: 'failed' })],
})

/** Signed off; the host is merging its work. */
const MERGING = run('run-theme', 'Dark theme tokens', {
  status: 'succeeded',
  ledger: [
    ...passed(['plan', 'spec', 'model', 'rules', 'checks', 'review']),
    entry('sign-off', { override: { choice: 'approve', at: 1, integration: 'merge' } }),
  ],
  integration: { mode: 'merge', status: 'integrating', at: 2 },
})

/** Signed off and finished. */
const DONE = run('run-onboarding', 'Onboarding checklist', {
  status: 'succeeded',
  ledger: passed(STEPS.map((s) => s.id)),
})

function Frame({ children, width }: { children: ReactNode; width?: number }) {
  return (
    <div
      className="flex flex-col gap-3 overflow-hidden rounded-lg border border-(--border-subtle) bg-(--surface-base) p-3"
      style={width !== undefined ? { width } : undefined}
    >
      {children}
    </div>
  )
}

function Head({ run: r, managerOnIt = false }: { run: ProcessRun; managerOnIt?: boolean }) {
  return (
    <div className="overflow-hidden rounded-lg border border-(--border-subtle)">
      <RunHead
        run={r}
        stopHolder={managerOnIt ? 'manager' : undefined}
        depth={0}
        now={NOW}
        projectName="TheFactory Tools"
        onCrumb={noop}
        onCancel={noop}
      />
    </div>
  )
}

function Strip({ run: r, narrow = false }: { run: ProcessRun; narrow?: boolean }) {
  return (
    <StepsStrip
      model={{ label: STEPS_STRIP_LABELS.steps, entries: processRunStripEntries(r) }}
      narrow={narrow}
    />
  )
}

const runChat = (r: ProcessRun): ChatListRowInput => ({
  chat: { context: processRunChatContext(r), title: `Run: ${r.title}` },
  status: QUIET,
  run: r,
  now: NOW,
})

const STORY_CHAT: ChatListRowInput = {
  chat: { context: { type: 'STORY', projectId: 'p1', storyId: 's4' } },
  status: QUIET,
  work: { title: 'Pricing rules engine', status: 'in_progress', ref: '#4' },
  now: NOW,
}

const DONE_STORY_CHAT: ChatListRowInput = {
  chat: { context: { type: 'STORY', projectId: 'p1', storyId: 's2' } },
  status: QUIET,
  work: { title: 'Onboarding checklist', status: 'done', ref: '#2' },
  now: NOW,
}

const RUNNING_ELSEWHERE: ChatListRowInput = {
  chat: { context: { type: 'STORY', projectId: 'p2', storyId: 's9' } },
  status: QUIET,
  run: run('run-ui', 'Settings search', {
    projectId: 'p2',
    cursor: { stepId: 'spec' } as ProcessRun['cursor'],
    ledger: [...passed(['plan']), entry('spec', { status: 'running', outcome: undefined })],
  }),
  work: { title: 'Settings search', status: 'in_progress', ref: '#9' },
  projectName: 'Overseer',
  now: NOW,
}

const GROUP_CHAT: ChatListRowInput = {
  chat: { context: { type: 'GROUP', groupId: 'g1' } },
  status: QUIET,
  groupName: 'Factory',
  now: NOW,
}

function List({
  inputs,
  scope,
  filter = 'all',
}: {
  inputs: ChatListRowInput[]
  scope: ChatListScope
  filter?: ChatListFilter
}) {
  const sections = chatListSections({
    rows: inputs.map(chatListRow),
    scope,
    filter,
    archived: false,
  })
  return (
    <Frame width={340}>
      {sections.map((section) => (
        <ChatListSectionView
          key={section.id}
          section={section}
          grouped={scope.kind === 'group'}
          look={LOOK}
          badgeColors={BADGE_COLORS}
          onOpen={noop}
        />
      ))}
    </Frame>
  )
}

function Processes() {
  const sections = processRunAttentionSections(
    [RUNNING, MANAGER_ON_IT, AT_SIGN_OFF, NEEDS_YOU, MERGING],
    NOW,
  )
  return (
    <Frame width={320}>
      {sections.map((section) => (
        <RunSection
          key={section.id}
          section={section}
          badgeColor={BADGE_COLORS.processes}
          now={NOW}
          stopNow={NOW}
          chatNews={new Map()}
          selectedRunId={undefined}
          onSelectRun={noop}
        />
      ))}
    </Frame>
  )
}

const TONES: { tone: ProcessStatusTone; label: string }[] = [
  { tone: 'running', label: 'Running' },
  { tone: 'done', label: 'Done' },
  { tone: 'review', label: 'Sign off' },
  { tone: 'working', label: 'Merging' },
  { tone: 'on_hold', label: 'Needs you' },
  { tone: 'stuck', label: 'Failed' },
  { tone: 'blocked', label: 'Blocked' },
  { tone: 'queued', label: 'Starting' },
  { tone: 'empty', label: 'Cancelled' },
]

export const RUNNING_TONE_SCENES: Scene[] = [
  {
    id: 'running-vs-done',
    title: 'Status tones',
    component: 'ToneBadge · RunHead · StepsStrip · ChatList · ProcessRunsView',
    group: 'Process',
    description:
      'Each status in its own hue: running sky blue (an agent at work), sign-off gold (a decision waiting on you), done green, working and merging orange, needs-you purple, failed and blocked red. Gold is yellower than the orange beside it; selections and notes take the brand blue, never a status.',
    states: [
      {
        id: 'tones',
        title: 'Every status tone',
        description:
          'Soft pills, bold pills and dots side by side: running sky blue, done green, sign-off gold, merging orange, needs-you purple, failed and blocked red, starting and cancelled grey — then the brand-blue selection beside gold and orange.',
        render: () => (
          <Frame>
            <div className="flex flex-wrap gap-2">
              {TONES.map((t) => (
                <ToneBadge key={t.tone} tone={t.tone}>
                  {t.label}
                </ToneBadge>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {TONES.map((t) => (
                <span
                  key={t.tone}
                  className="inline-flex items-center rounded-full px-2 py-px text-[11px] font-semibold"
                  style={{
                    background: `var(--status-${t.tone}-bg)`,
                    color: `var(--status-${t.tone}-fg)`,
                  }}
                >
                  {t.label}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {TONES.map((t) => (
                <span
                  key={t.tone}
                  className="inline-flex items-center gap-1.5 text-[11px] text-(--text-secondary)"
                >
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{ background: `var(--status-${t.tone}-bg)` }}
                  />
                  {t.label}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="badge badge--soft badge--accent">Selected</span>
              <span className="badge badge--soft badge--review">Not proven</span>
              <span className="badge badge--soft badge--working">Merging</span>
            </div>
          </Frame>
        ),
      },
      {
        id: 'run-header',
        title: 'Run headers',
        description:
          'Running with three steps done and the fourth at work; a failed check its manager is on, its step drawn as going on; waiting at the sign-off in gold; finished. Only the finished run and the done steps are green.',
        render: () => (
          <Frame>
            <Head run={RUNNING} />
            <Head run={MANAGER_ON_IT} managerOnIt />
            <Head run={AT_SIGN_OFF} />
            <Head run={DONE} />
          </Frame>
        ),
      },
      {
        id: 'steps-strip',
        title: 'Steps strip',
        description:
          'The fold — “✓ 3 done” in green, the step at work in blue with its open ring — wide and narrow, above a finished run’s strip.',
        render: () => (
          <Frame width={720}>
            <Strip run={RUNNING} />
            <Strip run={RUNNING} narrow />
            <Strip run={DONE} />
          </Frame>
        ),
      },
      {
        id: 'chat-list',
        title: 'Chat list rows',
        description:
          'A project’s chats under Runs: Running and Manager on it in blue, Sign off in gold, Done in green. Under All, story chats keep their stored status: In progress in orange, Done in green. Working is kept for a live turn.',
        render: () => (
          <div className="flex flex-col gap-3">
            <List
              scope={{ kind: 'project', projectId: 'p1' }}
              filter="runs"
              inputs={[
                runChat(RUNNING),
                runChat(MANAGER_ON_IT),
                runChat(AT_SIGN_OFF),
                runChat(DONE),
              ]}
            />
            <List
              scope={{ kind: 'project', projectId: 'p1' }}
              inputs={[STORY_CHAT, DONE_STORY_CHAT]}
            />
          </div>
        ),
      },
      {
        id: 'chat-list-group',
        title: 'Group chat list',
        description:
          'A group’s list: the “Running in this group” heading in the running blue; the run’s droplets keep the processes ink.',
        render: () => (
          <List
            scope={{ kind: 'group', groupId: 'g1', projectIds: ['p1', 'p2'] }}
            inputs={[GROUP_CHAT, RUNNING_ELSEWHERE]}
          />
        ),
      },
      {
        id: 'processes-list',
        title: 'Processes list',
        description:
          'The Current tab: Needs you in purple, Sign off in gold, then Running — its heading, dots and spinners in blue, the manager’s stop among them — and Merging in orange.',
        render: () => <Processes />,
      },
    ],
  },
]
