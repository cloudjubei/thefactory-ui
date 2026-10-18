import type { VerificationSiblingFallbackOutcome } from '../api/generated'
import type { ProcessStatusTone } from './processView'
import type { SiblingFallbackCheckSetId } from './siblingFallbackViewTypes'

/** What each fallback outcome is headed as. */
export const SIBLING_FALLBACK_TITLES: Record<VerificationSiblingFallbackOutcome, string> = {
  'stable-passed': 'Passes only at the stable branch',
  'stable-failed': 'Fails at the stable branch too',
  unavailable: 'Not checked at a stable branch',
}

/** The tone each fallback outcome is shown in: all of them need the person's eye. */
export const SIBLING_FALLBACK_TONES: Record<VerificationSiblingFallbackOutcome, ProcessStatusTone> =
  {
    'stable-passed': 'on_hold',
    'stable-failed': 'stuck',
    unavailable: 'on_hold',
  }

/** How a dependency with uncommitted changes is marked on its chip. */
export const SIBLING_FALLBACK_PENDING_LABEL = 'pending changes'

/** What heads the failures a fallback lists. */
export const SIBLING_FALLBACK_FAILURES_LABELS: Record<'stable-passed' | 'stable-failed', string> = {
  'stable-passed': 'Fails with your pending changes',
  'stable-failed': 'Fails at the stable branch',
}

/** What each of a fallback attempt's two runs is called on a check list's switch. */
export const SIBLING_FALLBACK_CHECK_SET_LABELS: Record<SiblingFallbackCheckSetId, string> = {
  stable: 'Stable branch',
  live: 'Your pending changes',
}

/** A notice whose attempt a newer one with no fallback followed. */
export const SIBLING_FALLBACK_CLEARED = 'Checked again since — this no longer applies'

/** A notice whose attempt a newer one with its own fallback followed. */
export const SIBLING_FALLBACK_REPLACED = 'Checked again since — see the newer notice'
