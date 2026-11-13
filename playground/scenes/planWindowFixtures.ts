import type { ProcessRun } from 'thefactory-tools/types'
import {
  claudePlanUsage,
  codexPlanUsage,
  planWindowChip,
  type CliPlanUsage,
  type PlanWindowChipView,
} from 'thefactory-ui/headless'
import { STORY_RUN } from '../../src/fakeBackend/fixtures/processRuns'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** The scene's clock for the cases with no capture time of their own. */
const NOW = Date.parse('2026-11-12T10:00:00Z')

/** A real codex `token_count` event's `rate_limits`, captured on a free plan. */
export const CODEX_FREE_CAPTURE = JSON.parse(
  '{"limit_id":"codex","primary":{"used_percent":3.0,"window_minutes":10080,"resets_at":1779821762},"secondary":null,"credits":null,"plan_type":"free","rate_limit_reached_type":null}',
)

/** A real Claude Code stream-json `rate_limit_event`: allowed, on the 7-day window, no share. */
export const CLAUDE_ALLOWED_CAPTURE = JSON.parse(
  '{"type":"rate_limit_event","rate_limit_info":{"status":"allowed","resetsAt":1795050000,"rateLimitType":"seven_day","overageStatus":"rejected"}}',
)

const seconds = (ms: number) => Math.round(ms / 1000)

/** The codex capture's shape on a paid plan: a 5-hour window and a 7-day one. */
const CODEX_PAID = {
  limit_id: 'codex',
  primary: {
    used_percent: 62.0,
    window_minutes: 300,
    resets_at: seconds(NOW + 2 * HOUR + 10 * MINUTE),
  },
  secondary: {
    used_percent: 18.0,
    window_minutes: 10080,
    resets_at: seconds(NOW + 4 * DAY + 3 * HOUR),
  },
  credits: null,
  plan_type: 'plus',
  rate_limit_reached_type: null,
}

/** The Claude capture's shape near the limit: `utilization` is sent only now. */
const CLAUDE_NEAR = {
  type: 'rate_limit_event',
  rate_limit_info: {
    status: 'allowed_warning',
    utilization: 0.86,
    resetsAt: seconds(NOW + HOUR + 40 * MINUTE),
    rateLimitType: 'five_hour',
    overageStatus: 'rejected',
  },
}

/** The Claude capture's shape past the limit. */
const CLAUDE_REJECTED = {
  type: 'rate_limit_event',
  rate_limit_info: {
    status: 'rejected',
    resetsAt: seconds(NOW + 38 * MINUTE),
    rateLimitType: 'five_hour',
    overageStatus: 'rejected',
  },
}

export type PlanWindowCase = {
  id: string
  label: string
  /** What the case shows, for the board. */
  note: string
  /** The raw payload, as the CLI wrote it. */
  raw: unknown
  usage: CliPlanUsage
  /** The fixed clock the reset is read against. */
  now: number
  cli: string
  model: string
}

export const PLAN_WINDOW_CASES: PlanWindowCase[] = [
  {
    id: 'codex-free',
    label: 'Codex free',
    note: 'The real capture: 3% of the 7-day window, read 6 days and 4 hours before its reset.',
    raw: CODEX_FREE_CAPTURE,
    usage: codexPlanUsage(CODEX_FREE_CAPTURE),
    now: CODEX_FREE_CAPTURE.primary.resets_at * 1000 - 6 * DAY - 4 * HOUR,
    cli: 'codex',
    model: 'gpt-5.5-codex',
  },
  {
    id: 'codex-paid',
    label: 'Codex paid',
    note: 'The capture’s shape on a paid plan: 62% of the 5-hour window and 18% of the 7-day one.',
    raw: CODEX_PAID,
    usage: codexPlanUsage(CODEX_PAID),
    now: NOW,
    cli: 'codex',
    model: 'gpt-5.5-codex',
  },
  {
    id: 'claude-allowed',
    label: 'Claude OK',
    note: 'The real capture: allowed on the 7-day window. Claude sends no share here, so the chip says OK.',
    raw: CLAUDE_ALLOWED_CAPTURE,
    usage: claudePlanUsage(CLAUDE_ALLOWED_CAPTURE.rate_limit_info),
    now: CLAUDE_ALLOWED_CAPTURE.rate_limit_info.resetsAt * 1000 - 3 * DAY - 2 * HOUR,
    cli: 'claude-code',
    model: 'claude-opus-5-5',
  },
  {
    id: 'claude-near',
    label: 'Claude near limit',
    note: 'allowed_warning with utilization 0.86 on the 5-hour window: the share shows, in the warning colour.',
    raw: CLAUDE_NEAR,
    usage: claudePlanUsage(CLAUDE_NEAR.rate_limit_info),
    now: NOW,
    cli: 'claude-code',
    model: 'claude-opus-5-5',
  },
  {
    id: 'claude-reached',
    label: 'Claude limit reached',
    note: 'rejected on the 5-hour window: Limit reached, in the stuck colour, until it resets.',
    raw: CLAUDE_REJECTED,
    usage: claudePlanUsage(CLAUDE_REJECTED.rate_limit_info),
    now: NOW,
    cli: 'claude-code',
    model: 'claude-opus-5-5',
  },
  {
    id: 'cursor',
    label: 'Cursor',
    note: 'cursor-agent reports no plan usage at all.',
    raw: null,
    usage: { cli: 'cursor-agent', windows: [] },
    now: NOW,
    cli: 'cursor-agent',
    model: 'gpt-5.5',
  },
]

export function planWindowCase(id: string | null | undefined): PlanWindowCase {
  return PLAN_WINDOW_CASES.find((c) => c.id === id) ?? PLAN_WINDOW_CASES[0]!
}

export function planWindowView(item: PlanWindowCase): PlanWindowChipView {
  return planWindowChip(item.usage, item.now)
}

/** A live story run on the case's CLI and model, for the real run header. */
export function planWindowRun(item: PlanWindowCase): ProcessRun {
  return {
    ...STORY_RUN,
    id: `run-plan-${item.id}`,
    startedAt: item.now - 42 * MINUTE,
    updatedAt: item.now,
    input: { runner: 'cli', cliRunner: { cli: item.cli, model: item.model } },
  }
}

export const PLAN_WINDOW_SCENE_ID = 'run-plan-window'
