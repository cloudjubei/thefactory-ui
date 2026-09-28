/** Which of a model's rates a {@link PriceRate} is. */
export type PriceRateKey = 'input' | 'output' | 'cacheRead' | 'cacheWrite' | 'cacheWrite1h'

/** One rate a model is billed at, per 1M tokens, worded. */
export interface PriceRate {
  key: PriceRateKey
  label: string
  value: string
}

/** One price-list row, worded once for every client's pricing panel. */
export interface PriceListEntryView {
  key: string
  /** The catalogue's provider key (`anthropic`, `cursor`) — what a provider icon reads. */
  provider: string
  model: string
  /** Where the price came from, in words: `LiteLLM`, `Cursor’s published prices`. */
  source: string
  /**
   * USD per 1M tokens: input, output, cache read, cache write and one-hour
   * cache write — every one, so a panel of columns never fills a gap itself.
   * A rate the catalogue leaves out reads as the rate it is billed at: a cache
   * rate at the input rate, a one-hour write at the cache-write rate.
   */
  rates: PriceRate[]
}
