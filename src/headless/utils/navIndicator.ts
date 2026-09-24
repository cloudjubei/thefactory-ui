import type { BadgeCounts } from '../hooks/useBadgeCountsCore'
import { formatBadgeCount } from './badgeAggregation'
import type { BadgeState } from './badgeAggregationTypes'
import type { NavBadge, NavRowIndicator, NavRowSignals } from './navIndicatorTypes'
import type { GroupTabKey, ShellTabKey } from './shellNav'

function present(badge: NavBadge | undefined): NavBadge | undefined {
  return badge && badge.count > 0 ? { count: badge.count, category: badge.category } : undefined
}

/**
 * Precedence for every nav row: running → spinner (dot = waiting, else
 * unread); then a waiting count; then the paused icon; then an unread count.
 */
export function navRowIndicator(signals: NavRowSignals): NavRowIndicator {
  const waiting = present(signals.waiting)
  const unread = present(signals.unread)
  if (signals.running) {
    const dot = waiting ?? unread
    return dot ? { kind: 'spinner', dot } : { kind: 'spinner' }
  }
  if (waiting) return { kind: 'badge', ...waiting }
  if (signals.paused) return { kind: 'paused' }
  if (unread) return { kind: 'badge', ...unread }
  return { kind: 'none' }
}

/**
 * A project or group row. Chat is hidden on the active scope (its Chat tab
 * already shows it); activities and process runs show everywhere, because
 * nothing else in the nav surfaces them once the user moves on.
 */
export function scopeRowIndicator(
  state: BadgeState,
  { active }: { active: boolean },
): NavRowIndicator {
  return navRowIndicator({
    running:
      (!active && state.chat_messages.thinking) ||
      state.activity.running > 0 ||
      state.process.running > 0,
    paused: state.activity.paused > 0,
    waiting: { count: state.process.waiting, category: 'processes' },
    unread: { count: active ? 0 : state.chat_messages.unread, category: 'chat' },
  })
}

/** A per-project shell tab row. `viewing` = the user is on this tab now. */
export function shellTabIndicator(
  tab: ShellTabKey,
  counts: BadgeCounts,
  { viewing }: { viewing: boolean },
): NavRowIndicator {
  switch (tab) {
    case 'chat':
      return chatTabIndicator(counts)
    case 'git':
      return navRowIndicator({ running: false, unread: { count: counts.git, category: 'git' } })
    case 'processes':
      return navRowIndicator({
        running: counts.processesRunning > 0,
        waiting: { count: counts.processesWaiting, category: 'processes' },
      })
    case 'app':
      if (viewing) return { kind: 'none' }
      return navRowIndicator({
        running: counts.activityWorking,
        paused: counts.activityPaused,
        unread: { count: counts.activityUnseen, category: 'activity' },
      })
    default:
      return { kind: 'none' }
  }
}

/** A per-group tab row — only Chat carries a channel at group scope. */
export function groupTabIndicator(tab: GroupTabKey, counts: BadgeCounts): NavRowIndicator {
  return tab === 'chat' ? chatTabIndicator(counts) : { kind: 'none' }
}

function chatTabIndicator(counts: BadgeCounts): NavRowIndicator {
  return navRowIndicator({
    running: counts.chatThinking,
    unread: { count: counts.chat, category: 'chat' },
  })
}

/** Plain-language meaning of a nav count — the badge tooltip and the dot's title. */
export function navBadgeLabel({ count, category }: NavBadge): string {
  const n = formatBadgeCount(count)
  const one = count === 1
  switch (category) {
    case 'chat':
      return `${n} unread`
    case 'processes':
      return `${n} ${one ? 'run' : 'runs'} waiting for you`
    case 'activity':
      return `${n} new ${one ? 'result' : 'results'}`
    case 'git':
      return `${n} git ${one ? 'change' : 'changes'}`
    case 'tests':
      return `${n} failing ${one ? 'test' : 'tests'}`
    case 'cross-project':
      return `${n} ${one ? 'request' : 'requests'}`
  }
}
