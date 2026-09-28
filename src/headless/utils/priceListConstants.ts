import { PRICE_SOURCE_CURSOR, PRICE_SOURCE_LITELLM } from 'thefactory-tools/constants'

import type { PriceRateKey } from './priceListTypes'

/**
 * Every rate a price can list, in the order a price list shows them — one
 * list, so a panel of columns and a panel of lines name and order them alike.
 */
export const PRICE_RATE_LABELS: Readonly<Record<PriceRateKey, string>> = {
  input: 'Input',
  output: 'Output',
  cacheRead: 'Cache read',
  cacheWrite: 'Cache write',
  cacheWrite1h: 'Cache write (1h)',
}

/** A price's source, in words — the tools' `ModelPrice.source` keys. */
export const PRICE_SOURCE_LABELS: Readonly<Record<string, string>> = {
  [PRICE_SOURCE_LITELLM]: 'LiteLLM',
  [PRICE_SOURCE_CURSOR]: 'Cursor’s published prices',
}

/** The source of a row imported before sources were kept. */
export const PRICE_SOURCE_UNRECORDED = 'Not recorded'

/** Beside a cache rate the catalogue leaves out: the ledger bills it at the input rate. */
export const PRICE_RATE_AT_INPUT = '(input rate)'

/**
 * Beside a one-hour cache write the catalogue leaves out on a model it lists
 * a cache-write rate for: the ledger bills it at that default-lifetime rate.
 */
export const PRICE_RATE_AT_CACHE_WRITE = '(cache-write rate)'
