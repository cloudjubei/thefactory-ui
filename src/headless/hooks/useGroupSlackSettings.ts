import { useCallback, useMemo, useState } from 'react'
import { useApi } from '../api/ApiContext'
import { useProviderConnections } from '../contexts/ProviderConnectionsContext'
import {
  parseTicketStatuses,
  slackReviewSettingsView,
  startReactionName,
} from '../utils/colleagueReviewSource'
import { SLACK_CONNECTION_NAME, SLACK_PROVIDER } from '../utils/colleagueReviewSourceConstants'
import type { SlackReviewSettingsState } from '../utils/colleagueReviewSourceTypes'
import type { ColleagueReviewMode } from '../utils/colleagueReviewStartTypes'
import { providerOAuthReconnectBody } from '../utils/providerConnectionForm'
import { useColleagueReviewSource } from './useColleagueReviewSource'
import { useProviderOAuthFlow } from './useProviderOAuthFlow'

export type UseGroupSlackSettings = SlackReviewSettingsState & {
  setClientId: (clientId: string) => void
  /** Start signing in with the person's own Slack app, inside the app; a press while it is open shows it again. */
  startSignIn: () => void
  /** Sign the connection in again, inside the app, e.g. once Slack refused it. */
  signInAgain: () => void
  /** Watch the thread a Slack message link is in, through the person's connection. */
  watch: (permalink: string, offerExistingReplies: boolean) => void
  /** Stop watching the thread; the updates it brought stay. */
  clear: () => void
  /** Skip tickets in the statuses typed comma-separated: shown at once, rolled back with why. */
  setSkipStatuses: (text: string) => void
  /** The emoji added once a review starts, colons allowed; empty adds none. */
  setStartReaction: (text: string) => void
  /** Review chats run pull request checks without asking each time. */
  setRunChecksUnasked: (on: boolean) => void
  /** How rounds start unless the person picks otherwise: in the review chat, or as a run. */
  setDefaultMode: (mode: ColleagueReviewMode) => void
  /** The Jira status a ticket moves to once its review merged; empty leaves its status be. */
  setMergedTicketStatus: (text: string) => void
}

/**
 * The group's Slack block in Settings: the person's own Slack app signed in
 * inside the app, the review thread the group watches, kept live, and
 * the group's review settings.
 */
export function useGroupSlackSettings(groupId: string): UseGroupSlackSettings {
  const { connections, oauth } = useProviderConnections()
  const { apiBaseUrl } = useApi()
  const { source, watch: watchThread, clear, setSettings } = useColleagueReviewSource(groupId)
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

  const { start, ...signIn } = flow
  const startSignIn = useCallback(
    () => void start(SLACK_PROVIDER, { name: SLACK_CONNECTION_NAME, clientId: clientId.trim() }),
    [start, clientId],
  )
  const { connection } = view
  const signInAgain = useCallback(() => {
    if (connection.kind === 'not-connected') return
    const held = connections.find((c) => c.id === connection.connectionId)
    if (!held) return
    void start(SLACK_PROVIDER, providerOAuthReconnectBody(held))
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

  const setSkipStatuses = useCallback(
    (text: string) => setSettings({ skipTicketStatuses: parseTicketStatuses(text) }),
    [setSettings],
  )
  const setStartReaction = useCallback(
    (text: string) => setSettings({ startReaction: startReactionName(text) }),
    [setSettings],
  )
  const setRunChecksUnasked = useCallback(
    (on: boolean) => setSettings({ runChecksUnasked: on }),
    [setSettings],
  )
  const setDefaultMode = useCallback(
    (mode: ColleagueReviewMode) => setSettings({ defaultMode: mode }),
    [setSettings],
  )

  const setMergedTicketStatus = useCallback(
    (text: string) => setSettings({ mergedTicketStatus: text.trim() || null }),
    [setSettings],
  )

  return {
    view,
    clientId,
    signIn,
    setClientId,
    startSignIn,
    signInAgain,
    watch,
    clear,
    setSkipStatuses,
    setStartReaction,
    setRunChecksUnasked,
    setDefaultMode,
    setMergedTicketStatus,
  }
}
