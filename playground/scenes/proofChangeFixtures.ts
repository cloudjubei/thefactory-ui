import type { ProcessProofChangeOffer } from 'thefactory-tools/types'
import type { ProofChangeKeptLook } from 'thefactory-ui/headless'

/** A feature run whose change shows on screen, stopped on screens it did not file: they stay. */
export const VISIBLE_CHANGE_OFFER: ProcessProofChangeOffer = {
  featureId: 'b41f02c7',
  stepId: 'verify',
  current: ['unit-tests', 'checks', 'ui-before-after'],
  standings: [
    { kind: 'unit-tests', status: 'met', detail: '14 tests passed.' },
    { kind: 'checks', status: 'met', detail: 'Typecheck and lint passed.' },
    {
      kind: 'ui-before-after',
      status: 'unmet',
      detail: 'The verifier filed no before/after pair for the settings row.',
    },
  ],
  unavailable: [],
  keepsScreens: true,
}

/** The same run proven by a before/after video beside its screens, stopped on both: both stay. */
export const VISIBLE_VIDEO_CHANGE_OFFER: ProcessProofChangeOffer = {
  ...VISIBLE_CHANGE_OFFER,
  current: [...VISIBLE_CHANGE_OFFER.current, 'ui-video'],
  standings: [
    ...VISIBLE_CHANGE_OFFER.standings,
    {
      kind: 'ui-video',
      status: 'unmet',
      detail: 'The verifier filed no before/after recording of scrolling back to the settings row.',
    },
  ],
}

/** The looks for screens that stay, each with why it is or is not the pick. */
export const KEPT_LOOKS: { id: ProofChangeKeptLook; label: string; note: string }[] = [
  {
    id: 'reason',
    label: 'Held, with why',
    note: 'The pick. The row stays where people look for it, switched on and greyed, and the line beneath says why on every client, phone included.',
  },
  {
    id: 'hidden',
    label: 'Left out',
    note: 'Shortest list, but the screens vanish from what proves it, and the note under the heading is easy to miss.',
  },
  {
    id: 'lock',
    label: 'Stays chip',
    note: 'Compact and reads as held, but the why lives only in the chip’s hover: a phone has none.',
  },
]
