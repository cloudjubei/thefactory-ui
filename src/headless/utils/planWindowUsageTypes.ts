/** How a plan window stands, as the CLI says it or as its share reads. */
export type PlanWindowStatus = 'ok' | 'near-limit' | 'limit-reached'

/**
 * One rate-limit window of a CLI plan, as a run saw it. Close to the per-window shape
 * thefactory-tools records on `CliAgentSubscriptionStatus`.
 */
export type PlanWindowUsage = {
  /** The share of the window used, 0–100. Absent when the CLI does not say. */
  usedPercent?: number
  /** The window's length: 300 for five hours, 10080 for seven days. */
  windowMinutes?: number
  /** Wall-clock ms when the window resets. */
  resetsAt: number
  /** What the CLI says of the window, when it says. */
  status?: PlanWindowStatus
}

/** A run's CLI plan usage: the CLI, its plan when known, and each window it reported. */
export type CliPlanUsage = {
  cli: string
  /** The plan as the CLI names it: `free`, `plus`, `pro`. */
  plan?: string
  /** Empty when the CLI reports no plan usage. */
  windows: PlanWindowUsage[]
}

/** One window as the chip draws it. */
export type PlanWindowChipWindow = {
  /** `5-hour`, `7-day`. */
  window: string
  /** The share a meter fills, 0–100, when known. */
  percent?: number
  /** `3%` when the share is known, else `OK`, `Near limit` or `Limit reached`. */
  value?: string
  status: PlanWindowStatus
  /** `resets in 3 d`. */
  reset: string
  /** The window in words, for a screen reader and the details. */
  detail: string
}

/** The plan-window chip's face and details. */
export type PlanWindowChipView = {
  /** `Codex · Free plan`. */
  title: string
  /** Shortest window first. Empty when the CLI reports nothing. */
  windows: PlanWindowChipWindow[]
  /** The muted words shown when there is no window. */
  notReported?: string
}

/** Codex's `rate_limits` on a `token_count` event. */
export type CodexRateLimitWindow = {
  used_percent?: number | null
  window_minutes?: number | null
  resets_at?: number | null
}

export type CodexRateLimits = {
  limit_id?: string | null
  primary?: CodexRateLimitWindow | null
  secondary?: CodexRateLimitWindow | null
  credits?: unknown
  plan_type?: string | null
  rate_limit_reached_type?: string | null
}

/** Claude Code's `rate_limit_info` on a stream-json `rate_limit_event`. */
export type ClaudeRateLimitInfo = {
  status?: string | null
  resetsAt?: number | null
  rateLimitType?: string | null
  /** 0–1, present only near or past the limit. */
  utilization?: number | null
  overageStatus?: string | null
}
