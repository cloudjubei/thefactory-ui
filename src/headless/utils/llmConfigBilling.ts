/**
 * How an API config's calls are paid for, from the form that declares it to
 * the run that is ledgered under it. A config left metered is charged at list
 * price; one declared free or on a subscription is charged $0 with its tokens
 * still counted — which only holds if the declaration reaches the run. Pure.
 */

import type { BillingBasis } from 'thefactory-tools/types'

import { DEFAULT_LLM_CONFIG_BILLING } from './llmConfigBillingConstants'
import type { StoredLlmConfig } from './llmConfigBillingTypes'

/** The billing a stored config declares; metered for one that declares none, or a new one. */
export function llmConfigBilling(config: StoredLlmConfig | null | undefined): BillingBasis {
  return config?.billing ?? DEFAULT_LLM_CONFIG_BILLING
}
