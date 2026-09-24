import type { BadgeColorCategory } from '../types/settings'

/** A count on a nav row, coloured by its notification category. */
export type NavBadge = { count: number; category: BadgeColorCategory }

/**
 * The single thing a nav row shows at its trailing edge. Web `NavRow` and
 * native `NavDrawer` both render this and nothing else, so their precedence
 * cannot drift.
 */
export type NavRowIndicator =
  | { kind: 'spinner'; dot?: NavBadge }
  | ({ kind: 'badge' } & NavBadge)
  | { kind: 'paused' }
  | { kind: 'none' }

/**
 * What a row knows about its scope. `waiting` is work that needs the user and
 * outranks the paused icon; `unread` is informational and only shows when
 * nothing else does. A running row carries either as its spinner's dot.
 */
export type NavRowSignals = {
  running: boolean
  paused?: boolean
  waiting?: NavBadge
  unread?: NavBadge
}
