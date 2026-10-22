import type { UsageCompletenessReason } from 'thefactory-tools/types'

import type { UsageTableRow } from './usageBreakdownTypes'

/**
 * The usage tables' columns, in order, each naming the row cell it shows — one
 * list, so web and native lay a row out alike. What a person reads the modal
 * for leads: the charge and the tokens it did not cover, before the raw counts.
 */
export const USAGE_TABLE_COLUMNS: ReadonlyArray<{
  label: string
  cell: Exclude<
    keyof UsageTableRow,
    'key' | 'total' | 'cacheRatio' | 'notReportedBy' | 'incomplete' | 'chargeReason'
  >
}> = [
  { label: 'Group', cell: 'label' },
  { label: 'Charged', cell: 'charged' },
  { label: 'Charge', cell: 'charge' },
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
  "Charged is what was billed; a charge that is not known reads $?, never $0, and its row says why — a plan's share (a plan includes usage up to its allowance and may bill beyond it) or tokens with no known price. Included counts tokens a plan or a free model covered. Unpriced counts metered tokens with no known price: their cost is unknown, not $0.",
  `List value is what the same tokens cost at list prices, where a price is known; ${USAGE_LIST_PARTIAL} marks one that leaves out tokens with no known price or counts that were not reported.`,
  'Charge says how sure the charged figure is: Confirmed was billed per token at a known rate; In plan cost nothing extra; Unknown has no stated charge — its Charged figure reads $? because a plan can bill overage, a price is missing, or the counts are short — so it is not a confirmed $0.',
  'Not reported: the CLI named under the row ran those turns but did not report those counts — they are unknown, not zero.',
  "A message with no stored charge is estimated from its model's current price (marked ≈).",
  "Durable totals are computed from the persisted cost ledger for this 'chatKey' and do not decrease if you clear/restart/delete a chat.",
] as const

export const USAGE_LEDGER_TITLE = 'Ledger totals (durable)'
export const USAGE_LEDGER_UNAVAILABLE = 'TOTALS (unavailable)'
export const USAGE_SOURCES_TITLE = 'By executor'
export const USAGE_CURRENT_TITLE = 'CURRENT'

/** A charge status in a usage table's Charge cell. */
export const USAGE_CHARGE_CONFIRMED = 'Confirmed'
export const USAGE_CHARGE_IN_PLAN = 'In plan'
export const USAGE_CHARGE_UNKNOWN = 'Unknown'
/** Some of the row's calls have a stated charge and some do not. */
export const USAGE_CHARGE_PART_UNKNOWN = 'Part unknown'

/** Why a usage event's counts fall short, in words — each of the tools' reasons. */
export const USAGE_INCOMPLETE_REASON_LABELS: Record<UsageCompletenessReason, string> = {
  'cursor-acp-no-usage': 'No usage reported',
  'usage-not-reported': 'No usage reported',
  interrupted: 'Interrupted',
  'fallback-model': 'Model guessed',
  'stream-without-final': 'Output not reported',
  'estimated-usage': 'Estimated',
  'turn-usage-only': 'Sub-agents left out',
  'counter-decreased': 'Counter reset',
  'first-request-not-counted': 'First request left out',
  'output-not-reported': 'Output not reported',
  'cache-not-reported': 'Cache not reported',
}

/** Leads a `$?` row's reason when some of it ran on a plan: "On your Claude subscription". */
export const USAGE_REASON_PLAN = 'on your'

/** Leads a `$?` row's reason when some of its tokens have no known price. */
export const USAGE_REASON_NO_PRICE = 'no known price for'

/** Between the reasons a `$?` row's charge is unknown. */
export const USAGE_REASON_SEPARATOR = '; '

/** Between the reasons a row's counts fall short. */
export const USAGE_INCOMPLETE_SEPARATOR = ' · '
