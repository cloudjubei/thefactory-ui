import { useMemo } from 'react'

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
}

export const ZERO_BADGE_COUNTS: BadgeCounts = {
  chat: 0,
  chatThinking: false,
  git: 0,
  tests: 0,
  activity: 0,
  activityWorking: false,
  activityPaused: false,
  activityUnseen: 0,
}

export type BadgeChannelToggles = {
  chat?: boolean
  git?: boolean
  tests?: boolean
  activity?: boolean
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
  /** Per-channel master toggles. Defaults to "enabled". */
  enabled?: BadgeChannelToggles
  /** Git sub-toggles. */
  gitSubToggles?: GitBadgeSubToggles
  /** Chat mode: count unread chats or total unread messages. */
  chatBadgeCountMode?: ChatBadgeCountMode
}

export function useBadgeCountsCore(input: UseBadgeCountsCoreInput): BadgeCounts {
  return useMemo(() => {
    const enabled = {
      chat: input.enabled?.chat !== false,
      git: input.enabled?.git !== false,
      tests: input.enabled?.tests !== false,
      activity: input.enabled?.activity !== false,
    }

    const out: BadgeCounts = { ...ZERO_BADGE_COUNTS }

    if (enabled.chat) {
      let chatsWithUnread = 0
      let totalUnread = 0
      let anyThinking = false
      for (const c of input.chats) {
        if (c.unreadMessages > 0) {
          chatsWithUnread += 1
          totalUnread += c.unreadMessages
        }
        if (!anyThinking && c.isThinking) anyThinking = true
      }
      out.chat = input.chatBadgeCountMode === 'total_messages' ? totalUnread : chatsWithUnread
      out.chatThinking = anyThinking
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

    return out
  }, [
    input.chats,
    input.git,
    input.failingTests,
    input.activity,
    input.enabled,
    input.gitSubToggles,
    input.chatBadgeCountMode,
  ])
}
