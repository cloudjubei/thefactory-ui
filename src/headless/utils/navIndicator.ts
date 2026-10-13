import type { BadgeCounts } from '../hooks/useBadgeCountsCore'
import { formatBadgeCount } from './badgeAggregation'
import { signInExpiredTitle } from './signInExpiry'
import type { BadgeState } from './badgeAggregationTypes'
import { inkBadgeParts } from './inkBadge'
import type { InkChannel, InkPart } from './inkBadgeTypes'
import type { NavRowIndicator, NavRowSignals } from './navIndicatorTypes'
import type { GroupTabKey, ShellTabKey } from './shellNav'

const PAUSED_TITLE = 'Paused activity — resumes when you open it'

function counted(n: number, one: string, many: string): string {
  return `${formatBadgeCount(n)} ${n === 1 ? one : many}`
}

function waitingPhrase({ channel, count }: InkPart): string {
  switch (channel) {
    case 'failed':
      return `${formatBadgeCount(count)} failed`
    case 'processes':
      return counted(count, 'run needs you', 'runs need you')
    case 'chat':
      return counted(count, 'chat needs you', 'chats need you')
    case 'git':
      return counted(count, 'git change', 'git changes')
    case 'activity':
      return counted(count, 'new result', 'new results')
    case 'tests':
      return counted(count, 'failing test', 'failing tests')
    case 'cross-project':
      return counted(count, 'request', 'requests')
    case 'storage':
      return counted(count, 'storage warning', 'storage warnings')
  }
}

function freshPhrase(part: InkPart): string {
  switch (part.channel) {
    case 'chat':
      return counted(part.count, 'chat has news', 'chats have news')
    case 'processes':
      return counted(part.count, 'run has news', 'runs have news')
    default:
      return waitingPhrase(part)
  }
}

function runningPhrase(channel: InkChannel): string {
  switch (channel) {
    case 'processes':
    case 'activity':
      return 'a run is working'
    case 'chat':
      return 'an agent is replying'
    default:
      return 'something is running'
  }
}

/** What a badge holds, in words: each part waiting, then what runs. Pure. */
export function inkBadgeTitle(parts: readonly InkPart[], running?: InkChannel): string {
  const phrases = inkBadgeParts(parts).map(waitingPhrase)
  if (running) phrases.push(runningPhrase(running))
  return phrases.join(' · ')
}

/** A row's tooltip: its label, then what its indicator shows. Pure. */
export function navRowTitle(label: string, indicator: NavRowIndicator): string {
  return indicator.kind === 'none' ? label : `${label} — ${indicator.title}`
}

function withBroke(parts: InkPart[], broke: number, rollup: boolean): InkPart[] {
  if (broke === 0) return parts
  if (!rollup) {
    return [{ channel: 'failed', count: parts.reduce((sum, p) => sum + p.count, broke) }]
  }
  const failed = parts.find((p) => p.channel === 'failed')?.count ?? 0
  return inkBadgeParts([
    { channel: 'failed', count: failed + broke },
    ...parts.filter((p) => p.channel !== 'failed'),
  ])
}

/**
 * Precedence for every nav row: what waits, runs or broke → ink (the number
 * stays while something runs); then the paused icon; then news to read → a
 * dot. Pure.
 */
export function navRowIndicator(signals: NavRowSignals): NavRowIndicator {
  const broke = signals.broke ?? []
  const own = inkBadgeParts(signals.parts)
  const parts = withBroke(own, broke.length, signals.rollup)
  if (parts.length > 0 || signals.running) {
    const badge = signals.running
      ? { parts, running: signals.running, rollup: signals.rollup }
      : { parts, rollup: signals.rollup }
    const counted = inkBadgeTitle(signals.described ?? own, signals.running)
    return {
      kind: 'ink',
      badge,
      title: [...broke, ...(counted ? [counted] : [])].join(' · '),
    }
  }
  if (signals.paused) return { kind: 'paused', title: PAUSED_TITLE }
  const fresh = inkBadgeParts(signals.fresh ?? [])
  if (fresh.length > 0) return { kind: 'dot', title: fresh.map(freshPhrase).join(' · ') }
  return { kind: 'none' }
}

