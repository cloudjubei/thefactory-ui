import { describe, expect, it } from 'vitest'
import type { ModelPrice } from 'thefactory-tools/types'

import { formatRatePerMTokens, priceListEntryView } from './priceList'
import { PRICE_RATE_LABELS } from './priceListConstants'

/**
 * Rows as `GET /pricing` serves them: claude-sonnet-4-5 as LiteLLM lists it
 * (3e-6 / 1.5e-5 per token, cache read 3e-7, five-minute write 3.75e-6,
 * one-hour write 6e-6), gpt-5 from LiteLLM (no cache-write rate — OpenAI bills
 * writes at the input rate), Cursor's own Composer 2.5 (no cache-write rate
 * published), and a row imported before sources were kept.
 */
const sonnet: ModelPrice = {
  provider: 'anthropic',
  model: 'claude-sonnet-4-5',
  inputPerMTokensUSD: 3,
  outputPerMTokensUSD: 15,
  cacheReadInputPerMTokensUSD: 0.3,
  cacheWriteInputPerMTokensUSD: 3.75,
  cacheWrite1hInputPerMTokensUSD: 6,
  source: 'litellm',
  currency: 'USD',
}

const gpt5: ModelPrice = {
  provider: 'openai',
  model: 'gpt-5',
  inputPerMTokensUSD: 1.25,
  outputPerMTokensUSD: 10,
  cacheReadInputPerMTokensUSD: 0.125,
  source: 'litellm',
  currency: 'USD',
}

const composer: ModelPrice = {
  provider: 'cursor',
  model: 'composer-2.5',
  inputPerMTokensUSD: 0.5,
  cacheReadInputPerMTokensUSD: 0.2,
  outputPerMTokensUSD: 2.5,
  source: 'cursor',
  currency: 'USD',
}

const olderRow: ModelPrice = {
  provider: 'deepseek',
  model: 'deepseek-chat',
  inputPerMTokensUSD: 0.27,
  outputPerMTokensUSD: 1.1,
}

describe('priceListEntryView', () => {
  it('lists every rate a model is billed at, the one-hour cache write included, and where the price came from', () => {
    expect(priceListEntryView(sonnet)).toEqual({
      key: 'anthropic/claude-sonnet-4-5',
      provider: 'anthropic',
      model: 'claude-sonnet-4-5',
      source: 'LiteLLM',
      rates: [
        { key: 'input', label: 'Input', value: '$3.00' },
        { key: 'output', label: 'Output', value: '$15.00' },
        { key: 'cacheRead', label: 'Cache read', value: '$0.30' },
        { key: 'cacheWrite', label: 'Cache write', value: '$3.75' },
        { key: 'cacheWrite1h', label: 'Cache write (1h)', value: '$6.00' },
      ],
    })
  })

  it('says a cache rate the catalogue leaves out is billed at the input rate — as the ledger prices it', () => {
    const { rates } = priceListEntryView(gpt5)
    expect(rates).toEqual([
      { key: 'input', label: 'Input', value: '$1.25' },
      { key: 'output', label: 'Output', value: '$10.00' },
      { key: 'cacheRead', label: 'Cache read', value: '$0.125' },
      { key: 'cacheWrite', label: 'Cache write', value: '$1.25 (input rate)' },
      { key: 'cacheWrite1h', label: 'Cache write (1h)', value: '$1.25 (input rate)' },
    ])
    expect(priceListEntryView(olderRow).rates).toContainEqual({
      key: 'cacheRead',
      label: 'Cache read',
      value: '$0.27 (input rate)',
    })
  })

  it('says a one-hour cache write the catalogue leaves out is billed at the cache-write rate — as the ledger prices it', () => {
    const { cacheWrite1hInputPerMTokensUSD: _oneHour, ...haiku } = {
      ...sonnet,
      model: 'claude-3-5-haiku',
      inputPerMTokensUSD: 0.8,
      outputPerMTokensUSD: 4,
      cacheReadInputPerMTokensUSD: 0.08,
      cacheWriteInputPerMTokensUSD: 1,
    }
    expect(priceListEntryView(haiku).rates).toEqual([
      { key: 'input', label: 'Input', value: '$0.80' },
      { key: 'output', label: 'Output', value: '$4.00' },
      { key: 'cacheRead', label: 'Cache read', value: '$0.08' },
      { key: 'cacheWrite', label: 'Cache write', value: '$1.00' },
      { key: 'cacheWrite1h', label: 'Cache write (1h)', value: '$1.00 (cache-write rate)' },
    ])
  })

  it('lists every rate a price can carry, in the order and words every client shows them', () => {
    expect(priceListEntryView(olderRow).rates.map((r) => [r.key, r.label])).toEqual(
      Object.entries(PRICE_RATE_LABELS),
    )
  })

  it("names Cursor's own published prices as the source of a Composer row", () => {
    const view = priceListEntryView(composer)
    expect(view.source).toBe('Cursor’s published prices')
    expect(view.rates).toContainEqual({
      key: 'cacheWrite',
      label: 'Cache write',
      value: '$0.50 (input rate)',
    })
  })

  it('says when a row records no source, and names an unfamiliar one as it is', () => {
    expect(priceListEntryView(olderRow).source).toBe('Not recorded')
    expect(priceListEntryView({ ...olderRow, source: 'manual' }).source).toBe('manual')
  })
})

describe('formatRatePerMTokens', () => {
  it('keeps two decimals, and up to four for sub-cent rates', () => {
    expect(formatRatePerMTokens(15)).toBe('$15.00')
    expect(formatRatePerMTokens(0.125)).toBe('$0.125')
    expect(formatRatePerMTokens(0.0375)).toBe('$0.0375')
  })
})
