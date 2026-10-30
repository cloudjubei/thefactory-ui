import type { ReactNode } from 'react'
import {
  ApiProvider,
  AppSettingsProvider,
  AuthProvider,
  CliConfigsProvider,
  GitCredentialsProvider,
  GitProvider,
  ProjectsProvider,
  StoriesProvider,
  type PendingQuestionGrant,
  type PendingToolGrant,
  type SyncKVStorage,
} from 'thefactory-ui/headless'
import { ToolCallCard, type ToolCallCardProps } from 'thefactory-ui/web'
// Not on the package's public surface: the chat renders them itself. The showcase reaches into
// the source for them, as the playground renders the library from source anyway.
import AgentQuestionCard from '../../src/web/compound/chat/AgentQuestionCard'
import ApprovalPanel from '../../src/web/compound/chat/ApprovalPanel'
import CredentialCaptureCard from '../../src/web/compound/chat/CredentialCaptureCard'
import type { CredentialCapture } from '../../src/headless/utils/credentialCaptureTypes'
import type { Scene } from '../showcase/types'

const noop = () => {}
const never = () => new Promise<void>(noop)

const MEMORY: SyncKVStorage = { get: () => null, set: noop }

/**
 * What the chat's cards read around them — the project, its stories, its git — with no backend:
 * no address to reach and no token, so nothing is fetched and every list is empty.
 */
function Offline({ children }: { children: ReactNode }) {
  return (
    <AuthProvider storage={{ read: () => null, write: noop }}>
      <ApiProvider apiBaseUrl={null} wsBaseUrl={null} client="web">
        <AppSettingsProvider storage={MEMORY}>
          <ProjectsProvider>
            <GitCredentialsProvider>
              <GitProvider storage={MEMORY}>
                <StoriesProvider>{children}</StoriesProvider>
              </GitProvider>
            </GitCredentialsProvider>
          </ProjectsProvider>
        </AppSettingsProvider>
      </ApiProvider>
    </AuthProvider>
  )
}

/** A column of a turn's rows, as the chat lays them out. */
function Rows({ rows }: { rows: ToolCallCardProps[] }) {
  return (
    <Offline>
      <div className="flex max-w-2xl flex-col gap-2">
        {rows.map((row) => (
          <ToolCallCard key={String(row.toolCall.toolCallId)} {...row} />
        ))}
      </div>
    </Offline>
  )
}

/** A grant whose decision goes nowhere — the row stays as it is drawn. */
function ask(
  id: string,
  toolName: string,
  args: Record<string, unknown>,
  detail: unknown,
  extra: Partial<PendingToolGrant> = {},
): PendingToolGrant {
  return {
    id,
    chatRunner: 'cli',
    label: toolName,
    toolName,
    args,
    detail: { tool: toolName, args, detail },
    alwaysAllowScopes: [],
    grantCovers: 'exact-call',
    inline: true,
    decide: never,
    ...extra,
  }
}

/** The row of a call waiting on `grant`, decided on the row: its toggle off, its card shut or open. */
function row(grant: PendingToolGrant, open = false): ToolCallCardProps {
  const scopes = grant.alwaysAllowScopes ?? []
  return {
    toolCall: {
      toolCallId: `t-${grant.id}`,
      name: grant.toolName ?? grant.label,
      arguments: grant.args,
      approvalId: grant.id,
    },
    resultType: 'require_confirmation',
    selectable: true,
    selected: false,
    onToggleSelect: noop,
    ...(scopes.length > 0
      ? {
          alwaysAllowScopes: scopes,
          grantCovers: grant.grantCovers ?? 'exact-call',
          onAlwaysAllow: noop,
        }
      : {}),
    ask: grant,
    askOpen: open,
  }
}

const HOST_FILE = ask(
  'host-file',
  'requestHostFileRead',
  { path: '~/Downloads/crash.log', reason: 'The crash log you mentioned is outside the project.' },
  { path: '/Users/me/Downloads/crash.log', size: '18 KB', sizeBytes: 18432, lines: 'lines 1–200' },
)

const NETWORK = ask(
  'network',
  'requestNetworkUnlock',
  { host: 'registry.npmjs.org', reason: 'npm install needs the registry.' },
  undefined,
  { alwaysAllowScopes: ['chat', 'everywhere'], trustableSite: 'registry.npmjs.org' },
)

