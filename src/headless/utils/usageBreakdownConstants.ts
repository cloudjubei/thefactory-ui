import type { UsageTableRow } from './usageBreakdownTypes'

/**
 * The usage tables' columns, in order, each naming the row cell it shows — one
 * list, so web and native lay a row out alike. What a person reads the modal
 * for leads: the charge and the tokens it did not cover, before the raw counts.
 */
export const USAGE_TABLE_COLUMNS: ReadonlyArray<{
  label: string
  cell: Exclude<keyof UsageTableRow, 'key' | 'total' | 'cacheRatio' | 'notReportedBy'>
}> = [
  { label: 'Group', cell: 'label' },
  { label: 'Charged', cell: 'charged' },
  { label: 'Included', cell: 'included' },
  { label: 'Unpriced', cell: 'unpriced' },
  { label: 'List value', cell: 'listValue' },
  { label: 'Tokens', cell: 'tokens' },
  { label: 'Prompt', cell: 'prompt' },
  { label: 'Completion', cell: 'completion' },
  { label: 'Cached read', cell: 'cachedRead' },
  { label: 'Cache write', cell: 'cacheWrite' },
]

/**
 * After a count a CLI left part of out — `14,701 + not reported`. Which CLI
 * is named once on the row, so the table's narrow cells never repeat it.
 */
export const USAGE_COUNT_PARTIAL = '+ not reported'

/**
 * Beside a list value that leaves some of its row's tokens out — no price, or
 * counts a CLI never reported — so a part is never read as the whole.
 */
export const USAGE_LIST_PARTIAL = '(known prices only)'

/** What the usage modal's numbers mean, said under its tables on both clients. */
export const USAGE_FOOTNOTES = [
  'Charged is what was billed. Included counts tokens a subscription or a free model covered: counted, not charged. Unpriced counts metered tokens with no known price: their cost is unknown, not $0.',
  `List value is what the same tokens cost at list prices, where a price is known; ${USAGE_LIST_PARTIAL} marks one that leaves out tokens with no known price or counts that were not reported.`,
  'Not reported: the CLI named under the row ran those turns but did not report those counts — they are unknown, not zero.',
  "A message with no stored charge is estimated from its model's current price (marked ≈).",
  "Durable totals are computed from the persisted cost ledger for this 'chatKey' and do not decrease if you clear/restart/delete a chat.",
] as const

export const USAGE_LEDGER_TITLE = 'Ledger totals (durable)'
export const USAGE_LEDGER_UNAVAILABLE = 'TOTALS (unavailable)'
export const USAGE_SOURCES_TITLE = 'By executor'
export const USAGE_CURRENT_TITLE = 'CURRENT'
