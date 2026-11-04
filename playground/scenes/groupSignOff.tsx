import { useState, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import {
  ApiProvider,
  AppSettingsProvider,
  AuthProvider,
  FilesProvider,
  GROUP_SIGN_OFF_DEFAULT_LAYOUT,
  GROUP_SIGN_OFF_LAYOUT_LABELS,
  GROUP_SIGN_OFF_LAYOUTS,
  GROUP_SIGN_OFF_SUBMITTED_DEFAULT_LAYOUT,
  GROUP_SIGN_OFF_SUBMITTED_LAYOUT_LABELS,
  GROUP_SIGN_OFF_SUBMITTED_LAYOUTS,
  GROUP_SIGN_OFF_TEXT,
  groupSignOffScreen,
  loomWalkthroughView,
  ProjectsProvider,
  SIGN_OFF_OUTPUT_DEFAULT_LAYOUT,
  SIGN_OFF_OUTPUT_LAYOUT_LABELS,
  SIGN_OFF_OUTPUT_LAYOUTS,
  signOffOutputChips,
  signOffSectionKey,
  type GroupSignOffData,
  type GroupSignOffLayout,
  type GroupSignOffRepo,
  type GroupSignOffRepoRow,
  type GroupSignOffState,
  type GroupSignOffSubmittedLayout,
  type SignOffOutputActions,
  type SignOffOutputChipView,
  type SignOffOutputDocument,
  type SignOffOutputDraft,
  type SignOffOutputLayout,
  type SyncKVStorage,
} from 'thefactory-ui/headless'
import {
  Button,
  CheckChip,
  GroupSignOff,
  LoomWalkthroughPanel,
  SegmentedControl,
  SignOffOutputPanel,
} from 'thefactory-ui/web'
import type { StorySignoffExtraChip } from '../../src/web/compound/process/StorySignoffReview'
import type { Scene, SceneState } from '../showcase/types'

const noop = () => {}
const refused = async () => false
const page = (node: ReactNode) => (
  <MemoryRouter>
    <div className="w-[1020px] max-w-full p-4">{node}</div>
  </MemoryRouter>
)

const MEMORY: SyncKVStorage = { get: () => null, set: noop }
const NO_TOKEN = { read: () => null, write: noop }

/** Signed out with no backend: the note box reads no files, so it draws only what it is given. */
const withFiles = (node: ReactNode) => (
  <AuthProvider storage={NO_TOKEN}>
    <ApiProvider apiBaseUrl={null} wsBaseUrl={null} client="web">
      <AppSettingsProvider storage={MEMORY}>
        <ProjectsProvider>
          <FilesProvider>{page(node)}</FilesProvider>
        </ProjectsProvider>
      </AppSettingsProvider>
    </ApiProvider>
  </AuthProvider>
)

const BE_PR = `Title: ENG-214 Show the renewal date on the plan page

## What changed
- \`GET /plans/:id\` returns \`renewsOn\`.
- Plans with no renewal date return \`null\`.

## Ticket
{{ticket}}

## Proof
Tests pass. See the walkthrough: {{loom}}`

const WEB_PR = `Title: ENG-214 Renewal date on the plan page

## What changed
- The plan page shows "Renews on 14 March".
- It says nothing when a plan has no date.

## Needs first
{{pr:acme-be}}

## Ticket
{{ticket}}`

const SLACK = `:rocket: *ENG-214 Renewal date on the plan page* is ready for review

Ticket: {{ticket}}
Backend: {{pr:acme-be}}
Web: {{pr:acme-web}}
Walkthrough: {{loom}}

Merge the backend first, then the web.`

const SLACK_FILLED = `:rocket: *ENG-214 Renewal date on the plan page* is ready for review

Ticket: https://acme.atlassian.net/browse/ENG-214
Backend: https://github.com/acme/acme-be/pull/481
Web: https://github.com/acme/acme-web/pull/1207
Walkthrough: https://www.loom.com/share/8c1d2f

Merge the backend first, then the web.`

const repo = (
  projectId: string,
  title: string,
  over: Partial<GroupSignOffRepo> = {},
): GroupSignOffRepo => ({
  legId: projectId,
  projectId,
  title,
  status: 'at-sign-off',
  runId: `run-${projectId}`,
  branch: `factory/eng-214-${projectId}`,
  baseRef: 'main',
  evidence: [],
  pullRequest: {
    state: 'to-open',
    title: `ENG-214 ${title}`,
    files: ['a.ts', 'b.ts', 'c.ts', 'd.ts'],
    generated: [],
  },
  ...over,
})

const BE = repo('acme-be', 'Return the renewal date')
const WEB = repo('acme-web', 'Renewal date on the plan page', {
  pullRequest: {
    state: 'to-open',
    title: 'ENG-214 Renewal date on the plan page',
    files: ['plan.tsx', 'plan.css'],
    generated: ['api.gen.ts'],
  },
})
const SDK = repo('acme-sdk', 'Regenerate the client', {
  pullRequest: {
    state: 'left-out',
    leftOut: 'Only generated files changed, so it needs no pull request.',
    files: [],
    generated: ['client.gen.ts'],
  },
})

const OUTPUTS: GroupSignOffData['outputs'] = [
  {
    label: 'PR Text',
    perRepo: true,
    sections: [
      { projectId: 'acme-be', evidenceId: 'pr-be' },
      { projectId: 'acme-web', evidenceId: 'pr-web' },
    ],
  },
  {
    label: 'Slack Message',
    perRepo: false,
    sections: [{ projectId: 'acme-be', evidenceId: 'slack' }],
  },
]

const doc = (
  evidenceId: string,
  label: string,
  projectId: string,
  text: string,
): SignOffOutputDocument => ({ evidenceId, projectId, label, text, editable: true })

const DOCUMENTS = {
  'pr-be': doc('pr-be', 'PR Text', 'acme-be', BE_PR),
  'pr-web': doc('pr-web', 'PR Text', 'acme-web', WEB_PR),
  slack: doc('slack', 'Slack Message', 'acme-be', SLACK),
}

const WALKTHROUGH: GroupSignOffData['walkthrough'] = [
  {
    id: 'renewal',
    projectId: 'acme-web',
    evidenceId: 'loom-1',
    title: 'The renewal date on a live plan',
    open: 'The staging app, signed in as a paying customer',
    steps: ['Open the plan page', 'Point at the renewal date', 'Open a plan with no date'],
    mustShow: ['"Renews on" with a date', 'No line on the plan with no date'],
  },
]

const data = (over: Partial<GroupSignOffData> = {}): GroupSignOffData => ({
  groupRunId: 'group-run',
  title: 'Renewal date on the plan page',
  status: 'parked',
  canDecide: true,
  canRetry: false,
  canEditOutputs: true,
  tickets: [
    {
      provider: 'jira',
      externalId: 'ENG-214',
      url: 'https://acme.atlassian.net/browse/ENG-214',
      title: 'Renewal date on the plan page',
    },
  ],
  repos: [BE, WEB],
  outputs: OUTPUTS,
  goingLive: {
    steps: [],
    words: 'Merge acme-be first, then acme-web.',
  },
  walkthrough: [],
  attachments: [],
  ...over,
})

const state = (over: Partial<GroupSignOffState> = {}): GroupSignOffState => ({
  data: undefined,
  readError: null,
  acting: undefined,
  actionError: null,
  documents: DOCUMENTS,
  documentErrors: {},
  drafts: {},
  saving: [],
  fetches: {},
  ...over,
})

const nameOf = (id: string) => id

const actions: SignOffOutputActions = {
  startEdit: noop,
  changeDraft: noop,
  cancelEdit: noop,
  saveDraft: refused,
  keepEdit: refused,
}

const chipsOf = (view: GroupSignOffData, held: GroupSignOffState): SignOffOutputChipView[] =>
  signOffOutputChips(view, held, nameOf)

/** A repo's own chips as its sign-off draws them, the output chips set beside them. */
function RepoEvidence({
  repo: shown,
  chips,
  opens,
}: {
  repo: GroupSignOffRepoRow
  chips: readonly StorySignoffExtraChip[]
  opens: string | undefined
}) {
  const [picked, setPicked] = useState(opens)
  const check = (id: 'report' | 'tests' | 'lint' | 'build', label: string) => ({
    id,
    label,
    state: 'passed' as const,
  })
  const own = [
    check('report', 'Report'),
    check('tests', 'Tests'),
    check('lint', 'Lint'),
    check('build', 'Build'),
  ]
  const open = chips.find((c) => c.key === picked)
  return (
    <section className="overflow-hidden rounded-xl border border-(--border-subtle) bg-(--surface-raised)">
      <div
        role="tablist"
        className="flex flex-wrap items-center gap-2 border-b border-(--border-subtle) px-5 py-3.5"
      >
        {own.map((row) => (
          <CheckChip
            key={row.id}
            row={row}
            role="tab"
            selected={!open && (picked ?? 'report') === row.id}
            onClick={() => setPicked(row.id)}
          />
        ))}
        {chips.map((chip) => (
          <CheckChip
            key={chip.key}
            row={chip.row}
            role="tab"
            selected={chip === open}
            onClick={() => setPicked(chip.key)}
          />
        ))}
      </div>
      <div className="flex flex-col px-5 pb-5 pt-2">
        {open ? (
          open.content
        ) : (
          <p className="pt-3 text-[12.5px] text-(--text-secondary)">
            {shown.storyTitle}: the report, tests and checks of {shown.name}, as on its run.
          </p>
        )}
      </div>
    </section>
  )
}

const evidenceOpening =
  (opens?: string) =>
  (shown: GroupSignOffRepoRow, chips: readonly StorySignoffExtraChip[]): ReactNode => (
    <RepoEvidence key={shown.legId} repo={shown} chips={chips} opens={opens} />
  )

type Board = {
  view?: GroupSignOffData
  held?: GroupSignOffState
  layout?: GroupSignOffLayout
  outputLayout?: SignOffOutputLayout
  submittedLayout?: GroupSignOffSubmittedLayout
  opens?: string
  loom?: ReactNode
  acting?: string
  actionError?: string
  requesting?: boolean
}

function signOffBoard({
  view = data(),
  held = state(),
  layout,
  outputLayout,
  submittedLayout,
  opens,
  loom,
  acting,
  actionError,
  requesting,
}: Board) {
  return (
    <GroupSignOff
      screen={groupSignOffScreen(view, held, nameOf)}
      outputs={chipsOf(view, held)}
      outputActions={actions}
      onDecide={refused}
      onRetry={refused}
      onDownload={noop}
      onOpenRun={noop}
      renderEvidence={evidenceOpening(opens)}
      {...(layout ? { layout } : {})}
      {...(outputLayout ? { outputLayout } : {})}
      {...(submittedLayout ? { submittedLayout } : {})}
      {...(loom ? { loom } : {})}
      {...(acting ? { acting } : {})}
      {...(actionError ? { actionError } : {})}
      {...(requesting ? { requesting } : {})}
    />
  )
}

const output = (label: string, view = data(), held = state()): SignOffOutputChipView['panel'] => {
  const chip = chipsOf(view, held).find((c) => c.panel.label === label)
  if (!chip) throw new Error(`no output ${label}`)
  return chip.panel
}

const PR_BE_KEY = signOffSectionKey('PR Text', 'acme-be')

const editing = (draft: Partial<SignOffOutputDraft> = {}, over: Partial<GroupSignOffState> = {}) =>
  state({
    drafts: {
      [PR_BE_KEY]: {
        text: BE_PR.replace('Tests pass.', 'Tests pass on staging too.'),
        baseEvidenceId: 'pr-be',
        ...draft,
      },
    },
    ...over,
  })

function Panel({
  view = data(),
  held = state(),
  label = 'PR Text',
  layout,
}: {
  view?: GroupSignOffData
  held?: GroupSignOffState
  label?: string
  layout?: SignOffOutputLayout
}) {
  return (
    <SignOffOutputPanel
      view={output(label, view, held)}
      actions={actions}
      {...(layout ? { layout } : {})}
    />
  )
}

function Choose<T extends string>({
  options,
  labels,
  initial,
  label,
  board,
}: {
  options: readonly T[]
  labels: Record<T, string>
  initial: T
  label: string
  board: (layout: T) => ReactNode
}) {
  const [layout, setLayout] = useState(initial)
  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        size="sm"
        ariaLabel={label}
        value={layout}
        onChange={(v) => setLayout(v as T)}
        options={options.map((id) => ({ value: id, label: labels[id] }))}
        className="w-fit"
      />
      {board(layout)}
    </div>
  )
}

