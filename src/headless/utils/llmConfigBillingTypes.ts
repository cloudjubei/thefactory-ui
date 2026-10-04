import type { BillingBasis } from 'thefactory-tools/types'

import type { GetLlmConfigResponse, StartAgentRunData } from '../api/generated'

/** One way an API config's calls can be paid for, as the config form offers it. */
export interface LlmConfigBillingOption {
  value: BillingBasis
  label: string
  /** One line on what choosing it means for how the config's calls are counted. */
  description: string
}

/**
 * A stored LLM config as a run or the config form reads it: its connection,
 * its price overrides, and how its calls are paid for (absent: metered).
 */
export type StoredLlmConfig = Pick<
  GetLlmConfigResponse,
  | 'id'
  | 'name'
  | 'provider'
  | 'model'
  | 'apiUrlOverride'
  | 'costInputPerMTokensUSD'
  | 'costOutputPerMTokensUSD'
  | 'costCacheReadInputPerMTokensUSD'
> & { billing?: BillingBasis }

/**
 * The LLM config an agent run is started with — the one its calls are priced
 * and ledgered under. It carries no key: the backend looks the stored one up.
 */
export type AgentRunLlmConfig = StartAgentRunData['body']['params']['llmConfig']
