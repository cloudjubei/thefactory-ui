import type { ProcessParkChoice, ProcessPartialProofOffer } from 'thefactory-tools/types'

import { PARTIAL_PROOF_COPY } from './processPartialProofViewConstants'
import type { PartialProofView } from './processPartialProofViewTypes'

function points(items: readonly string[]): string[] {
  return [...new Set(items.map((item) => item.trim()).filter((item) => item.length > 0))]
}

/**
 * What a proof showed and the points it could not show, as two lists: the
 * second says nothing in it is proven. `undefined` when every point was shown.
 * Pure.
 */
export function partialProofView(
  proof: Pick<ProcessPartialProofOffer, 'shown' | 'notShown'>,
): PartialProofView | undefined {
  const notShown = points(proof.notShown)
  if (notShown.length === 0) return undefined
  return {
    shown: { title: PARTIAL_PROOF_COPY.shown, items: points(proof.shown) },
    notShown: {
      title: PARTIAL_PROOF_COPY.notShown,
      items: notShown,
      caveat: PARTIAL_PROOF_COPY.caveat,
    },
  }
}

/** The partial proof a stop's answers are about, off the first that carries it. Pure. */
export function partialProofOfChoices(
  choices: readonly Pick<ProcessParkChoice, 'partialProof'>[],
): ProcessPartialProofOffer | undefined {
  return choices.find((c) => c.partialProof)?.partialProof
}
