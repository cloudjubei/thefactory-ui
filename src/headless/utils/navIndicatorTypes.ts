import type { InkBadgeState, InkChannel, InkPart } from './inkBadgeTypes'

/**
 * The single thing a nav row shows at its trailing edge. Web `NavRow` and
 * native `NavDrawer` both render this and nothing else, so their precedence
 * cannot drift. `title` says in words what the row shows — its tooltip.
 */
export type NavRowIndicator =
  | { kind: 'ink'; badge: InkBadgeState; title: string }
  | { kind: 'paused'; title: string }
  | { kind: 'dot'; title: string }
  | { kind: 'none' }

/**
 * What a row knows about its scope. `parts` wait on the person; `running` is
 * the channel of what works now; `paused` is a resumable activity; `fresh` is
 * news to read, a dot shown only when nothing else is.
 */
export type NavRowSignals = {
  parts: readonly InkPart[]
  running?: InkChannel
  paused?: boolean
  fresh?: readonly InkPart[]
  /** A project or group row, which adds its parts up; a tab keeps its one channel. */
  rollup: boolean
  /** What the title lists, when it says more than the badge draws (a tab folding failed into its count). */
  described?: readonly InkPart[]
  /**
   * What broke beyond the counts, in words — an expired sign-in. Each is one
   * more red in the badge (on a tab, the whole count turns red) and is said
   * first in the title.
   */
  broke?: readonly string[]
}
