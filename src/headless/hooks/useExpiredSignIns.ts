import { useMemo } from 'react'

import { useCliConfigs } from '../contexts/CliConfigsContext'
import { expiredSignInsByScope } from '../utils/signInExpiry'
import type { ExpiredSignIns, SignInChat, SignInRun } from '../utils/signInExpiryTypes'

/**
 * The expired sign-ins each scope's live agent work uses — see
 * `expiredSignInsByScope` — read against the stored CLI logins, kept live as a
 * login's status changes.
 */
export function useExpiredSignIns(
  chats: readonly SignInChat[],
  runs: readonly SignInRun[],
): ExpiredSignIns {
  const { caches, activeCli, activeCliCredentialId } = useCliConfigs()
  return useMemo(
    () =>
      expiredSignInsByScope({
        chats,
        runs,
        signIns: { logins: caches, active: { activeCli, activeCliCredentialId } },
      }),
    [chats, runs, caches, activeCli, activeCliCredentialId],
  )
}