const COMMIT = ask(
  'commit',
  'commitGitChanges',
  {
    paths: ['src/showcase/registry.ts', 'src/showcase/scenes/askRows.tsx'],
    message: 'Showcase the asks decided on their rows',
    reason: 'The scenes are written and the registry test passes.',
  },
  {
    operation: 'commit',
    headline: 'Commit 2 files to work/showcase-asks',
    projectId: 'thefactory-ui',
    repoPath: '/Users/me/thefactory-ui',
    branch: 'work/showcase-asks',
    warning: 'This changes your real repository at /Users/me/thefactory-ui',
    identity: { name: 'Overseer', email: 'overseer@example.com' },
    message: 'Showcase the asks decided on their rows',
    edits: [
      {
        arg: 'message',
        label: 'Commit message',
        value: 'Showcase the asks decided on their rows',
        multiline: true,
        required: true,
      },
    ],
    diff: {
      files: [
        { path: 'src/showcase/registry.ts', status: 'modified' },
        { path: 'src/showcase/scenes/askRows.tsx', status: 'added' },
      ],
      patch: [
        'diff --git a/src/showcase/registry.ts b/src/showcase/registry.ts',
        '--- a/src/showcase/registry.ts',
        '+++ b/src/showcase/registry.ts',
        '@@ -1,3 +1,4 @@',
        " import { ACCEPTED_UNCHECKED_SCENES } from '../scenes/acceptedUnchecked'",
        "+import { ASK_ROW_SCENES } from '../scenes/askRows'",
        " import { ACTIVITY_STOP_SCENES } from '../scenes/activityStop'",
        'diff --git a/src/showcase/scenes/askRows.tsx b/src/showcase/scenes/askRows.tsx',
        'new file mode 100644',
        '--- /dev/null',
        '+++ b/src/showcase/scenes/askRows.tsx',
        '@@ -0,0 +1,2 @@',
        "+import type { Scene } from '../showcase/types'",
        '+export const ASK_ROW_SCENES: Scene[] = []',
      ].join('\n'),
      patchTruncated: false,
    },
    facts: ['On top of 4f2a9c1 — Mobile parity gaps.'],
  },
)

const STOP_RUN = ask(
  'stop-run',
  'stopProcessRun',
  { runId: 'run-7b3e', reason: 'You said to stop the rules audit; it is on the wrong branch.' },
  { runTitle: 'WarGames — rules audit, round 2' },
)

const REMOVE_PROJECT = ask(
  'remove-project',
  'removeProject',
  { projectId: 'wargames-old', reason: 'You asked to drop the old copy.' },
  "Remove the project 'WarGames (old copy)' from the overseer — its chats, runs and stories go with it",
)

const DELETE_SCREEN = ask(
  'delete-screen',
  'deleteDesignScreen',
  { screenId: 'scr-eval', reason: 'It repeats the Evaluation screen of the Viewer app.' },
  "Delete the screen 'Evaluation (old)' (3 states, 12 images) from Viewer in project 'thefactory-ui'",
)

const QUESTION: PendingQuestionGrant = {
  id: 'question',
  chatRunner: 'cli',
  label: 'askUser',
  toolName: 'askUser',
  args: {},
  question: {
    question: 'Which branch should the showcase work go on?',
    context: 'work/showcase-asks holds yesterday’s draft; main is clean.',
    options: [
      { label: 'work/showcase-asks', recommended: true },
      { label: 'A new branch from main' },
    ],
  },
  decide: never,
  answer: never,
} as unknown as PendingQuestionGrant

const CREDENTIAL: CredentialCapture = {
  id: 'cap-git',
  purpose: 'Push the showcase branch to GitHub',
  provider: 'git',
  status: 'requested',
  requestedAt: '2026-10-29T09:00:00.000Z',
}

const LAUNCH: PendingToolGrant = {
  id: 'launch',
  chatRunner: 'cli',
  label: 'startFeatureWork',
  toolName: 'startFeatureWork',
  args: { storyId: 's21', reason: 'The story is ready; you asked to start it.' },
  alwaysAllowScopes: [],
  grantCovers: 'exact-call',
  decide: never,
}

/** Sized like the dock it replaces the composer in. */
function Dock({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-2xl rounded-xl border border-(--border-subtle) bg-(--surface-base) p-3">
      {children}
    </div>
  )
}