const OPENED = (url: string, title: string): Pick<GroupSignOffRepo, 'status' | 'pullRequest'> => ({
  status: 'integrated',
  pullRequest: { state: 'opened', title, url },
})

const BE_OPENED = {
  ...BE,
  ...OPENED('https://github.com/acme/acme-be/pull/481', 'ENG-214 Return the renewal date'),
}
const WEB_OPENED = {
  ...WEB,
  ...OPENED('https://github.com/acme/acme-web/pull/1207', 'ENG-214 Renewal date on the plan page'),
}
const SDK_LEFT = {
  ...SDK,
  status: 'skipped' as const,
  pullRequest: { state: 'left-out' as const, leftOut: SDK.pullRequest.leftOut! },
}

const ATTACHMENTS: GroupSignOffData['attachments'] = [
  {
    evidenceId: 'shot-1',
    projectId: 'acme-web',
    kind: 'screenshot',
    name: 'Plan page, with the renewal date',
    mediaType: 'image/png',
    downloadPath: '/projects/acme-web/review-evidence/shot-1/content?download=true',
  },
  {
    evidenceId: 'video-1',
    projectId: 'acme-web',
    kind: 'recording',
    name: 'Walkthrough of the plan page',
    mediaType: 'video/mp4',
    downloadPath: '/projects/acme-web/review-evidence/video-1/content?download=true',
  },
  {
    evidenceId: 'log-1',
    projectId: 'acme-be',
    kind: 'file',
    name: 'contract-tests.txt',
    mediaType: 'text/plain',
    downloadPath: '/projects/acme-be/review-evidence/log-1/content?download=true',
  },
  {
    evidenceId: 'loom-1-result',
    projectId: 'acme-web',
    kind: 'link',
    name: 'The renewal date on a live plan',
    url: 'https://www.loom.com/share/8c1d2f',
  },
]

