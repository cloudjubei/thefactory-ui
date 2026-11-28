import type { ReactNode } from 'react'
import { View } from 'react-native'
import {
  GitCredentialsProvider,
  SIGN_IN_SESSION_TEXT,
  type UseProjectGithubRepoResult,
} from 'thefactory-ui/headless'
import ProjectGithubRepoField from '../../src/native/compound/projects/ProjectGithubRepoField'
import GitCredentialsForm from '../../src/native/compound/settings/GitCredentialsForm'
import McpServerSettings from '../../src/native/compound/settings/McpServerSettings'
import { fakeSignInSession } from '../scenes/inAppSignInSessions'
import { OnFixtures, type FixtureRoutes } from '../scenes/onFixtures'
import type { NativeView } from './views'

const noop = () => {}
const kept = async () => undefined
const never = () => new Promise(noop)

const CREDENTIAL_ROUTES: FixtureRoutes = {
  '/api/v1/git-credentials': () => [],
  'POST /api/v1/git-credentials/github/sign-in': never,
}

const LINEAR_ROW = {
  id: 'linear',
  name: 'Linear',
  url: 'https://mcp.linear.example/mcp',
  authType: 'oauth',
  hasCredential: false,
  onlyReads: false,
  source: 'group',
  groupId: 'osc',
}

const MCP_ROUTES: FixtureRoutes = {
  '/api/v1/projects-groups/{id}/mcp-servers': () => [LINEAR_ROW],
  '/api/v1/projects-groups/{id}/mcp-servers/status': () => [
    { serverId: 'linear', status: 'needs-sign-in', toolCount: 0, omittedTools: 0, tools: [] },
  ],
  'POST /api/v1/projects-groups/{id}/mcp-servers/{serverId}/sign-in': () => ({
    session: fakeSignInSession(
      'sign-in-linear',
      'mcp-server',
      'group:osc:linear',
      'Sign in to Linear',
    ),
  }),
}

const repoField = (state: string | null): UseProjectGithubRepoResult => ({
  connected: state === 'connected',
  enabled: true,
  setEnabled: noop,
  repoName: 'car-finder',
  setRepoName: noop,
  status: state === 'connected' ? 'available' : 'unknown',
  connect: noop,
  connecting: state === 'connecting',
  ready: state === 'connected',
  ...(state === 'connected' ? { login: 'alex' } : {}),
  ...(state === 'timed-out' ? { connectError: SIGN_IN_SESSION_TEXT.timedOut } : {}),
})

const phone = (children: ReactNode) => (
  <View style={{ width: 390, maxWidth: '100%', padding: 16 }}>{children}</View>
)

/**
 * The sign-ins the app makes inside itself, on a phone: a git credential's
 * Sign in with GitHub (press it: the button stays busy, as the made-up backend
 * never answers), the new-project Connect GitHub (`?state=connecting`,
 * `timed-out` or `connected`), and an MCP server's Sign in.
 */
export const IN_APP_SIGN_IN_VIEWS: NativeView[] = [
  {
    id: 'git-credential-sign-in',
    title: 'Git credential: Sign in with GitHub',
    render: () =>
      phone(
        <OnFixtures routes={CREDENTIAL_ROUTES}>
          <GitCredentialsProvider>
            <GitCredentialsForm mode={{ kind: 'create', onSubmit: kept }} onCancel={noop} />
          </GitCredentialsProvider>
        </OnFixtures>,
      ),
  },
  {
    id: 'project-github-repo-connect',
    title: 'New project: Connect GitHub',
    render: (address) => phone(<ProjectGithubRepoField github={repoField(address.get('state'))} />),
  },
  {
    id: 'mcp-server-sign-in',
    title: 'MCP server: Sign in',
    render: () =>
      phone(
        <OnFixtures routes={MCP_ROUTES}>
          <McpServerSettings owner={{ kind: 'group', groupId: 'osc' }} />
        </OnFixtures>,
      ),
  },
]
