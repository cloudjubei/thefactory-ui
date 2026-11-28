import type { SignInSessionState } from 'thefactory-tools/types'

const STARTED_AT = '2026-11-27T12:00:00.000Z'
const EXPIRES_AT = '2026-11-27T12:15:00.000Z'

/** A made-up sign-in session, as a start route answers it: the showcase opens no real provider's page. */
export function fakeSignInSession(
  id: string,
  kind: string,
  subject: string,
  title: string,
  surface: SignInSessionState['surface'] = { kind: 'browser' },
): SignInSessionState {
  return {
    id,
    kind,
    subject,
    title,
    status: 'open',
    surface,
    startedAt: STARTED_AT,
    expiresAt: EXPIRES_AT,
  }
}

/** GitHub's device sign-in as a prompt: its page opens in the app, with the code to type there. */
export const GITHUB_DEVICE_SURFACE: SignInSessionState['surface'] = {
  kind: 'prompt',
  message: 'Type this code on GitHub’s page to finish signing in.',
  url: 'https://github.example/login/device',
  code: 'WDJB-MJHT',
}
