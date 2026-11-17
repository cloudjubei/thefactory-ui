import { useCallback, useEffect, useMemo, useState } from 'react'
import { useApi } from '../api/ApiContext'
import { useProviderConnections } from '../contexts/ProviderConnectionsContext'
import { slackReviewSettingsView } from '../utils/colleagueReviewSource'
import { SLACK_CONNECTION_NAME, SLACK_PROVIDER } from '../utils/colleagueReviewSourceConstants'
import type { SlackReviewSettingsState } from '../utils/colleagueReviewSourceTypes'
import { providerOAuthReconnectBody } from '../utils/providerConnectionForm'
import { useColleagueReviewSource } from './useColleagueReviewSource'
import { useProviderOAuthFlow } from './useProviderOAuthFlow'

export type UseGroupSlackSettings = SlackReviewSettingsState & {
  setClientId: (clientId: string) => void
  /** Start signing in with the person's own Slack app; answers the page to open in the browser. */
  startSignIn: () => Promise<string | undefined>
  /** Sign the connection Slack refused in again; answers the page to open in the browser. */
  signInAgain: () => Promise<string | undefined>
  /** Back out of a sign-in, whatever became of the browser. */
  backOut: () => void
  /** Watch the thread a Slack message link is in, through the person's connection. */
  watch: (permalink: string, offerExistingReplies: boolean) => void
  /** Stop watching the thread; the updates it brought stay. */
  clear: () => void
}

/**
 * The group's Slack block in Settings: the person's own Slack app signed in
 * through the browser, and the review thread the group watches, kept live.
 */
export function useGroupSlackSettings(groupId: string): UseGroupSlackSettings {
  const { connections, oauth } = useProviderConnections()
  const { apiBaseUrl } = useApi()
  const { source, watch: watchThread, clear } = useColleagueReviewSource(groupId)
  const flow = useProviderOAuthFlow(oauth)
  const [clientId, setClientId] = useState('')

  const view = useMemo(
    () =>
      slackReviewSettingsView({
        connections,
        oauthSetup: oauth.setup,
        source,
        apiBaseUrl,
        now: Date.now(),
      }),
    [connections, oauth.setup, source, apiBaseUrl],
  )

  const { start, reset, ...signIn } = flow
  useEffect(() => {
    if (signIn.step === 'done') reset()
  }, [signIn.step, reset])
  const startSignIn = useCallback(
    () => start(SLACK_PROVIDER, { name: SLACK_CONNECTION_NAME, clientId: clientId.trim() }),
    [start, clientId],
  )
  const { connection } = view
  const signInAgain = useCallback(async () => {
    if (connection.kind === 'not-connected') return undefined
    const held = connections.find((c) => c.id === connection.connectionId)
    if (!held) return undefined
    return start(SLACK_PROVIDER, providerOAuthReconnectBody(held))
  }, [start, connection, connections])
  const watch = useCallback(
    (permalink: string, offerExistingReplies: boolean) => {
      if (connection.kind === 'not-connected') return
      watchThread({
        connectionId: connection.connectionId,
        permalink: permalink.trim(),
        ...(offerExistingReplies ? { offerExistingReplies: true } : {}),
      })
    },
    [watchThread, connection],
  )

  return {
    view,
    clientId,
    signIn,
    setClientId,
    startSignIn,
    signInAgain,
    backOut: reset,
    watch,
    clear,
  }
}
