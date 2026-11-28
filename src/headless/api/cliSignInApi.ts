import type { SignInSessionState } from 'thefactory-tools/types'
import type { CliSignInStart } from '../utils/cliSignInTypes'
import { startCliAuthLogin } from './generated'

/**
 * Sign a CLI agent in inside the app; answers the session the app shows.
 * Asking again while it is open opens no second one and answers the open session.
 */
export async function startCliSignIn({
  cli,
  label,
  credentialId,
  captureId,
}: CliSignInStart): Promise<SignInSessionState> {
  const { data } = await startCliAuthLogin({
    body: {
      cli,
      label,
      ...(credentialId ? { credentialId } : {}),
      ...(captureId ? { captureId } : {}),
    },
    throwOnError: true,
  })
  return data.session
}
