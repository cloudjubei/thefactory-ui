/**
 * How an API config's calls are paid for, from the form that declares it to
 * the run that is ledgered under it. A config left metered is charged at list
 * price; one declared free or on a subscription is charged $0 with its tokens
 * still counted — which only holds if the declaration reaches the run. Pure.
 */

import type { BillingBasis } from 'thefactory-tools/types'

import { DEFAULT_LLM_CONFIG_BILLING } from './llmConfigBillingConstants'
import type { AgentRunLlmConfig, StoredLlmConfig } from './llmConfigBillingTypes'

/** The billing a stored config declares; metered for one that declares none, or a new one. */
export function llmConfigBilling(config: StoredLlmConfig | null | undefined): BillingBasis {
  return config?.billing ?? DEFAULT_LLM_CONFIG_BILLING
}

/**
 * The LLM config an agent run is started with: the stored config's connection
 * and price overrides, and its billing — without it, the backend ledgers a
 * free or subscription config's calls as metered at list price and counts them
 * toward a spend cap. The entry's own bookkeeping (when it was created) stays
 * behind.
 */
export function agentRunLlmConfig(config: StoredLlmConfig): AgentRunLlmConfig {
  return {
    id: config.id,
    name: config.name,
    provider: config.provider,
    model: config.model,
    apiKey: config.apiKey,
    apiUrlOverride: config.apiUrlOverride,
    costInputPerMTokensUSD: config.costInputPerMTokensUSD,
    costOutputPerMTokensUSD: config.costOutputPerMTokensUSD,
    costCacheReadInputPerMTokensUSD: config.costCacheReadInputPerMTokensUSD,
    ...(config.billing ? { billing: config.billing } : {}),
  }
}