const submitted = (over: Partial<GroupSignOffData> = {}) =>
  data({
    status: 'succeeded',
    canDecide: false,
    canEditOutputs: false,
    repos: [BE_OPENED, WEB_OPENED, SDK_LEFT],
    attachments: ATTACHMENTS,
    ...over,
  })

const FILLED = state({
  documents: {
    ...DOCUMENTS,
    slack: doc('slack', 'Slack Message', 'acme-be', SLACK_FILLED),
  },
})

const PARTLY_FAILED = submitted({
  status: 'parked',
  canRetry: true,
  repos: [
    BE_OPENED,
    {
      ...WEB,
      status: 'integration-failed',
      pullRequest: {
        state: 'failed',
        title: 'ENG-214 Renewal date on the plan page',
        error: 'GitHub refused the push: the token has no write access to acme-web.',
      },
    },
  ],
})

const loomPanel = () => {
  const view = loomWalkthroughView({ items: WALKTHROUGH, sending: {}, errors: {} })
  return view ? (
    <LoomWalkthroughPanel view={view} attachLink={refused} attachFile={refused} />
  ) : null
}

const outputLayoutStates: SceneState[] = SIGN_OFF_OUTPUT_LAYOUTS.map((layout) => ({
  id: `layout-${layout}`,
  title: SIGN_OFF_OUTPUT_LAYOUT_LABELS[layout],
  render: () => page(signOffBoard({ opens: 'output-PR Text', outputLayout: layout })),
}))

