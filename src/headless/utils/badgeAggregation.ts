/**
 * Pure aggregators for project / group badge state.
 *
 * The shape mirrors what the overseer apps track: chat-message unread counts +
 * thinking flag, git changes (incoming + uncommitted file counts), failing
 * tests, background activities and process runs. Apps assemble a
 * per-project state map, then call `aggregateGroupBadgeState` to roll a
 * group's member projects up into a single badge state.
 */
import type { ProcessRun } from 'thefactory-tools/types'
import { processRunStopHolder } from 'thefactory-tools/utils'
import type { BadgeState, ProcessTally } from './badgeAggregationTypes'
import type { ProcessRunChatNews } from './chatChannelTypes'
import { isProcessRunCurrent } from './processRunCurrent'

export const EMPTY_BADGE_STATE: BadgeState = {
  chat_messages: { unread: 0, waiting: 0, thinking: false },
  git: { incoming: 0, uncommitted: 0 },
  tests: { failing: 0 },
  activity: { running: 0, paused: 0, unseen: 0 },
  process: { running: 0, waiting: 0, failed: 0, unread: 0 },
  signIn: { expired: [] },
}

/**
 * Bucket ROOT process runs by project: one working — or bringing its approved
 * work in, or stopped with its agent manager on it (`processRunStopHolder`) —
 * counts as running, one whose merge failed as failed, one waiting on the
 * person — a stop that is theirs, approved work not brought in yet, or an ask
 * in its own chat (`chatNews`, by run id) — as waiting, and a reply unread in
 * its own chat as news. A child run (a feature step's own pipeline) is reached
 * through its parent, so it never counts on its own; a run that is history
 * counts only for news in its chat. A project with nothing to count is absent.
 * Pure.
 */
export function processTallyByProject(
  runs: ReadonlyArray<
    Pick<
      ProcessRun,
      | 'id'
      | 'projectId'
      | 'status'
      | 'parentRunId'
      | 'plan'
      | 'ledger'
      | 'workBranch'
      | 'integration'
      | 'park'
      | 'manager'
      | 'input'
    > &
      Partial<Pick<ProcessRun, 'groupRunId'>>
  >,
  now: number,
  chatNews?: ReadonlyMap<string, ProcessRunChatNews>,
): ReadonlyMap<string, ProcessTally> {
  const out = new Map<string, ProcessTally>()
  for (const r of runs) {
    if (r.parentRunId) continue
    const news = chatNews?.get(r.id)
    const asks = (news?.asks ?? 0) > 0
    const unread = (news?.unread ?? 0) > 0
    const current = isProcessRunCurrent(r)
    if (!current && !asks && !unread) continue
    const tally = out.get(r.projectId) ?? { running: 0, waiting: 0, failed: 0, unread: 0 }
    if (current && r.integration?.status === 'failed') tally.failed += 1
    else if (asks) tally.waiting += 1
    else if (!current) tally.unread += 1
    else if (isWorking(r, now)) {
      tally.running += 1
      if (unread) tally.unread += 1
    } else if (r.park?.reason !== 'waiting-on-blockers') tally.waiting += 1
    out.set(r.projectId, tally)
  }
  return out
}

/** Whether a current run is at work, or stopped with its manager on it. */
function isWorking(
  r: Pick<ProcessRun, 'status' | 'integration' | 'input' | 'manager' | 'park'>,
  now: number,
): boolean {
  if (r.status === 'pending' || r.status === 'running') return true
  if (r.integration?.status === 'integrating') return true
  return processRunStopHolder(r, now) === 'manager'
}

/** Roll member-project states up into a single group badge state. */
export function aggregateGroupBadgeState(
  memberProjectIds: ReadonlyArray<string>,
  badgeStateByProject: Readonly<Record<string, BadgeState>>,
): BadgeState {
  const agg: BadgeState = {
    chat_messages: { unread: 0, waiting: 0, thinking: false },
    git: { incoming: 0, uncommitted: 0 },
    tests: { failing: 0 },
    activity: { running: 0, paused: 0, unseen: 0 },
    process: { running: 0, waiting: 0, failed: 0, unread: 0 },
    signIn: { expired: [] },
  }
  const expired = new Set<string>()
  for (const pid of memberProjectIds) {
    const st = badgeStateByProject[pid]
    if (!st) continue
    agg.chat_messages.unread += st.chat_messages.unread
    agg.chat_messages.waiting += st.chat_messages.waiting
    agg.chat_messages.thinking = agg.chat_messages.thinking || st.chat_messages.thinking
    agg.git.incoming += st.git.incoming
    agg.git.uncommitted += st.git.uncommitted
    agg.tests.failing += st.tests.failing
    agg.activity.running += st.activity.running
    agg.activity.paused += st.activity.paused
    agg.activity.unseen += st.activity.unseen
    agg.process.running += st.process.running
    agg.process.waiting += st.process.waiting
    agg.process.failed += st.process.failed
    agg.process.unread += st.process.unread
    for (const name of st.signIn.expired) expired.add(name)
  }
  agg.signIn = { expired: [...expired] }
  return agg
}

/** True when any channel has a non-zero/true value. */
export function hasAnyBadge(s: BadgeState): boolean {
  return (
    s.chat_messages.unread > 0 ||
    s.chat_messages.waiting > 0 ||
    s.chat_messages.thinking ||
    s.git.incoming > 0 ||
    s.git.uncommitted > 0 ||
    s.tests.failing > 0 ||
    s.activity.running > 0 ||
    s.activity.paused > 0 ||
    s.activity.unseen > 0 ||
    s.process.running > 0 ||
    s.process.waiting > 0 ||
    s.process.failed > 0 ||
    s.process.unread > 0 ||
    s.signIn.expired.length > 0
  )
}

/** Render a badge count, capping at "99+" so wide numbers don't blow out a row. */
export function formatBadgeCount(n: number): string {
  return n > 99 ? '99+' : `${n}`
}
