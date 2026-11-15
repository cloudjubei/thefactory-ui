import { describe, expect, it } from 'vitest'
import type { ProcessParkChoice } from 'thefactory-tools/types'

import { partialProofOfChoices, partialProofView } from './processPartialProofView'
import { PARTIAL_PROOF_COPY } from './processPartialProofViewConstants'

const offer = {
  stepId: 'verify',
  entryId: 'v2',
  shown: ['Dashboard tile', 'Settings toggle'],
  notShown: ['Push when the room fills'],
}

describe('partialProofView', () => {
  it('lists what was shown and what was not, the not-shown list marked as not proven', () => {
    expect(partialProofView(offer)).toEqual({
      shown: { title: PARTIAL_PROOF_COPY.shown, items: ['Dashboard tile', 'Settings toggle'] },
      notShown: {
        title: PARTIAL_PROOF_COPY.notShown,
        items: ['Push when the room fills'],
        caveat: PARTIAL_PROOF_COPY.caveat,
      },
    })
  })

  it('keeps an empty shown list when nothing counted', () => {
    expect(partialProofView({ shown: [], notShown: ['A'] })?.shown.items).toEqual([])
  })

  it('drops blank and repeated points', () => {
    expect(
      partialProofView({ shown: ['A', ' A ', ''], notShown: ['B', '  ', 'B', 'C'] }),
    ).toMatchObject({ shown: { items: ['A'] }, notShown: { items: ['B', 'C'] } })
  })

  it('is nothing when every point was shown', () => {
    expect(partialProofView({ shown: ['A'], notShown: [] })).toBeUndefined()
    expect(partialProofView({ shown: ['A'], notShown: [' '] })).toBeUndefined()
  })

  it('copies the lists rather than sharing them', () => {
    const view = partialProofView(offer)!
    view.notShown.items.push('x')
    expect(offer.notShown).toEqual(['Push when the room fills'])
  })
})

describe('partialProofOfChoices', () => {
  const plain: ProcessParkChoice = { choice: 'abandon', label: 'Stop here', detail: 'Ends it.' }

  it('reads the offer off the first answer that carries one', () => {
    const carry: ProcessParkChoice = {
      choice: 'continue',
      label: 'Carry on — try the rest at sign-off',
      detail: 'd',
      primary: true,
      partialProof: offer,
    }
    expect(partialProofOfChoices([plain, carry])).toBe(offer)
  })

  it('is nothing at a stop whose answers carry none', () => {
    expect(partialProofOfChoices([plain])).toBeUndefined()
    expect(partialProofOfChoices([])).toBeUndefined()
  })
})
