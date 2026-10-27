/**
 * A secret field's reveal: `confirming` asks the person first — for what they
 * typed (`pending: 'typed'`) or for the stored secret, which is then fetched
 * (`pending: 'stored'`); `stored` is the fetched secret, shown while the field
 * holds nothing typed; `failed` says the last fetch did not come back.
 */
export type SecretRevealState = {
  phase: 'hidden' | 'confirming' | 'fetching' | 'shown'
  pending?: 'typed' | 'stored'
  stored?: string
  failed: boolean
}

/**
 * What happens to a secret field's reveal. `toggle` is the eye: `typed` when
 * the field holds what the person typed, `canFetch` when a stored secret can be
 * fetched, `confirmTyped` when showing typed text is asked first too.
 */
export type SecretRevealEvent =
  | { type: 'toggle'; typed: boolean; canFetch: boolean; confirmTyped: boolean }
  | { type: 'confirm' }
  | { type: 'cancel' }
  | { type: 'fetched'; value: string }
  | { type: 'fetchFailed' }
  | { type: 'typed' }

/** What a secret field shows, and whether masked. */
export type ShownSecret = { value: string; masked: boolean }
