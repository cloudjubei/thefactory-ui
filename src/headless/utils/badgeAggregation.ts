/**
 * Pure aggregators for project / group badge state.
 *
 * The shape mirrors what the overseer apps track: agent-run counts, chat-
 * message unread counts + thinking flag, git changes (incoming + uncommitted
 * file counts), and failing tests. Apps assemble a per-project state map, then
 * call `aggregateGroupBadgeState` to roll a group's member projects up into a
 * single badge state.
 */

export type BadgeState = {
  agent_runs: { running: number }
  chat_messages: { unread: number; thinking: boolean }
  git: { incoming: number; uncommitted: number }
  tests: { failing: number }
}

export const EMPTY_BADGE_STATE: BadgeState = {
  agent_runs: { running: 0 },
  chat_messages: { unread: 0, thinking: false },
  git: { incoming: 0, uncommitted: 0 },
  tests: { failing: 0 },
}

/** Roll member-project states up into a single group badge state. */
export function aggregateGroupBadgeState(
  memberProjectIds: ReadonlyArray<string>,
  badgeStateByProject: Readonly<Record<string, BadgeState>>,
): BadgeState {
  const agg: BadgeState = {
    agent_runs: { running: 0 },
    chat_messages: { unread: 0, thinking: false },
    git: { incoming: 0, uncommitted: 0 },
    tests: { failing: 0 },
  }
  for (const pid of memberProjectIds) {
    const st = badgeStateByProject[pid]
    if (!st) continue
    agg.agent_runs.running += st.agent_runs.running
    agg.chat_messages.unread += st.chat_messages.unread
    agg.chat_messages.thinking = agg.chat_messages.thinking || st.chat_messages.thinking
    agg.git.incoming += st.git.incoming
    agg.git.uncommitted += st.git.uncommitted
    agg.tests.failing += st.tests.failing
  }
  return agg
}

/** True when any of the four channels has a non-zero/true value. */
export function hasAnyBadge(s: BadgeState): boolean {
  return (
    s.agent_runs.running > 0 ||
    s.chat_messages.unread > 0 ||
    s.chat_messages.thinking ||
    s.git.incoming > 0 ||
    s.git.uncommitted > 0 ||
    s.tests.failing > 0
  )
}

/** Render a badge count, capping at "99+" so wide numbers don't blow out a row. */
export function formatBadgeCount(n: number): string {
  return n > 99 ? '99+' : `${n}`
}
