import { useState, type ReactNode } from 'react'
import {
  MCP_SERVERS_LAYOUT_LABELS,
  MCP_SERVERS_LAYOUTS,
  mcpServersIntro,
  mcpServerViews,
  type McpServerDraft,
  type McpServerOwner,
  type McpServerRow,
  type McpServersLayout,
  type McpServerStanding,
  type McpServerTestResult,
} from 'thefactory-ui/headless'
import { McpServerSettingsPanel, SegmentedControl } from 'thefactory-ui/web'
import type { Scene, SceneState } from '../showcase/types'

const noop = () => {}
const refused = async () => undefined
const kept = async () => true

const page = (node: ReactNode) => <div className="w-[720px] max-w-full p-4">{node}</div>
const phone = (node: ReactNode) => <div className="w-[390px] max-w-full p-4">{node}</div>

const PROJECT: McpServerOwner = { kind: 'project', projectId: 'osc-web' }
const GROUP: McpServerOwner = { kind: 'group', groupId: 'osc' }

const ZENOR: McpServerRow = {
  id: 'zenor',
  name: 'Zenor',
  url: 'https://mcp.getzenor.com/mcp',
  authType: 'oauth',
  hasCredential: true,
  source: 'group',
  groupId: 'osc',
}
const LINEAR: McpServerRow = {
  id: 'linear',
  name: 'Linear',
  url: 'https://mcp.linear.app/mcp',
  authType: 'oauth',
  hasCredential: false,
  source: 'project',
}
const SENTRY: McpServerRow = {
  id: 'sentry',
  name: 'Sentry',
  url: 'https://mcp.sentry.dev/mcp',
  authType: 'bearer',
  hasCredential: true,
  source: 'project',
}
const DOCS: McpServerRow = {
  id: 'docs',
  name: 'Docs search',
  url: 'http://localhost:3845/mcp',
  authType: 'none',
  hasCredential: false,
  source: 'project',
}

const tool = (toolName: string, readOnly: boolean, description: string) => ({
  name: `zenor_${toolName}`,
  toolName,
  readOnly,
  description,
})

const ZENOR_STANDING: McpServerStanding = {
  serverId: 'zenor',
  status: 'connected',
  toolCount: 6,
  omittedTools: 0,
  tools: [
    tool('getStatus', true, 'How the environment stands right now.'),
    tool('getUser', true, 'One user by id.'),
    tool('listGoals', true, 'Every goal of a user.'),
    tool('queryTable', true, 'Read rows from a table, with filters.'),
    tool('resendCheckin', false, 'Send a user their check-in again.'),
    tool('pauseUser', false, 'Pause a user’s messages.'),
  ],
}
const LINEAR_STANDING: McpServerStanding = {
  serverId: 'linear',
  status: 'needs-sign-in',
  toolCount: 0,
  omittedTools: 0,
  tools: [],
}
const SENTRY_STANDING: McpServerStanding = {
  serverId: 'sentry',
  status: 'connected',
  toolCount: 2,
  omittedTools: 3,
  tools: [
    {
      name: 'sentry_listIssues',
      toolName: 'listIssues',
      readOnly: true,
      description: 'Open issues in a project.',
    },
    {
      name: 'sentry_resolveIssue',
      toolName: 'resolveIssue',
      readOnly: false,
      description: 'Mark an issue resolved.',
    },
  ],
}
const DOCS_STANDING: McpServerStanding = {
  serverId: 'docs',
  status: 'unreachable',
  reason: 'Connection refused at localhost:3845',
  toolCount: 0,
  omittedTools: 0,
  tools: [],
}

const PROJECT_ROWS = [ZENOR, LINEAR, SENTRY, DOCS]
const GROUP_ROWS = [ZENOR]
const STANDINGS = [ZENOR_STANDING, LINEAR_STANDING, SENTRY_STANDING, DOCS_STANDING]
const GROUP_TITLES = { osc: 'OSC' }

type PanelOptions = {
  owner?: McpServerOwner
  rows?: McpServerRow[]
  standings?: McpServerStanding[]
  checking?: boolean
  statusFailed?: boolean
  tests?: Record<string, McpServerTestResult>
  testing?: string[]
  signIns?: Record<string, string>
  error?: string
  busy?: boolean
  loading?: boolean
  layout?: McpServersLayout
  openId?: string
  draft?: McpServerDraft
  removingId?: string
}

