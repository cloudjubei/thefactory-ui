import { cliLabel } from './cliRunner'
import {
  CLAUDE_RATE_LIMIT_STATUS,
  CLAUDE_RATE_LIMIT_WINDOW_MINUTES,
  PLAN_WINDOW_COPY,
  PLAN_WINDOW_NEAR_PERCENT,
  PLAN_WINDOW_REACHED_PERCENT,
} from './planWindowUsageConstants'
import type {
  ClaudeRateLimitInfo,
  CliPlanUsage,
  CodexRateLimits,
  CodexRateLimitWindow,
  PlanWindowChipView,
  PlanWindowChipWindow,
  PlanWindowStatus,
  PlanWindowUsage,
} from './planWindowUsageTypes'

const MINUTE_MS = 60_000
const HOUR_MINUTES = 60
const DAY_MINUTES = 1_440

function finite(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function trimmed(value: string | null | undefined): string | undefined {
  const text = value?.trim()
  return text ? text : undefined
}

function codexWindow(raw: CodexRateLimitWindow | null | undefined): PlanWindowUsage | undefined {
  if (!raw || !finite(raw.resets_at)) return undefined
  return {
    resetsAt: raw.resets_at * 1000,
    ...(finite(raw.used_percent) ? { usedPercent: raw.used_percent } : {}),
    ...(finite(raw.window_minutes) && raw.window_minutes > 0
      ? { windowMinutes: raw.window_minutes }
      : {}),
  }
}

function byLength(a: PlanWindowUsage, b: PlanWindowUsage): number {
  return (a.windowMinutes ?? Infinity) - (b.windowMinutes ?? Infinity)
}

/** Codex's `rate_limits` from a `token_count` event, as plan usage: each window it carries. Pure. */
export function codexPlanUsage(raw: CodexRateLimits | null | undefined): CliPlanUsage {
  const plan = trimmed(raw?.plan_type)
  const windows = [codexWindow(raw?.primary), codexWindow(raw?.secondary)]
    .filter((w): w is PlanWindowUsage => w !== undefined)
    .sort(byLength)
  return { cli: 'codex', ...(plan ? { plan } : {}), windows }
}

/**
 * Claude Code's `rate_limit_info` from a `rate_limit_event`, as plan usage: its one window, with
 * a share only when it sends `utilization`, near or past the limit. Pure.
 */
export function claudePlanUsage(raw: ClaudeRateLimitInfo | null | undefined): CliPlanUsage {
  if (!raw || !finite(raw.resetsAt)) return { cli: 'claude-code', windows: [] }
  const windowMinutes = CLAUDE_RATE_LIMIT_WINDOW_MINUTES[raw.rateLimitType ?? '']
  const status = CLAUDE_RATE_LIMIT_STATUS[raw.status ?? '']
  const limit: PlanWindowUsage = {
    resetsAt: raw.resetsAt * 1000,
    ...(windowMinutes ? { windowMinutes } : {}),
    ...(status ? { status } : {}),
    ...(finite(raw.utilization) ? { usedPercent: raw.utilization * 100 } : {}),
  }
  return { cli: 'claude-code', windows: [limit] }
}

/** `5-hour`, `7-day`, `30-min`; `Plan` when the window's length is not known. Pure. */
export function planWindowName(windowMinutes: number | undefined): string {
  if (!windowMinutes || windowMinutes <= 0) return PLAN_WINDOW_COPY.window
  if (windowMinutes % DAY_MINUTES === 0) return `${windowMinutes / DAY_MINUTES}-day`
  if (windowMinutes % HOUR_MINUTES === 0) return `${windowMinutes / HOUR_MINUTES}-hour`
  return `${Math.round(windowMinutes)}-min`
}

/** `resets in 3 d`, `resets in 4 h`, `resets in 12 min`, rounded to the nearest unit. Pure. */
export function planWindowResetLabel(resetsAt: number, now: number): string {
  const minutes = Math.round((resetsAt - now) / MINUTE_MS)
  if (minutes <= 0) return PLAN_WINDOW_COPY.resetsNow
  if (minutes < HOUR_MINUTES) return PLAN_WINDOW_COPY.resetsIn(`${minutes} min`)
  if (minutes < DAY_MINUTES)
    return PLAN_WINDOW_COPY.resetsIn(`${Math.round(minutes / HOUR_MINUTES)} h`)
  return PLAN_WINDOW_COPY.resetsIn(`${Math.round(minutes / DAY_MINUTES)} d`)
}

/** How a window stands: what the CLI says, else what its share reads. Pure. */
export function planWindowStatus(limit: PlanWindowUsage): PlanWindowStatus {
  if (limit.status) return limit.status
  const percent = limit.usedPercent ?? 0
  if (percent >= PLAN_WINDOW_REACHED_PERCENT) return 'limit-reached'
  if (percent >= PLAN_WINDOW_NEAR_PERCENT) return 'near-limit'
  return 'ok'
}

function percentLabel(percent: number): string {
  return `${Math.round(percent)}%`
}

function chipWindow(limit: PlanWindowUsage, now: number): PlanWindowChipWindow {
  const name = planWindowName(limit.windowMinutes)
  const status = planWindowStatus(limit)
  const reset = planWindowResetLabel(limit.resetsAt, now)
  const percent = finite(limit.usedPercent)
    ? Math.min(100, Math.max(0, limit.usedPercent))
    : undefined
  const value =
    percent !== undefined
      ? percentLabel(percent)
      : limit.status
        ? PLAN_WINDOW_COPY.status[limit.status]
        : undefined
  const said = percent !== undefined ? PLAN_WINDOW_COPY.used(percentLabel(percent)) : value
  return {
    window: name,
    status,
    reset,
    ...(percent !== undefined ? { percent } : {}),
    ...(value ? { value } : {}),
    detail: said ? PLAN_WINDOW_COPY.detail(name, said, reset) : `${name} window, ${reset}`,
  }
}

function planName(plan: string): string {
  return plan.charAt(0).toUpperCase() + plan.slice(1)
}

/** The plan-window chip for a run's plan usage, read against `now`. Pure. */
export function planWindowChip(usage: CliPlanUsage, now: number): PlanWindowChipView {
  const cli = cliLabel(usage.cli)
  const plan = trimmed(usage.plan)
  const title = plan ? `${cli} · ${PLAN_WINDOW_COPY.plan(planName(plan))}` : cli
  const windows = [...usage.windows].sort(byLength).map((w) => chipWindow(w, now))
  return {
    title,
    windows,
    ...(windows.length === 0 ? { notReported: PLAN_WINDOW_COPY.notReported } : {}),
  }
}
