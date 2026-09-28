import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./generated', () => ({
  getPricing: vi.fn(),
  refreshPricing: vi.fn(),
}))

import { getPricing } from './generated'
import { getPrice, setCachedPricing } from './pricingService'
import type { PricingSnapshot } from './sdkTypes'

/**
 * Entries copied from the backend's real `.factory/prices.json` (3,811 prices),
 * plus the curated Cursor price for Composer 2.5 ($0.50 in / $0.20 cache read /
 * $2.50 out per 1M, from Cursor's own docs). The first three are the models the
 * old fuzzy lookup wrongly matched CLI names to.
 */
const snapshot = (): PricingSnapshot => ({
  updatedAt: new Date().toISOString(),
  prices: [
    {
      provider: 'bedrock',
      model: 'bedrock/eu-west-3/mistral.mistral-7b-instruct-v0:2',
      inputPerMTokensUSD: 0.2,
      outputPerMTokensUSD: 0.26,
      currency: 'USD',
    },
    {
      provider: 'moonshot',
      model: 'moonshot/moonshot-v1-auto',
      inputPerMTokensUSD: 2,
      outputPerMTokensUSD: 5,
      currency: 'USD',
    },
    {
      provider: 'anthropic',
      model: 'claude-3-opus-20240229',
      inputPerMTokensUSD: 15,
      outputPerMTokensUSD: 75,
      cacheReadInputPerMTokensUSD: 1.5,
      currency: 'USD',
    },
    {
      provider: 'anthropic',
      model: 'claude-sonnet-5',
      inputPerMTokensUSD: 2,
      outputPerMTokensUSD: 10,
      cacheReadInputPerMTokensUSD: 0.2,
      currency: 'USD',
    },
    {
      provider: 'openai',
      model: 'gpt-5',
      inputPerMTokensUSD: 1.25,
      outputPerMTokensUSD: 10,
      cacheReadInputPerMTokensUSD: 0.125,
      currency: 'USD',
    },
    {
      provider: 'cursor',
      model: 'composer-2.5',
      inputPerMTokensUSD: 0.5,
      outputPerMTokensUSD: 2.5,
      cacheReadInputPerMTokensUSD: 0.2,
      currency: 'USD',
    },
  ],
})

describe('getPrice', () => {
  beforeEach(() => {
    setCachedPricing(snapshot())
  })

  it("finds nothing for Cursor's label rather than an unrelated model that shares a digit", async () => {
    expect(await getPrice('cursor', 'Composer 2.5')).toBeUndefined()
  })

  it("finds nothing for 'auto' rather than a model whose name ends in it", async () => {
    expect(await getPrice('cursor', 'auto')).toBeUndefined()
    expect(await getPrice('cursor-agent', 'Auto')).toBeUndefined()
  })

  it('finds nothing for an alias that only a substring of a real id contains', async () => {
    expect(await getPrice('anthropic', 'opus')).toBeUndefined()
    expect(await getPrice('openai', '')).toBeUndefined()
    expect(await getPrice(undefined, 'gpt-5')).toBeUndefined()
  })

  it('finds a price by its exact provider and model, whatever the case', async () => {
    expect((await getPrice('cursor', 'composer-2.5'))?.inputPerMTokensUSD).toBe(0.5)
    expect((await getPrice('Anthropic', 'Claude-Sonnet-5'))?.outputPerMTokensUSD).toBe(10)
  })

  it('finds a price the catalogue keys as provider/model', async () => {
    expect((await getPrice('moonshot', 'moonshot-v1-auto'))?.inputPerMTokensUSD).toBe(2)
  })

  it('reads the cached snapshot without asking the backend again', async () => {
    await getPrice('openai', 'gpt-5')
    expect(getPricing).not.toHaveBeenCalled()
  })
})