export const ASK_ROW_SCENES: Scene[] = [
  {
    id: 'tool-call-ask-rows',
    title: 'Asks decided on their rows',
    component: 'ToolCallCard (ask), ToolAskRowCard',
    group: 'Chat',
    description:
      'Every ask a tool call raises is decided on that call’s own row: compact, it reads the card’s headline — the path, the host, the commit, the run — with “Cannot be undone” on a destructive one, a toggle and Always allow where it is offered; a click opens the very card the bottom view showed, which decides it the same way. Several asks in one turn go with one Resume.',
    states: [
      {
        id: 'host-file-read',
        title: 'Read a file on this computer',
        render: () => <Rows rows={[row(HOST_FILE)]} />,
      },
      {
        id: 'host-file-read-open',
        title: 'Read a file on this computer — opened',
        render: () => <Rows rows={[row(HOST_FILE, true)]} />,
      },
      {
        id: 'network-unlock',
        title: 'Reach a host',
        render: () => <Rows rows={[row(NETWORK)]} />,
      },
      {
        id: 'network-unlock-open',
        title: 'Reach a host — opened, with Trust this site',
        render: () => <Rows rows={[row(NETWORK, true)]} />,
      },
      { id: 'git-commit', title: 'Commit', render: () => <Rows rows={[row(COMMIT)]} /> },
      {
        id: 'git-commit-open',
        title: 'Commit — opened, with its diff',
        render: () => <Rows rows={[row(COMMIT, true)]} />,
      },
      { id: 'run-action', title: 'Stop a run', render: () => <Rows rows={[row(STOP_RUN)]} /> },
      {
        id: 'run-action-open',
        title: 'Stop a run — opened',
        render: () => <Rows rows={[row(STOP_RUN, true)]} />,
      },
      {
        id: 'destructive',
        title: 'Remove a project (cannot be undone)',
        render: () => <Rows rows={[row(REMOVE_PROJECT)]} />,
      },
      {
        id: 'destructive-open',
        title: 'Remove a project — opened',
        render: () => <Rows rows={[row(REMOVE_PROJECT, true)]} />,
      },
      {
        id: 'design-delete',
        title: 'Delete a design screen',
        render: () => <Rows rows={[row(DELETE_SCREEN)]} />,
      },
      {
        id: 'design-delete-open',
        title: 'Delete a design screen — opened',
        render: () => <Rows rows={[row(DELETE_SCREEN, true)]} />,
      },
      {
        id: 'several',
        title: 'Several asks in one turn',
        description: 'Each on its own row; the turn’s one Resume decides the toggled ones.',
        render: () => (
          <Rows rows={[row(HOST_FILE), row(NETWORK), row(COMMIT), row(DELETE_SCREEN)]} />
        ),
      },
    ],
  },
  {
    id: 'composer-asks',
    title: 'Asks that keep the bottom view',
    component: 'AgentQuestionCard, CredentialCaptureCard, ApprovalPanel (startFeatureWork)',
    group: 'Chat',
    description:
      'Only a few asks take the composer’s place: a question or a form the person answers (askUser, reportBlocked, a credential or sign-in form) and the launches (startFeatureWork, startGroupWork, acceptProjectFeatureRequest), whose card is where the way the work starts is chosen.',
    states: [
      {
        id: 'ask-user',
        title: 'A question',
        render: () => (
          <Offline>
            <Dock>
              <AgentQuestionCard grant={QUESTION} />
            </Dock>
          </Offline>
        ),
      },
      {
        id: 'credential-form',
        title: 'A credential form',
        description:
          'The form reads the CLI sign-ins it may offer from the backend; with none to answer here, it offers none.',
        render: () => (
          <Offline>
            <CliConfigsProvider>
              <Dock>
                <CredentialCaptureCard capture={CREDENTIAL} onSubmit={never} onCancel={never} />
              </Dock>
            </CliConfigsProvider>
          </Offline>
        ),
      },
      {
        id: 'start-feature-work',
        title: 'Start feature work',
        render: () => (
          <Offline>
            <Dock>
              <ApprovalPanel grant={LAUNCH} onDecideLater={noop} />
            </Dock>
          </Offline>
        ),
      },
    ],
  },
]
