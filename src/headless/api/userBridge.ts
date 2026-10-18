import { listGitCredentials } from './generated'
import { extractErrorMessage } from './errorMessage'
import { bridgeMessageName, type BridgeRequest } from '../utils/appBridge'
import { USER_CURRENT_MESSAGE } from '../utils/appBridgeConstants'
import { currentUserFromCredentials } from '../utils/appUser'
import { APP_USER_NONE } from '../utils/appUserConstants'
import type { AppCurrentUser } from '../utils/appUserTypes'

/** `overseer:user.current`: who the person is, from their git credentials. Other messages pass through. */
export async function dispatchUserBridge(req: BridgeRequest): Promise<AppCurrentUser | undefined> {
  if (bridgeMessageName(req.type) !== USER_CURRENT_MESSAGE) return undefined
  let credentials
  try {
    credentials = (await listGitCredentials({ throwOnError: true })).data ?? []
  } catch (err) {
    throw new Error(extractErrorMessage(err, APP_USER_NONE))
  }
  const user = currentUserFromCredentials(credentials)
  if (!user) throw new Error(APP_USER_NONE)
  return user
}
