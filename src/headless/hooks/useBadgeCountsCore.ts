import { useMemo } from 'react'
import type { ProcessTally } from '../utils/badgeAggregationTypes'
import type { ScopeSignIns } from '../utils/signInExpiryTypes'

/**
 * Headless badge-count computation shared by web (`useBadgeCounts`) and
 * desktop (`useNotifications`). Both apps collect the same channels
 * (chat unread + thinking, git changes, failing tests) from different context
 * shapes — this hook accepts the normalised inputs and returns a uniform
 * `BadgeCounts` honouring per-channel toggles.
 *
 * No DOM, no I/O — the host pulls everything from its own context and
 * passes it in. Channels with `enabled=false` always return zero/false,
 * so the consumer renders unconditionally without a per-call gate.
 */

export type BadgeCounts = {
  /** Either chats-with-unread or total unread messages — caller decides via
   *  `chatBadgeCountMode` */
  chat: number
  /** Chats with an ask waiting on the person (every ask, in the `total_messages` mode). */
  chatWaiting: number
  /** True when any chat in scope has an LLM call in flight. */
  chatThinking: boolean
  /** Sum of incoming-commits + uncommitted-changes, gated on sub-toggles. */
  git: number
  /** Number of failing tests in the last run. */
  tests: number
  /** Number of background activities live-running for the scope. */
  activity: number
  /** True while any background activity is live-running (drives the nav spinner). */
  activityWorking: boolean
  /** True while a `running` activity isn't live (resumable; drives the paused icon). */
  activityPaused: boolean
  /** Runs that finished since the user last opened this scope's app tab (unseen-results badge). */
  activityUnseen: number
  /** Root process runs pending or running — drives the Processes tab spinner. */
  processesRunning: number
  /** Root process runs parked on the user (sign-off gate or any park) — the Processes count. */
  processesWaiting: number
  /** Root process runs whose approved work failed to merge — counted with the waiting, in red. */
  processesFailed: number
  /** The expired sign-ins the scope's live chats use, by name — the Chat tab turns red. */
  chatSignInExpired: readonly string[]
  /** The expired sign-ins the scope's current runs use, by name — the Processes tab turns red. */
  processesSignInExpired: readonly string[]
}

export const ZERO_BADGE_COUNTS: BadgeCounts = {
  chat: 0,
  chatWaiting: 0,
  chatThinking: false,
  git: 0,
  tests: 0,
  activity: 0,
  activityWorking: false,
  activityPaused: false,
  activityUnseen: 0,
  processesRunning: 0,
  processesWaiting: 0,
  processesFailed: 0,
  chatSignInExpired: [],
  processesSignInExpired: [],
}

export type BadgeChannelToggles = {
  chat?: boolean
  git?: boolean
  tests?: boolean
  activity?: boolean
  processes?: boolean
}

export type BadgeActivityInput = {
  /** How many background activities are live-running. */
  runningCount: number
  /** True while any is live-running. */
  isWorking: boolean
  /** True while a `running` activity isn't live (resumable). */
  isPaused?: boolean
  /** Runs finished since the app tab was last opened (the unseen-results count). */
  unseenCount?: number
}

export type GitBadgeSubToggles = {
  incoming_commits?: boolean
  uncommitted_changes?: boolean
}

export type ChatBadgeCountMode = 'chats_with_unread' | 'total_messages'

export type BadgeChatInput = {
  /** Per-chat unread message count. */
  unreadMessages: number
  /** Asks the chat has waiting on the user — unread news like a reply. */
  pendingAsks?: number
  /** True for chats that are currently streaming. */
  isThinking: boolean
}

export type BadgeGitInput = {
  /** Working-tree changes (sum of staged+unstaged+untracked). */
  uncommittedFileCount: number
  /** Commits behind remote on the current branch. */
  incomingCommitCount: number
}