function panel({
  owner = PROJECT,
  rows = PROJECT_ROWS,
  standings = STANDINGS,
  checking = false,
  statusFailed,
  tests,
  testing,
  signIns,
  error,
  busy = false,
  loading = false,
  layout,
  openId,
  draft,
  removingId,
}: PanelOptions = {}) {
  const views = mcpServerViews({
    owner,
    rows,
    standings: checking ? undefined : standings,
    groupTitles: GROUP_TITLES,
    ...(statusFailed ? { statusFailed } : {}),
    ...(tests ? { tests } : {}),
    ...(testing ? { testing } : {}),
    ...(signIns ? { signIns } : {}),
  })
  return (
    <McpServerSettingsPanel
      views={loading ? undefined : views}
      ownRows={rows.filter((row) => owner.kind === 'group' || row.source === 'project')}
      intro={mcpServersIntro(owner, owner.kind === 'group' ? 'OSC' : 'OSC web', 'MAIN')}
      error={error ?? null}
      busy={busy}
      onAdd={refused}
      onRemove={kept}
      onSetToken={kept}
      onSignIn={noop}
      onOpenPage={noop}
      onTest={noop}
      {...(layout ? { layout } : {})}
      {...(openId ? { initialOpenId: openId } : {})}
      {...(draft ? { initialDraft: draft } : {})}
      {...(removingId ? { initialRemovingId: removingId } : {})}
    />
  )
}

/** The three layouts, switched on the board itself. */
function ChooseLayout({ initial = 'rows' }: { initial?: McpServersLayout }) {
  const [layout, setLayout] = useState<McpServersLayout>(initial)
  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        ariaLabel="Layout"
        value={layout}
        onChange={(next) => setLayout(next as McpServersLayout)}
        options={MCP_SERVERS_LAYOUTS.map((value) => ({
          value,
          label: MCP_SERVERS_LAYOUT_LABELS[value],
        }))}
      />
      {panel({ layout, openId: layout === 'rows' ? undefined : 'zenor' })}
    </div>
  )
}

const LAYOUT_DESCRIPTIONS: Record<McpServersLayout, string> = {
  rows: 'The default that ships. One short row per server, the same as Agent types below it: a click opens the server in a window, so a long tool list never pushes the rest of Settings away.',
  folds:
    'A row unfolds in place, one at a time. Nothing covers the page, but an open server pushes Agent types down.',
  cards: 'Every server open at once: all actions in sight with no click, and the longest page.',
}

const layoutStates: SceneState[] = MCP_SERVERS_LAYOUTS.flatMap((layout) => [
  {
    id: `layout-${layout}`,
    title: MCP_SERVERS_LAYOUT_LABELS[layout],
    description: LAYOUT_DESCRIPTIONS[layout],
    render: () => page(panel({ layout, ...(layout === 'folds' ? { openId: 'zenor' } : {}) })),
  },
  {
    id: `layout-${layout}-phone`,
    title: `${MCP_SERVERS_LAYOUT_LABELS[layout]}, on a phone`,
    description: 'The small-screen width: the mobile app’s native section follows this.',
    render: () => phone(panel({ layout, ...(layout === 'folds' ? { openId: 'zenor' } : {}) })),
  },
])

const opened = (id: string, title: string, description: string, options: PanelOptions = {}) => ({
  id,
  title,
  description,
  overlay: true,
  render: () => panel(options),
})

