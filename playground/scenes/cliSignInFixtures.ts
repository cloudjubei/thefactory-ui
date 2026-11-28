import type { SignInSessionState } from 'thefactory-tools/types'
import type { StartCliAuthLoginData } from '../../src/headless/api/generated/types.gen'
import { fakeCliSignIn } from '../../src/fakeBackend/fixtures/account'
import { SIGN_IN_SESSIONS_EVENT } from '../../src/headless/utils/signInSessionConstants'
import type { FixtureRoutes } from './onFixtures'

/** How a state's sign-in goes once pressed. */
export type CliSignInEnding = 'open' | 'finished' | 'failed' | 'timed-out' | 'refused'

/** What the backend said when a sign-in failed, as the CLI's own login reports it. */
export const CLI_SIGN_IN_FAILED_REASON = 'The login exited before it saved a credential.'

const STORED = [
  { id: 'claude-work', cli: 'claude-code', name: 'Claude Code (work)' },
  {
    id: 'codex-home',
    cli: 'codex',
    name: 'Codex (home)',
    authStatus: { authenticated: false, checkedAt: '2026-11-27T09:00:00.000Z' },
  },
].map((login) => ({
  ...login,
  fileNames: [],
  createdAt: '2026-11-20T09:00:00.000Z',
  updatedAt: '2026-11-20T09:00:00.000Z',
}))

/** The CLI settings' reads and the sign-in route, answered with made-up logins. */
export function cliSignInRoutes(ending: CliSignInEnding): FixtureRoutes {
  return {
    '/api/v1/cli-auth-caches': () => STORED,
    '/api/v1/cli-configs/active': () => ({ enabled: { 'claude-code': true, codex: true } }),
    '/api/v1/cli-runs/subscription-windows': () => [],
    '/api/v1/cli-runs/probe/models': () => ({ models: [], efforts: [] }),
    '/api/v1/cli-runs/probe/capability': () => [],
    '/api/v1/cli-images': () => ({ images: [], docker: 'missing' }),
    '/api/v1/sign-in-sessions': () => ({ sessions: [] }),
    'DELETE /api/v1/sign-in-sessions/{sessionId}': () => ({ closed: true }),
    'POST /api/v1/sign-in-sessions/{sessionId}/answer': () => ({ accepted: true }),
    'POST /api/v1/cli-auth/login': (_params, _query, body) => {
      if (ending === 'refused') throw new Error('refused')
      return { session: fakeCliSignIn(body as StartCliAuthLoginData['body']) }
    },
  }
}

/** The socket message the backend sends once a pressed sign-in ends as the state says, if it does. */
export function cliSignInEndedMessage(
  ending: CliSignInEnding,
  request: StartCliAuthLoginData['body'],
): { event: string; data: { session: SignInSessionState } } | undefined {
  if (ending === 'open' || ending === 'refused') return undefined
  return {
    event: SIGN_IN_SESSIONS_EVENT,
    data: {
      session: {
        ...fakeCliSignIn(request),
        status: ending,
        ...(ending === 'failed' ? { error: CLI_SIGN_IN_FAILED_REASON } : {}),
      },
    },
  }
}
