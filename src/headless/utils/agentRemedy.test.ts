import { describe, expect, it } from 'vitest'
import { declineRemedyDecision, remedyChoiceDecision } from './agentRemedy'

describe('remedyChoiceDecision', () => {
  it('approves the remedy the person chose on its card, with the trimmed hint', () => {
    expect(remedyChoiceDecision('boot-avd', '  Pixel_7  ')).toEqual({
      outcome: 'approved',
      decidedVia: 'card',
      metadata: { remedyId: 'boot-avd', value: 'Pixel_7' },
    })
  })

  it('leaves the hint out when the person gave none', () => {
    expect(remedyChoiceDecision('install-sdk', '   ').metadata).toEqual({ remedyId: 'install-sdk' })
  })
})

describe('declineRemedyDecision', () => {
  it('declines the remedy on its card', () => {
    expect(declineRemedyDecision()).toEqual({
      outcome: 'denied',
      decidedVia: 'card',
      metadata: { remedyId: '' },
    })
  })
})
