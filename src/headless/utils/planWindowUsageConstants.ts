import type { PlanWindowStatus } from './planWindowUsageTypes'

/** A window used this far reads as near its limit. */
export const PLAN_WINDOW_NEAR_PERCENT = 80

/** A window used this far has reached its limit. */
export const PLAN_WINDOW_REACHED_PERCENT = 100

/** Claude Code's window names, in minutes. */
export const CLAUDE_RATE_LIMIT_WINDOW_MINUTES: Record<string, number> = {
  five_hour: 300,
  seven_day: 10_080,
}

/** Claude Code's window statuses, as the chip reads them. */
export const CLAUDE_RATE_LIMIT_STATUS: Record<string, PlanWindowStatus> = {
  allowed: 'ok',
  allowed_warning: 'near-limit',
  rejected: 'limit-reached',
}

/** The plan-window chip's words. */
export const PLAN_WINDOW_COPY = {
  status: {
    ok: 'OK',
    'near-limit': 'Near limit',
    'limit-reached': 'Limit reached',
  } satisfies Record<PlanWindowStatus, string>,
  notReported: 'Plan usage not reported',
  window: 'Plan',
  plan: (name: string) => `${name} plan`,
  resetsIn: (span: string) => `resets in ${span}`,
  resetsNow: 'resets now',
  used: (percent: string) => `${percent} used`,
  detail: (window: string, value: string, reset: string) => `${window} window: ${value}, ${reset}`,
  chipLabel: (title: string) => `${title} plan usage. Show details`,
} as const
