import { useEffect, useReducer, useRef } from 'react'
import { SECRET_REVEAL_CLOSED, secretRevealReducer, shownSecret } from '../utils/secretRevealUtils'
import type { ShownSecret } from '../utils/secretRevealTypes'

export type SecretReveal = {
  shown: ShownSecret
  confirming: boolean
  fetching: boolean
  failed: boolean
  toggle: () => void
  confirm: () => void
  cancel: () => void
  /** The person typed: a fetched secret gives way to what they type. */
  typed: () => void
}

/**
 * The reveal of one secret field, on every platform: `typed` is what the field
 * holds, `onReveal` fetches the stored secret it does not hold — the person
 * confirms first ({@link secretRevealReducer}) — and `confirmTyped` asks before
 * showing typed text too.
 */
export function useSecretReveal(opts: {
  typed: string
  onReveal?: () => Promise<string>
  confirmTyped: boolean
}): SecretReveal {
  const [state, dispatch] = useReducer(secretRevealReducer, SECRET_REVEAL_CLOSED)
  const onRevealRef = useRef(opts.onReveal)
  onRevealRef.current = opts.onReveal

  useEffect(() => {
    const reveal = onRevealRef.current
    if (state.phase !== 'fetching' || !reveal) return
    reveal().then(
      (value) => dispatch({ type: 'fetched', value }),
      () => dispatch({ type: 'fetchFailed' }),
    )
  }, [state.phase])

  return {
    shown: shownSecret(state, opts.typed),
    confirming: state.phase === 'confirming',
    fetching: state.phase === 'fetching',
    failed: state.failed,
    toggle: () =>
      dispatch({
        type: 'toggle',
        typed: opts.typed !== '',
        canFetch: opts.onReveal !== undefined,
        confirmTyped: opts.confirmTyped,
      }),
    confirm: () => dispatch({ type: 'confirm' }),
    cancel: () => dispatch({ type: 'cancel' }),
    typed: () => dispatch({ type: 'typed' }),
  }
}
