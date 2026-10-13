import { useMemo } from 'react'
import { getChatContext } from 'thefactory-tools/utils'

import { useCliConfigs } from '../contexts/CliConfigsContext'
import { chatChannelOf } from '../utils/chatChannel'
import { expiredSignInsByScope, storedSignInsExpired } from '../utils/signInExpiry'
import type { ExpiredSignIns, SignInChat, SignInRun } from '../utils/signInExpiryTypes'
import { useSignInCardsByChat } from './useSignInCardsByChat'

/** A chat as the badges hold it, with the key its sign-in cards are filed under. */
export type ExpiredSignInChat = SignInChat & { contextKey?: string }

/**
 * The expired sign-ins each scope's live agent work uses — see
 * `expiredSignInsByScope` — read against the stored CLI logins and the open
 * sign-in cards, kept live as either changes.
 */
export function useExpiredSignIns(
  chats: readonly ExpiredSignInChat[],
  runs: readonly SignInRun[],
): ExpiredSignIns {
  const { caches, activeCli, activeCliCredentialId } = useCliConfigs()
  const cards = useSignInCardsByChat()
  return useMemo(
    () =>
      expiredSignInsByScope({
        chats: chats.map((chat) => {
          const signInCards = chat.contextKey ? cards.get(chat.contextKey) : undefined
          const context = chat.contextKey ? getChatContext(chat.contextKey) : undefined
          return {
            ...chat,
            ...(signInCards ? { signInCards } : {}),
            ...(context ? { channel: chatChannelOf(context) } : {}),
          }
        }),
        runs,
        signIns: { logins: caches, active: { activeCli, activeCliCredentialId } },
      }),
    [chats, runs, cards, caches, activeCli, activeCliCredentialId],
  )
}

/**
 * Every stored login checked and found signed out, by name — whatever uses it.
 * What the Settings nav item shows.
 */
export function useStoredSignInsExpired(): readonly string[] {
  const { caches } = useCliConfigs()
  return useMemo(() => storedSignInsExpired(caches), [caches])
}
