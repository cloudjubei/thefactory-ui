import type { SecretRevealEvent, SecretRevealState, ShownSecret } from './secretRevealTypes'

/** A secret field as it opens: masked, nothing fetched. */
export const SECRET_REVEAL_CLOSED: SecretRevealState = { phase: 'hidden', failed: false }

/**
 * The next reveal state. A stored secret is fetched only after the person
 * confirmed, and forgotten when hidden again or once they type, so an unchanged
 * field still means "keep the stored one". A fetch that comes back after the
 * person moved on is ignored.
 */
export function secretRevealReducer(
  state: SecretRevealState,
  event: SecretRevealEvent,
): SecretRevealState {
  switch (event.type) {
    case 'toggle': {
      if (state.phase !== 'hidden') return SECRET_REVEAL_CLOSED
      if (event.typed) {
        return event.confirmTyped
          ? { phase: 'confirming', pending: 'typed', failed: false }
          : { phase: 'shown', failed: false }
      }
      return event.canFetch
        ? { phase: 'confirming', pending: 'stored', failed: false }
        : { phase: 'shown', failed: false }
    }
    case 'confirm':
      if (state.phase !== 'confirming') return state
      return state.pending === 'stored'
        ? { phase: 'fetching', failed: false }
        : { phase: 'shown', failed: false }
    case 'cancel':
      return state.phase === 'confirming' ? SECRET_REVEAL_CLOSED : state
    case 'fetched':
      return state.phase === 'fetching'
        ? { phase: 'shown', stored: event.value, failed: false }
        : state
    case 'fetchFailed':
      return state.phase === 'fetching' ? { phase: 'hidden', failed: true } : state
    case 'typed': {
      const { stored: _dropped, ...rest } = state
      return { ...rest, failed: false }
    }
  }
}

/** What the field shows: what the person typed, else the fetched secret, held only while shown. */
export function shownSecret(state: SecretRevealState, typed: string): ShownSecret {
  return { value: typed !== '' ? typed : (state.stored ?? ''), masked: state.phase !== 'shown' }
}
