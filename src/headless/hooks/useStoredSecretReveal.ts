import { useCallback, useState } from 'react'
import { revealStoredSecret } from '../api/secretReveals'
import { STORED_SECRET_COPY } from '../utils/storedSecretViewConstants'
import type { StoredSecretView } from '../utils/storedSecretViewTypes'

/**
 * The reveal of a stored secret an agent showed the person, on every platform:
 * `onReveal` fetches it once they confirmed, and `missing` says it is no longer
 * stored, which a retry cannot change.
 */
export function useStoredSecretReveal(secret: Pick<StoredSecretView, 'kind' | 'id'>): {
  onReveal: () => Promise<string>
  missing: boolean
} {
  const [missing, setMissing] = useState(false)
  const { kind, id } = secret
  const onReveal = useCallback(async () => {
    const out = await revealStoredSecret(kind, id)
    if ('missing' in out) {
      setMissing(true)
      throw new Error(STORED_SECRET_COPY.missing)
    }
    return out.value
  }, [kind, id])
  return { onReveal, missing }
}