export type UseBadgeCountsCoreInput = {
  /** Set of chats in scope (project / group). Each entry contributes its
   *  unread + thinking. */
  chats: ReadonlyArray<BadgeChatInput>
  /** Git state in scope (single project = one entry; group rollups happen
   *  upstream via `aggregateGroupBadgeState`). */
  git?: BadgeGitInput
  /** Failing tests in the most recent test run. */
  failingTests?: number
  /** Background activities running in scope (count + working flag). */
  activity?: BadgeActivityInput
  /** Live root process runs in scope, from `processTallyByProject`. */
  processes?: ProcessTally
  /** The expired sign-ins the scope's live chats and current runs use, from `expiredSignInsByScope`. */
  signIn?: ScopeSignIns
  /** Per-channel master toggles. Defaults to "enabled". */
  enabled?: BadgeChannelToggles
  /** Git sub-toggles. */
  gitSubToggles?: GitBadgeSubToggles
  /** Chat mode: count unread chats or total unread messages. */
  chatBadgeCountMode?: ChatBadgeCountMode
}

/**
 * The chat badge of a set of chats: how many have news (or, in the
 * `total_messages` mode, how much news there is), how many wait on the person
 * with an ask (or how many asks), and whether any is streaming. An ask waiting
 * on the person is news like an unread reply.
 */
export function chatBadgeTally(
  chats: ReadonlyArray<BadgeChatInput>,
  mode: ChatBadgeCountMode = 'chats_with_unread',
): { unread: number; waiting: number; thinking: boolean } {
  let chatsWithNews = 0
  let totalNews = 0
  let chatsWaiting = 0
  let totalAsks = 0
  let thinking = false
  for (const c of chats) {
    const asks = c.pendingAsks ?? 0
    const news = c.unreadMessages + asks
    if (news > 0) {
      chatsWithNews += 1
      totalNews += news
    }
    if (asks > 0) {
      chatsWaiting += 1
      totalAsks += asks
    }
    if (c.isThinking) thinking = true
  }
  const total = mode === 'total_messages'
  return {
    unread: total ? totalNews : chatsWithNews,
    waiting: total ? totalAsks : chatsWaiting,
    thinking,
  }
}

export function computeBadgeCounts(input: UseBadgeCountsCoreInput): BadgeCounts {
  const enabled = {
    chat: input.enabled?.chat !== false,
    git: input.enabled?.git !== false,
    tests: input.enabled?.tests !== false,
    activity: input.enabled?.activity !== false,
    processes: input.enabled?.processes !== false,
  }

  const out: BadgeCounts = { ...ZERO_BADGE_COUNTS }

  if (enabled.chat) {
    const chat = chatBadgeTally(input.chats, input.chatBadgeCountMode)
    out.chat = chat.unread
    out.chatWaiting = chat.waiting
    out.chatThinking = chat.thinking
    out.chatSignInExpired = input.signIn?.chats ?? []
  }

  if (enabled.git && input.git) {
    const sub = input.gitSubToggles ?? {}
    let g = 0
    if (sub.uncommitted_changes !== false) g += input.git.uncommittedFileCount
    if (sub.incoming_commits !== false) g += input.git.incomingCommitCount
    out.git = g
  }

  if (enabled.tests) {
    out.tests = input.failingTests ?? 0
  }

  if (enabled.activity && input.activity) {
    out.activity = input.activity.runningCount
    out.activityWorking = input.activity.isWorking
    out.activityPaused = input.activity.isPaused ?? false
    out.activityUnseen = input.activity.unseenCount ?? 0
  }

  if (enabled.processes && input.processes) {
    out.processesRunning = input.processes.running
    out.processesWaiting = input.processes.waiting
    out.processesFailed = input.processes.failed
  }

  if (enabled.processes && input.signIn) {
    out.processesSignInExpired = input.signIn.runs
  }

  return out
}

export function useBadgeCountsCore(input: UseBadgeCountsCoreInput): BadgeCounts {
  return useMemo(
    () => computeBadgeCounts(input),
    [
      input.chats,
      input.git,
      input.failingTests,
      input.activity,
      input.processes,
      input.signIn,
      input.enabled,
      input.gitSubToggles,
      input.chatBadgeCountMode,
    ],
  )
}
