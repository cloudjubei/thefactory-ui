import { describe, expect, it } from 'vitest'

import { llmConfigBilling } from './llmConfigBilling'
import { DEFAULT_LLM_CONFIG_BILLING, LLM_CONFIG_BILLING_OPTIONS } from './llmConfigBillingConstants'
import type { StoredLlmConfig } from './llmConfigBillingTypes'

/**
 * Stored configs as `GET /credentials/llm-configs` serves them: an Anthropic
 * key with a cache-read override (billed per token, nothing declared), and a
 * local Ollama endpoint behind the OpenAI-compatible `custom` provider,
 * declared free.
 */
const anthropicKey: StoredLlmConfig = {
  id: '4f0c2a51-3d5e-4a8e-9b61-0f3e0c1d7a22',
  name: 'Claude Sonnet (work)',
  provider: 'anthropic',
  model: 'claude-sonnet-4-6',
  costCacheReadInputPerMTokensUSD: 0.3,
}

const localOllama: StoredLlmConfig = {
  id: 'b7d1e9c0-6a2f-4c13-8e57-2d9a4b0f1c38',
  name: 'Qwen 3 (local)',
  provider: 'custom',
  model: 'qwen3:32b',
  apiUrlOverride: 'http://localhost:11434/v1',
  billing: 'free',
}

describe('llmConfigBilling', () => {
  it('is the billing a config declares', () => {
    expect(llmConfigBilling(localOllama)).toBe('free')
  })

  it('is metered for a config that declares none, and for a new one', () => {
    expect(llmConfigBilling(anthropicKey)).toBe('metered')
    expect(llmConfigBilling(null)).toBe('metered')
    expect(DEFAULT_LLM_CONFIG_BILLING).toBe('metered')
  })
})

describe('LLM_CONFIG_BILLING_OPTIONS', () => {
  it('offers metered first, then free and subscription, each once', () => {
    expect(LLM_CONFIG_BILLING_OPTIONS.map((o) => o.value)).toEqual([
      'metered',
      'free',
      'subscription',
    ])
  })

  it('explains each in one line', () => {
    for (const option of LLM_CONFIG_BILLING_OPTIONS) {
      expect(option.label.length).toBeGreaterThan(0)
      expect(option.description.length).toBeGreaterThan(0)
      expect(option.description).not.toContain('\n')
    }
  })
})
