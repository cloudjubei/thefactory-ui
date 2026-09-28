import type { BillingBasis } from 'thefactory-tools/types'

import type { LlmConfigBillingOption } from './llmConfigBillingTypes'

/** How a config's calls are paid for when it declares nothing: an API key, billed per token. */
export const DEFAULT_LLM_CONFIG_BILLING: BillingBasis = 'metered'

/**
 * The billing an API config can declare, the default first, each explained in
 * one line — the same words on web and native.
 */
export const LLM_CONFIG_BILLING_OPTIONS: readonly LlmConfigBillingOption[] = [
  {
    value: 'metered',
    label: 'Metered',
    description: 'An API key billed per token: each call is charged at its model’s price.',
  },
  {
    value: 'free',
    label: 'Free',
    description: 'A local or no-charge endpoint: calls cost $0, and their tokens still count.',
  },
  {
    value: 'subscription',
    label: 'Subscription',
    description:
      'Covered by a plan you already pay for: calls cost $0, their tokens counted as included.',
  },
]
