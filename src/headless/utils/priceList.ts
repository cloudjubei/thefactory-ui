/**
 * The model price list, worded once for the pricing panels of every client.
 *
 * A price is only as trustworthy as where it came from — LiteLLM's catalogue
 * or Cursor's own published prices — so each row names its source. And a cost
 * is only explained by every rate it was priced at, so cache writes show beside
 * cache reads. A rate the catalogue leaves out is shown as the rate the ledger
 * (the tools' `costParts`) bills it at, said so: a cache read or write at the
 * input rate, a one-hour write at the cache-write rate — never as a blank that
 * reads as free, and never as a rate one client fills in on its own. Pure.
 */

import type { ModelPrice } from 'thefactory-tools/types'

import {
  PRICE_RATE_AT_CACHE_WRITE,
  PRICE_RATE_AT_INPUT,
  PRICE_RATE_LABELS,
  PRICE_SOURCE_LABELS,
  PRICE_SOURCE_UNRECORDED,
} from './priceListConstants'
import type { PriceListEntryView, PriceRate, PriceRateKey } from './priceListTypes'

const RATE = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
})

/** USD per 1M tokens: two decimals, and up to four so a sub-cent rate stays visible. */
export function formatRatePerMTokens(usdPerMTokens: number): string {
  return RATE.format(usdPerMTokens)
}

/** A cache rate, or — when the catalogue lists none — the input rate it is billed at, said so. */
function cacheRate(rate: number | undefined, inputRate: number): string {
  return rate === undefined
    ? `${formatRatePerMTokens(inputRate)} ${PRICE_RATE_AT_INPUT}`
    : formatRatePerMTokens(rate)
}

/**
 * The one-hour cache write, or — when the catalogue lists none — the rate the
 * ledger falls back to: the cache-write rate, else the input rate, said so.
 */
function oneHourWriteRate(price: ModelPrice): string {
  if (price.cacheWrite1hInputPerMTokensUSD !== undefined) {
    return formatRatePerMTokens(price.cacheWrite1hInputPerMTokensUSD)
  }
  if (price.cacheWriteInputPerMTokensUSD === undefined) {
    return cacheRate(undefined, price.inputPerMTokensUSD)
  }
  return `${formatRatePerMTokens(price.cacheWriteInputPerMTokensUSD)} ${PRICE_RATE_AT_CACHE_WRITE}`
}

const rate = (key: PriceRateKey, value: string): PriceRate => ({
  key,
  label: PRICE_RATE_LABELS[key],
  value,
})

/** One price-list row: the model, where its price came from, and every rate it is billed at. */
export function priceListEntryView(price: ModelPrice): PriceListEntryView {
  const input = price.inputPerMTokensUSD
  const rates: PriceRate[] = [
    rate('input', formatRatePerMTokens(input)),
    rate('output', formatRatePerMTokens(price.outputPerMTokensUSD)),
    rate('cacheRead', cacheRate(price.cacheReadInputPerMTokensUSD, input)),
    rate('cacheWrite', cacheRate(price.cacheWriteInputPerMTokensUSD, input)),
    rate('cacheWrite1h', oneHourWriteRate(price)),
  ]
  return {
    key: `${price.provider}/${price.model}`,
    provider: price.provider,
    model: price.model,
    source: price.source
      ? (PRICE_SOURCE_LABELS[price.source] ?? price.source)
      : PRICE_SOURCE_UNRECORDED,
    rates,
  }
}
