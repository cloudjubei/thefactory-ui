/**
 * Pure aggregators for project / group badge state.
 *
 * The shape mirrors what the overseer apps track: chat-message unread counts +
 * thinking flag, git changes (incoming + uncommitted file counts), failing
 * tests, background activities and live process runs. Apps assemble a
 * per-project state map, then call `aggregateGroupBadgeState` to roll a
 * group's member projects up into a single badge state.
 */
import type { ProcessRun } from 'thefactory-tools/types'
import type { BadgeState, ProcessTally } from './badgeAggregationTypes'

export const EMPTY_BADGE_STATE: BadgeState = {
  chat_messages: { unread: 0, thinking: false },
  git: { incoming: 0, uncommitted: 0 },
  tests: { failing: 0 },
  activity: { running: 0, paused: 0, unseen: 0 },
  process: { running: 0, waiting: 0 },
}

/**
 * Bucket live ROOT process runs by project. A child run (a feature step's own
 * pipeline) is reached through its parent, so it never counts on its own;
 * finished runs never count. A project with nothing live is absent.
 */
export function processTallyByProject(
  runs: ReadonlyArray<Pick<ProcessRun, 'projectId' | 'status' | 'parentRunId'>>,
): ReadonlyMap<string, ProcessTally> {
  const out = new Map<string, ProcessTally>()
  for (const r of runs) {
    if (r.parentRunId) continue
    const running = r.status === 'pending' || r.status === 'running'
    if (!running && r.status !== 'parked') continue
    const tally = out.get(r.projectId) ?? { running: 0, waiting: 0 }
    if (running) tally.running += 1
    else tally.waiting += 1
    out.set(r.projectId, tally)
  }
  return out
}

/** Roll member-project states up into a single group badge state. */
export function aggregateGroupBadgeState(
  memberProjectIds: ReadonlyArray<string>,
  badgeStateByProject: Readonly<Record<string, BadgeState>>,
): BadgeState {
  const agg: BadgeState = {
    chat_messages: { unread: 0, thinking: false },
    git: { incoming: 0, uncommitted: 0 },
    tests: { failing: 0 },
    activity: { running: 0, paused: 0, unseen: 0 },
    process: { running: 0, waiting: 0 },
  }
  for (const pid of memberProjectIds) {
    const st = badgeStateByProject[pid]
    if (!st) continue
    agg.chat_messages.unread += st.chat_messages.unread
    agg.chat_messages.thinking = agg.chat_messages.thinking || st.chat_messages.thinking
    agg.git.incoming += st.git.incoming
    agg.git.uncommitted += st.git.uncommitted
    agg.tests.failing += st.tests.failing
    agg.activity.running += st.activity.running
    agg.activity.paused += st.activity.paused
    agg.activity.unseen += st.activity.unseen
    agg.process.running += st.process.running
    agg.process.waiting += st.process.waiting
  }
  return agg
}

/** True when any channel has a non-zero/true value. */
export function hasAnyBadge(s: BadgeState): boolean {
  return (
    s.chat_messages.unread > 0 ||
    s.chat_messages.thinking ||
    s.git.incoming > 0 ||
    s.git.uncommitted > 0 ||
    s.tests.failing > 0 ||
    s.activity.running > 0 ||
    s.activity.paused > 0 ||
    s.activity.unseen > 0 ||
    s.process.running > 0 ||
    s.process.waiting > 0
  )
}

/** Render a badge count, capping at "99+" so wide numbers don't blow out a row. */
export function formatBadgeCount(n: number): string {
  return n > 99 ? '99+' : `${n}`
}