/**
 * A project or group row: ONE total of everything waiting on the person —
 * failed merges, expired sign-ins its agents use, runs, chats with an ask, git
 * changes — moving while a run works or an agent replies; unread news alone —
 * in a chat, in a run's own chat, or new results — is a dot. Failing tests
 * stay on the Tests tab. Pure.
 */
export function scopeRowIndicator(state: BadgeState): NavRowIndicator {
  const runWorking = state.process.running > 0 || state.activity.running > 0
  const running: InkChannel | undefined = runWorking
    ? 'processes'
    : state.chat_messages.thinking
      ? 'chat'
      : undefined
  return navRowIndicator({
    parts: [
      { channel: 'failed', count: state.process.failed },
      { channel: 'processes', count: state.process.waiting },
      { channel: 'chat', count: state.chat_messages.waiting },
      { channel: 'git', count: state.git.incoming + state.git.uncommitted },
    ],
    running,
    paused: state.activity.paused > 0,
    fresh: [
      { channel: 'chat', count: state.chat_messages.unread },
      { channel: 'processes', count: state.process.unread },
      { channel: 'activity', count: state.activity.unseen },
    ],
    broke: state.signIn.expired.map(signInExpiredTitle),
    rollup: true,
  })
}

/**
 * A per-project shell tab row, in its own one channel — the number shown
 * together with what runs. `viewing` = the person is on this tab now.
 */
export function shellTabIndicator(
  tab: ShellTabKey,
  counts: BadgeCounts,
  { viewing }: { viewing: boolean },
): NavRowIndicator {
  switch (tab) {
    case 'chat':
      return chatTabIndicator(
        { unread: counts.chat, waiting: counts.chatWaiting, thinking: counts.chatThinking },
        counts.chatSignInExpired,
      )
    case 'git':
      return navRowIndicator({ parts: [{ channel: 'git', count: counts.git }], rollup: false })
    case 'processes': {
      const failed = counts.processesFailed
      return navRowIndicator({
        parts: [
          { channel: failed > 0 ? 'failed' : 'processes', count: counts.processesWaiting + failed },
        ],
        described: [
          { channel: 'failed', count: failed },
          { channel: 'processes', count: counts.processesWaiting },
        ],
        running: counts.processesRunning > 0 ? 'processes' : undefined,
        fresh: [{ channel: 'processes', count: counts.processesUnread }],
        broke: counts.processesSignInExpired.map(signInExpiredTitle),
        rollup: false,
      })
    }
    case 'app':
      if (viewing) return { kind: 'none' }
      return navRowIndicator({
        parts: [{ channel: 'activity', count: counts.activityUnseen }],
        running: counts.activityWorking ? 'activity' : undefined,
        paused: counts.activityPaused,
        rollup: false,
      })
    default:
      return { kind: 'none' }
  }
}

/**
 * A per-group tab row — only Chat carries a channel at group scope, and it
 * counts the GROUP's own chats, so reading the group chat clears it.
 * `expiredSignIns` names the expired sign-ins those chats use.
 */
export function groupTabIndicator(
  tab: GroupTabKey,
  groupChats: BadgeState['chat_messages'],
  expiredSignIns: readonly string[] = [],
): NavRowIndicator {
  if (tab !== 'chat') return { kind: 'none' }
  return chatTabIndicator(groupChats, expiredSignIns)
}

function chatTabIndicator(
  chats: BadgeState['chat_messages'],
  expiredSignIns: readonly string[],
): NavRowIndicator {
  return navRowIndicator({
    parts: [{ channel: 'chat', count: chats.waiting }],
    running: chats.thinking ? 'chat' : undefined,
    fresh: [{ channel: 'chat', count: chats.unread }],
    broke: expiredSignIns.map(signInExpiredTitle),
    rollup: false,
  })
}
