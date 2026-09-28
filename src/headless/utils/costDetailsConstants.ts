import type { BillingBasis } from 'thefactory-tools/types'

/** A price catalogue provider (or, on an older CLI run, the CLI itself) in words. */
export const COST_PROVIDER_NAMES: Record<string, string> = {
  cursor: 'Cursor',
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  'cursor-agent': 'Cursor',
  'claude-code': 'Claude Code',
  codex: 'Codex',
}

/**
 * The plan a provider's subscription tokens are included in. A Claude Code login
 * draws on a Claude plan and a Codex login on a ChatGPT plan, so the provider's
 * own name would name the wrong thing.
 */
export const COST_PLAN_NAMES: Record<string, string> = {
  cursor: 'Cursor',
  anthropic: 'Claude',
  openai: 'ChatGPT',
  'cursor-agent': 'Cursor',
  'claude-code': 'Claude',
  codex: 'ChatGPT',
}

/** How tokens were paid for, when no plan name applies. */
export const COST_BILLING_LABELS: Record<BillingBasis, string> = {
  subscription: 'Included in your subscription',
  metered: 'API key — billed per token',
  free: 'Free',
}

/** A spend recorded before billing was kept. */
export const COST_BILLING_UNRECORDED = 'Billing not recorded'

/** A row whose record names no model — an older CLI run that only noted its tool. */
export const COST_MODEL_UNRECORDED = 'Model not recorded'

/**
 * The model the tools and the backend list a run under when it named none —
 * their own placeholder, shown as {@link COST_MODEL_UNRECORDED}.
 */
export const UNREPORTED_MODEL = 'unknown'

/** The charge of metered tokens with no known price — unknown, never $0. */
export const COST_CHARGE_UNKNOWN = 'Unknown'

/** A chip, or a row's list value, when no price is known. */
export const COST_NO_KNOWN_PRICE = 'No known price'

/** The chip of a metered run still in flight: its charge is settled by the runner's terminal write. */
export const COST_CHARGE_PENDING = 'Charge pending'

/** The same, where a charge would be written in the details. */
export const COST_CHARGE_PENDING_SHORT = 'Pending'

/** A pending row's list value: the runner prices it when the run ends. */
export const COST_LIST_PENDING = 'Priced when the run ends'

/** The chip of a cost whose charge is unknown because the CLI never reported what it used — unknown, never $0. */
export const COST_TOKENS_NOT_REPORTED = 'Not reported'

/**
 * The tool to name when a count is missing: the CLI that ran the model. A CLI
 * run's rows are listed under its price provider (`cursor`), or — on a run the
 * backend read before per-model rows were kept — under the CLI itself.
 */
export const COST_REPORTING_TOOLS: Record<string, string> = {
  cursor: 'Cursor',
  'cursor-agent': 'Cursor',
  anthropic: 'Claude Code',
  'claude-code': 'Claude Code',
  openai: 'Codex',
  codex: 'Codex',
}

/** Who left a count out, when the row names no provider a CLI is priced under. */
export const COST_REPORTING_TOOL_UNKNOWN = 'the CLI'

/** Where the counts of a turn still going would be, before its CLI has reported any. */
export const COST_COUNTS_PENDING = 'Not reported yet'

/** A row's list value when the CLI reported none of its tokens. */
export const COST_LIST_TOKENS_NOT_REPORTED = 'Unknown: its tokens were not reported'

/** A row's list value when the CLI never reported its output. */
export const COST_LIST_OUTPUT_NOT_REPORTED = 'Unknown: its output was not reported'

/**
 * What a list value covers when some of the tokens beside it have none — no
 * price, or a count the CLI never reported — so a part is never read as the whole.
 */
export const COST_LIST_PARTIAL = 'for the tokens with a known price'

export const COST_NOTE_AUTO = 'Cursor does not say which model Auto used.'

export const COST_NOTE_OVERAGE =
  "Usage beyond your plan's allowance is billed by the provider; the CLI does not report which requests were."

export const COST_NOTE_UNPRICED =
  'Tokens with no known price are counted, not charged as $0: their cost is unknown.'

export const COST_NOTE_UNRECORDED_BILLING =
  'Some of this was recorded before billing was kept, so it cannot say whether those tokens were included in a plan.'

export const COST_NOTE_NO_MODELS = 'This was recorded before costs were kept per model.'

export const COST_NOTE_PENDING =
  'This run is still going: its charge is worked out from its tokens when it ends.'

/** Follows "<Tool> did not report token counts for <this turn | N turns>". */
export const COST_NOTE_TOKENS_NOT_REPORTED_TAIL =
  ': they are unknown, not zero, and left out of the totals.'

/** Follows "<Tool>" — said of a turn cut off before its `result` line. */
export const COST_NOTE_OUTPUT_NOT_REPORTED_TAIL =
  ' stopped before reporting how many output tokens it used: that output is unknown, not zero, and has no list value.'

/**
 * Follows "<Tool>" — said of a turn still streaming. Claude Code reports its
 * output only in the `result` line that ends a turn, so until then the output
 * is still to come, which is not a failure to report it.
 */
export const COST_NOTE_OUTPUT_PENDING_TAIL = ' has not reported how many output tokens it used yet.'

/** Cursor's router model: the stream never names the model that served it. */
export const CURSOR_AUTO_MODEL = 'auto'

/**
 * The providers a Cursor row is listed under: Cursor's price catalogue, or —
 * on a run the backend read before per-model rows were kept — the CLI itself.
 */
export const CURSOR_PROVIDERS: ReadonlySet<string> = new Set(['cursor', 'cursor-agent'])
