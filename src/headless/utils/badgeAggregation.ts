/**
 * Pure aggregators for project / group badge state.
 *
 * The shape mirrors what the overseer apps track: agent-run counts, chat-
 * message unread counts + thinking flag, and git changes. Apps assemble a
 * per-project state map, then call `aggregateGroupBadgeState` to roll a
 * group's member projects up into a single badge state.
 */

export type BadgeState = {
  agent_runs: { running: number; unread: number }
  chat_messages: { unread: number; thinking: boolean }
  git_changes: { incoming: number; uncommitted: boolean }
}

export const EMPTY_BADGE_STATE: BadgeState = {
  agent_runs: { running: 0, unread: 0 },
  chat_messages: { unread: 0, thinking: false },
  git_changes: { incoming: 0, uncommitted: false },
}

/** Roll member-project states up into a single group badge state. */
export function aggregateGroupBadgeState(
  memberProjectIds: ReadonlyArray<string>,
  badgeStateByProject: Readonly<Record<string, BadgeState>>,
): BadgeState {
  const agg: BadgeState = {
    agent_runs: { running: 0, unread: 0 },
    chat_messages: { unread: 0, thinking: false },
    git_changes: { incoming: 0, uncommitted: false },
  }
  for (const pid of memberProjectIds) {
    const st = badgeStateByProject[pid]
    if (!st) continue
    agg.agent_runs.running += st.agent_runs.running
    agg.agent_runs.unread += st.agent_runs.unread
    agg.chat_messages.unread += st.chat_messages.unread
    agg.chat_messages.thinking = agg.chat_messages.thinking || st.chat_messages.thinking
    agg.git_changes.incoming += st.git_changes.incoming
    agg.git_changes.uncommitted = agg.git_changes.uncommitted || st.git_changes.uncommitted
  }
  return agg
}

/** True when any of the four channels has a non-zero/true value. */
export function hasAnyBadge(s: BadgeState): boolean {
  return (
    s.agent_runs.running > 0 ||
    s.agent_runs.unread > 0 ||
    s.chat_messages.unread > 0 ||
    s.chat_messages.thinking ||
    s.git_changes.incoming > 0 ||
    s.git_changes.uncommitted
  )
}
