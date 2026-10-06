/**
 * What a chat's asks last read as, kept for the life of the app rather than of
 * a chat view — so coming back to a chat paints its rows as they were at once,
 * while the hooks re-read in the background. Without it a row waiting on the
 * user read "did not run" for the moment between the cached transcript and the
 * asks arriving. Module-level like `processViewCache`; each hook writes what it reads.
 */

import type { PendingAction } from '../api/generated'
import { BoundedCache } from '../utils/boundedCache'
import { CHAT_ASKS_CACHE_CAPACITY } from '../utils/chatAsksCacheConstants'
import type { CliDecidedAsk } from '../utils/cliRunActivityTypes'

/** A chat's undecided asks, by chat key. */
export const pendingChatActionsCache = new BoundedCache<PendingAction[]>(CHAT_ASKS_CACHE_CAPACITY)

/** A chat's decided asks, by chat key. */
export const decidedChatAsksCache = new BoundedCache<readonly CliDecidedAsk[]>(
  CHAT_ASKS_CACHE_CAPACITY,
)
