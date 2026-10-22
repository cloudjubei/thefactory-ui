import type { BillingBasis } from 'thefactory-tools/types'

import type { SignoffTimePart } from './signoffWorkTypes'

/** The parts of a time bar, in the order they are drawn. */
export const SIGNOFF_TIME_PARTS: readonly SignoffTimePart[] = [
  'thinking',
  'tools',
  'system',
  'checks',
  'other',
]

export const SIGNOFF_TIME_PART_LABELS: Record<SignoffTimePart, string> = {
  thinking: 'Agents thinking',
  tools: 'Agents’ tools',
  system: 'System',
  checks: 'Checks',
  other: 'Not accounted for',
}

/** The step kinds whose work is checks, not agents. */
export const SIGNOFF_CHECK_STEP_KINDS: readonly string[] = ['check']

/** The step kinds whose time and cost a sign-off's work adds up — a nested run counts its own. */
export const SIGNOFF_UNCOUNTED_STEP_KINDS: readonly string[] = ['process', 'gate']

/** The step kinds that run an agent of their own. */
export const SIGNOFF_AGENT_STEP_KINDS: readonly string[] = ['agent', 'judge', 'report', 'capture']

/** How a cost's billing reads on the Cost tile. */
export const SIGNOFF_BILLING_WORDS: Record<BillingBasis, string> = {
  subscription: 'subscription',
  metered: 'API',
  free: 'free',
}

export const SIGNOFF_BILLING_MIXED = 'mixed billing'

/** What the Cost tile's breakdown says billed and list price mean. */
export const SIGNOFF_BILLING_NOTES: Record<BillingBasis | 'mixed', string> = {
  subscription: 'List price is what the same tokens would cost on the API.',
  metered: 'Billed per token on an API key. List price is the same tokens at catalogue prices.',
  free: 'These models are free, so nothing was charged.',
  mixed:
    'Part of this ran on a subscription and part on an API key. List price is every token at catalogue prices.',
}

export const SIGNOFF_TIME_WORK_SUFFIX = 'of work'
export const SIGNOFF_TIME_WAITING = (waiting: string) => `+ ${waiting} waiting for you`
export const SIGNOFF_TIME_WAITING_LEGEND = (waiting: string) =>
  `Waiting for you ${waiting} (not counted)`
export const SIGNOFF_COST_BILLED_SUFFIX = 'billed'