const signOffLayoutStates: SceneState[] = GROUP_SIGN_OFF_LAYOUTS.map((layout) => ({
  id: `layout-${layout}`,
  title: GROUP_SIGN_OFF_LAYOUT_LABELS[layout],
  render: () => page(signOffBoard({ view: data({ repos: [BE, WEB, SDK] }), layout })),
}))

const submittedLayoutStates: SceneState[] = GROUP_SIGN_OFF_SUBMITTED_LAYOUTS.map((layout) => ({
  id: `layout-${layout}`,
  title: GROUP_SIGN_OFF_SUBMITTED_LAYOUT_LABELS[layout],
  render: () => page(signOffBoard({ view: submitted(), held: FILLED, submittedLayout: layout })),
}))

export const GROUP_SIGN_OFF_SCENES: Scene[] = [
  {
    id: 'sign-off-outputs',
    title: 'PR Text and Slack Message chips at sign-off',
    component: 'SignOffOutputPanel',
    group: 'Process',
    wide: true,
    description:
      'A group’s outputs as chips beside Report, Tests, Lint and Build: read, edit and copy. PR Text has a section per repo. Unfilled placeholders stand out, and an edit is never lost to a read of the sign-off. Three layouts to pick from; stacked ships.',
    states: [
      {
        id: 'choose-layout',
        title: 'Pick a layout',
        description: 'The sections of PR Text, with the switch above them.',
        render: () =>
          page(
            <Choose
              options={SIGN_OFF_OUTPUT_LAYOUTS}
              labels={SIGN_OFF_OUTPUT_LAYOUT_LABELS}
              initial={SIGN_OFF_OUTPUT_DEFAULT_LAYOUT}
              label="Layout"
              board={(layout) => <Panel key={layout} layout={layout} />}
            />,
          ),
      },
      ...outputLayoutStates,
      {
        id: 'slack-message',
        title: 'Slack Message, placeholders still to fill',
        description: 'They fill when the pull requests open; until then they stand out.',
        render: () => page(signOffBoard({ opens: 'output-Slack Message' })),
      },
      {
        id: 'all-filled',
        title: 'Every placeholder filled',
        description: 'The chip passes and nothing stands out.',
        render: () => page(<Panel label="Slack Message" held={FILLED} />),
      },
      {
        id: 'editing',
        title: 'An edit',
        render: () => page(<Panel held={editing()} />),
      },
      {
        id: 'edit-empty',
        title: 'An edit with nothing in it',
        description: 'Said before anything is sent.',
        render: () => page(<Panel held={editing({ text: '' })} />),
      },
      {
        id: 'edit-saving',
        title: 'An edit saving',
        render: () => page(<Panel held={editing({}, { saving: [PR_BE_KEY] })} />),
      },
      {
        id: 'edit-failed',
        title: 'An edit that did not save',
        description: 'The reason, and the text kept.',
        render: () =>
          page(<Panel held={editing({ error: 'The backend is temporarily unavailable.' })} />),
      },
      {
        id: 'edit-document-moved',
        title: 'The document moved on under an edit',
        description:
          'A fill or another client changed it. The person’s text stays, the new text shows below it, and they choose.',
        render: () =>
          page(
            <Panel
              view={data({
                outputs: [
                  {
                    label: 'PR Text',
                    perRepo: true,
                    sections: [{ projectId: 'acme-be', evidenceId: 'pr-be-2' }],
                  },
                ],
              })}
              held={editing(
                { notice: 'changed' },
                {
                  documents: {
                    ...DOCUMENTS,
                    'pr-be-2': doc(
                      'pr-be-2',
                      'PR Text',
                      'acme-be',
                      BE_PR.replace('{{ticket}}', 'https://acme.atlassian.net/browse/ENG-214'),
                    ),
                  },
                },
              )}
            />,
          ),
      },
      {
        id: 'edit-decided',
        title: 'The sign-off was decided under an edit',
        description: 'It can no longer be saved. The text stays, to copy.',
        render: () =>
          page(
            <Panel view={data({ canEditOutputs: false })} held={editing({ notice: 'closed' })} />,
          ),
      },
      {
        id: 'not-written',
        title: 'A section not written yet',
        description: 'One repo’s text is still to come: the chip says so and has no pass mark.',
        render: () =>
          page(
            signOffBoard({
              opens: 'output-PR Text',
              view: data({
                outputs: [
                  {
                    label: 'PR Text',
                    perRepo: true,
                    sections: [
                      { projectId: 'acme-be', evidenceId: 'pr-be' },
                      { projectId: 'acme-web' },
                    ],
                  },
                ],
              }),
            }),
          ),
      },
      {
        id: 'read-failed',
        title: 'A section that could not be read',
        render: () =>
          page(
            <Panel
              held={state({
                documents: { 'pr-web': DOCUMENTS['pr-web'] },
                documentErrors: { [PR_BE_KEY]: 'The backend is temporarily unavailable.' },
              })}
            />,
          ),
      },
      {
        id: 'read-only',
        title: 'After the decision',
        description: 'Read and copy; no Edit.',
        render: () =>
          page(
            <Panel view={data({ canEditOutputs: false })} held={state()} label="Slack Message" />,
          ),
      },
    ],
    controls: [
      {
        id: 'layout',
        label: 'Layout',
        kind: 'choice',
        options: SIGN_OFF_OUTPUT_LAYOUTS.map((id) => ({
          id,
          label: SIGN_OFF_OUTPUT_LAYOUT_LABELS[id],
        })),
        default: SIGN_OFF_OUTPUT_DEFAULT_LAYOUT,
      },
    ],
    presets: SIGN_OFF_OUTPUT_LAYOUTS.map((id) => ({
      id,
      name: SIGN_OFF_OUTPUT_LAYOUT_LABELS[id],
      values: { layout: id },
    })),
    play: (values) => page(<Panel layout={(values.layout ?? 'stacked') as SignOffOutputLayout} />),
  },
  {
    id: 'group-sign-off',
    title: 'One sign-off for the ticket',
    component: 'GroupSignOff',
    group: 'Process',
    wide: true,
    description:
      'The sign-off of a run built on branches: every repo’s evidence and one decision. It says which repos get a pull request, why any are left out, and the order they go live in. Three layouts to pick from; one repo at a time ships.',
    states: [
      {
        id: 'choose-layout',
        title: 'Pick a layout',
        description: 'The three layouts on one board, with the switch above them.',
        render: () =>
          page(
            <Choose
              options={GROUP_SIGN_OFF_LAYOUTS}
              labels={GROUP_SIGN_OFF_LAYOUT_LABELS}
              initial={GROUP_SIGN_OFF_DEFAULT_LAYOUT}
              label="Layout"
              board={(layout) => signOffBoard({ view: data({ repos: [BE, WEB, SDK] }), layout })}
            />,
          ),
      },
      ...signOffLayoutStates,
      {
        id: 'no-outputs',
        title: 'A group with no outputs',
        description: 'Report, Tests, Lint and Build alone.',
        render: () => page(signOffBoard({ view: data({ outputs: [] }) })),
      },
      {
        id: 'nothing-to-open',
        title: 'No repo needs a pull request',
        render: () =>
          page(signOffBoard({ view: data({ repos: [SDK], goingLive: { steps: [], words: '' } }) })),
      },
      {
        id: 'unread-repo',
        title: 'A repo whose change could not be read',
        description: 'It is never left out on a guess: approving stops on it.',
        render: () =>
          page(
            signOffBoard({
              view: data({
                repos: [
                  BE,
                  {
                    ...WEB,
                    pullRequest: {
                      state: 'unread',
                      error: 'acme-web has no checkout here, so its change cannot be read.',
                    },
                  },
                ],
              }),
            }),
          ),
      },
      {
        id: 'loom-left',
        title: 'A recording still to make',
        render: () => page(signOffBoard({ view: data({ walkthrough: WALKTHROUGH }) })),
      },
      {
        id: 'request-changes',
        title: 'Request changes',
        description: 'Names the repo, as only one goes back.',
        render: () => withFiles(signOffBoard({ requesting: true })),
      },
      {
        id: 'unsaved-edit',
        title: 'An edit not saved',
        description: 'The decision waits for it, as a pull request opens from what is saved.',
        render: () => page(signOffBoard({ held: editing(), opens: 'output-PR Text' })),
      },
      {
        id: 'deciding',
        title: 'The decision on its way',
        render: () => page(signOffBoard({ acting: 'approve' })),
      },
      {
        id: 'refused',
        title: 'A decision refused',
        description: 'The backend’s reason, where it was taken.',
        render: () =>
          page(
            signOffBoard({
              actionError: 'This group run is not ready for its sign-off — waiting on acme-web.',
            }),
          ),
      },
      {
        id: 'building',
        title: 'Repos still working',
        description: 'A line above the repos; the sign-off opens once they all finish.',
        render: () =>
          page(
            signOffBoard({
              view: data({
                status: 'running',
                canDecide: false,
                repos: [BE, { ...WEB, status: 'running', pullRequest: { state: 'waiting' } }],
              }),
            }),
          ),
      },
      {
        id: 'ended',
        title: 'Rejected',
        render: () =>
          page(
            signOffBoard({
              view: data({
                status: 'succeeded',
                canDecide: false,
                canEditOutputs: false,
                repos: [{ ...BE, status: 'rejected', pullRequest: { state: 'waiting' } }],
              }),
            }),
          ),
      },
      {
        id: 'leg-page',
        title: 'A repo’s own run page',
        description:
          'No Approve: it points to the group sign-off. Request changes and Reject still work there.',
        render: () =>
          page(
            <div
              role="note"
              className="flex flex-wrap items-center gap-2 rounded-lg border border-(--status-review-soft-border) bg-(--status-review-soft-bg) px-3 py-2.5 text-[13px] text-(--text-primary)"
            >
              <span className="font-medium">{GROUP_SIGN_OFF_TEXT.held}</span>
              <Button size="sm" variant="secondary" className="ml-auto gap-1.5">
                {GROUP_SIGN_OFF_TEXT.openGroup}
              </Button>
            </div>,
          ),
      },
    ],
    controls: [
      {
        id: 'layout',
        label: 'Layout',
        kind: 'choice',
        options: GROUP_SIGN_OFF_LAYOUTS.map((id) => ({
          id,
          label: GROUP_SIGN_OFF_LAYOUT_LABELS[id],
        })),
        default: GROUP_SIGN_OFF_DEFAULT_LAYOUT,
      },
    ],
    presets: GROUP_SIGN_OFF_LAYOUTS.map((id) => ({
      id,
      name: GROUP_SIGN_OFF_LAYOUT_LABELS[id],
      values: { layout: id },
    })),
    play: (values) =>
      page(
        signOffBoard({
          view: data({ repos: [BE, WEB, SDK] }),
          layout: (values.layout ?? GROUP_SIGN_OFF_DEFAULT_LAYOUT) as GroupSignOffLayout,
        }),
      ),
  },
  {
    id: 'group-sign-off-submitted',
    title: 'After submitting',
    component: 'GroupSignOff',
    group: 'Process',
    wide: true,
    description:
      'What the one sign-off came to: the pull request links, the finished Slack Message with Copy, and what to attach, each one downloadable. Slack stays manual. Three layouts to pick from; in order ships.',
    states: [
      {
        id: 'choose-layout',
        title: 'Pick a layout',
        description: 'The three layouts on one board, with the switch above them.',
        render: () =>
          page(
            <Choose
              options={GROUP_SIGN_OFF_SUBMITTED_LAYOUTS}
              labels={GROUP_SIGN_OFF_SUBMITTED_LAYOUT_LABELS}
              initial={GROUP_SIGN_OFF_SUBMITTED_DEFAULT_LAYOUT}
              label="Layout"
              board={(layout) =>
                signOffBoard({ view: submitted(), held: FILLED, submittedLayout: layout })
              }
            />,
          ),
      },
      ...submittedLayoutStates,
      {
        id: 'opening',
        title: 'Still opening',
        description: 'Approval runs repo by repo: this page follows it.',
        render: () =>
          page(
            signOffBoard({
              view: submitted({
                status: 'running',
                repos: [BE_OPENED, { ...WEB, pullRequest: { state: 'opening' } }],
              }),
            }),
          ),
      },
      {
        id: 'partly-failed',
        title: 'One pull request failed',
        description: 'What opened stays open; Try again goes for the rest.',
        render: () => page(signOffBoard({ view: PARTLY_FAILED })),
      },
      {
        id: 'retrying',
        title: 'Trying again',
        render: () => page(signOffBoard({ view: PARTLY_FAILED, acting: 'retry' })),
      },
      {
        id: 'by-hand',
        title: 'A host with no API',
        description: 'Its compare link is the way to open it.',
        render: () =>
          page(
            signOffBoard({
              view: submitted({
                repos: [
                  BE_OPENED,
                  {
                    ...WEB,
                    pullRequest: {
                      state: 'by-hand',
                      compareUrl:
                        'https://git.acme.example/acme-web/compare/main...factory/eng-214-web',
                    },
                  },
                ],
              }),
            }),
          ),
      },
      {
        id: 'still-to-record',
        title: 'A recording still to make',
        description: 'The post keeps its placeholder until it is there.',
        render: () =>
          page(
            signOffBoard({
              view: submitted({ walkthrough: WALKTHROUGH }),
              held: state({
                documents: {
                  ...DOCUMENTS,
                  slack: doc(
                    'slack',
                    'Slack Message',
                    'acme-be',
                    SLACK_FILLED.replace('https://www.loom.com/share/8c1d2f', '{{loom}}'),
                  ),
                },
              }),
              loom: loomPanel(),
            }),
          ),
      },
      {
        id: 'download-failed',
        title: 'A file that could not be fetched',
        render: () =>
          page(
            signOffBoard({
              view: submitted(),
              held: state({
                ...FILLED,
                fetches: {
                  'video-1': { busy: false, error: 'Not found on the backend.' },
                  'shot-1': { busy: true },
                },
              }),
            }),
          ),
      },
      {
        id: 'nothing-to-attach',
        title: 'Nothing to attach',
        render: () => page(signOffBoard({ view: submitted({ attachments: [] }), held: FILLED })),
      },
    ],
    controls: [
      {
        id: 'layout',
        label: 'Layout',
        kind: 'choice',
        options: GROUP_SIGN_OFF_SUBMITTED_LAYOUTS.map((id) => ({
          id,
          label: GROUP_SIGN_OFF_SUBMITTED_LAYOUT_LABELS[id],
        })),
        default: GROUP_SIGN_OFF_SUBMITTED_DEFAULT_LAYOUT,
      },
    ],
    presets: GROUP_SIGN_OFF_SUBMITTED_LAYOUTS.map((id) => ({
      id,
      name: GROUP_SIGN_OFF_SUBMITTED_LAYOUT_LABELS[id],
      values: { layout: id },
    })),
    play: (values) =>
      page(
        signOffBoard({
          view: submitted(),
          held: FILLED,
          submittedLayout: (values.layout ??
            GROUP_SIGN_OFF_SUBMITTED_DEFAULT_LAYOUT) as GroupSignOffSubmittedLayout,
        }),
      ),
  },
]