export const MCP_SERVER_SCENES: Scene[] = [
  {
    id: 'mcp-servers',
    title: 'MCP servers in Settings',
    component: 'McpServerSettingsPanel',
    group: 'Settings',
    description:
      'A project’s or a group’s outside MCP servers, in Settings → Project and → Group on all three apps: add one by URL, sign in or set its token, see how it stands and the tools it offers with those that ask, test it, remove it. A project lists the servers it gets from its main group read-only, with where to change them. Three layouts to pick from; rows ship.',
    states: [
      {
        id: 'choose-layout',
        title: 'Pick a layout',
        description: 'The three layouts on one board, with the switch above them.',
        render: () => page(<ChooseLayout />),
      },
      ...layoutStates,
      {
        id: 'group',
        title: 'On a group',
        description: 'A main group’s own server: nothing here is read-only.',
        render: () => page(panel({ owner: GROUP, rows: GROUP_ROWS })),
      },
      {
        id: 'none-yet',
        title: 'No servers yet',
        render: () => page(panel({ rows: [] })),
      },
      {
        id: 'loading',
        title: 'Loading',
        render: () => page(panel({ loading: true })),
      },
      {
        id: 'checking',
        title: 'Status not in yet',
        description: 'The list comes first; the status can take five seconds.',
        render: () => page(panel({ checking: true })),
      },
      {
        id: 'status-failed',
        title: 'Status could not be read',
        render: () => page(panel({ standings: [], statusFailed: true })),
      },
      {
        id: 'read-failed',
        title: 'The list could not be read',
        render: () =>
          page(
            panel({
              rows: [],
              error: 'The backend is temporarily unavailable. Try again in a moment.',
            }),
          ),
      },
      opened(
        'open-connected',
        'A connected server',
        'Its tools, those that ask first; Sign in again stays quiet because it is not needed.',
        { openId: 'zenor', owner: GROUP, rows: GROUP_ROWS },
      ),
      opened('open-needs-sign-in', 'Needs sign-in', 'Sign in is the one thing to do here.', {
        openId: 'linear',
      }),
      opened(
        'open-sign-in-waiting',
        'Sign-in waiting on the browser',
        'The page opened in the browser. If it did not, the link opens it from a real click; the section updates by itself.',
        { openId: 'linear', signIns: { linear: 'https://mcp.linear.app/authorize' } },
      ),
      opened(
        'open-sign-in-refused',
        'A sign-in that cannot start',
        'The 422’s reason, above the details.',
        { openId: 'linear', error: 'The server publishes no sign-in details.' },
      ),
      opened(
        'open-token',
        'A token server',
        'A token is saved, never shown back. Blank keeps it. Tools were left out, and it says so.',
        { openId: 'sentry' },
      ),
      opened('open-needs-token', 'Needs a token', 'No token yet.', {
        openId: 'sentry',
        rows: [{ ...SENTRY, hasCredential: false }],
        standings: [{ ...LINEAR_STANDING, serverId: 'sentry' }],
      }),
      opened('open-unreachable', 'Can’t reach it', 'The reason, in the server’s words.', {
        openId: 'docs',
      }),
      opened(
        'open-no-sign-in-wanted',
        'Added with no sign-in, but it wants one',
        'Nothing here can fix it, so it says what to do.',
        {
          openId: 'docs',
          standings: [{ ...LINEAR_STANDING, serverId: 'docs' }],
        },
      ),
      opened(
        'open-from-group',
        'On a project, from its group',
        'Test works; there is no sign-in or Remove, and it says where to change it.',
        { openId: 'zenor' },
      ),
      opened('open-testing', 'Testing', 'Test waits up to five seconds.', {
        openId: 'zenor',
        owner: GROUP,
        rows: GROUP_ROWS,
        testing: ['zenor'],
      }),
      opened(
        'open-tested',
        'Tested',
        'The answer takes over from the recent status, chip included.',
        {
          openId: 'zenor',
          owner: GROUP,
          rows: GROUP_ROWS,
          tests: {
            zenor: { status: 'unreachable', reason: 'The server did not answer', tools: [] },
          },
        },
      ),
      opened('add', 'Add a server', 'Name, URL and how it signs in.', {
        draft: { name: '', url: '', authType: 'oauth' },
      }),
      opened('add-plain-http', 'Add: a URL the backend would refuse', 'Said before it is sent.', {
        draft: { name: 'Zenor', url: 'http://mcp.getzenor.com/mcp', authType: 'bearer' },
      }),
      opened('add-refused', 'Add: refused by the backend', 'What went wrong, in the form.', {
        draft: { name: 'Zenor', url: 'https://mcp.getzenor.com/mcp', authType: 'none' },
        error: 'Could not add the server.',
      }),
      opened('remove', 'Remove, confirmed first', 'It stays until this is confirmed.', {
        removingId: 'linear',
      }),
    ],
    controls: [
      {
        id: 'layout',
        label: 'Layout',
        kind: 'choice',
        options: MCP_SERVERS_LAYOUTS.map((id) => ({ id, label: MCP_SERVERS_LAYOUT_LABELS[id] })),
        default: 'rows',
      },
      {
        id: 'owner',
        label: 'Whose Settings',
        kind: 'choice',
        options: [
          { id: 'project', label: 'A project' },
          { id: 'group', label: 'A group' },
        ],
        default: 'project',
      },
    ],
    presets: MCP_SERVERS_LAYOUTS.map((id) => ({
      id,
      name: MCP_SERVERS_LAYOUT_LABELS[id],
      values: { layout: id },
    })),
    play: (values) => {
      const layout = (values.layout ?? 'rows') as McpServersLayout
      return page(
        panel({
          layout,
          ...(values.owner === 'group' ? { owner: GROUP, rows: GROUP_ROWS } : {}),
          ...(layout === 'folds' ? { openId: 'zenor' } : {}),
        }),
      )
    },
  },
]
