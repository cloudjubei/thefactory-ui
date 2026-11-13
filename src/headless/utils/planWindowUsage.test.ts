import { describe, expect, it } from 'vitest'
import {
  claudePlanUsage,
  codexPlanUsage,
  planWindowChip,
  planWindowName,
  planWindowResetLabel,
  planWindowStatus,
} from './planWindowUsage'
import { PLAN_WINDOW_COPY } from './planWindowUsageConstants'

const CODEX_FREE_CAPTURE = JSON.parse(
  '{"limit_id":"codex","primary":{"used_percent":3.0,"window_minutes":10080,"resets_at":1779821762},"secondary":null,"credits":null,"plan_type":"free","rate_limit_reached_type":null}',
)
const CLAUDE_CAPTURE = JSON.parse(
  '{"status":"allowed","resetsAt":1795050000,"rateLimitType":"seven_day","overageStatus":"rejected"}',
)
const DAY = 86_400_000
const HOUR = 3_600_000
const MINUTE = 60_000

describe('codexPlanUsage', () => {
  it('reads the real free-plan capture: 3% of a 7-day window', () => {
    expect(codexPlanUsage(CODEX_FREE_CAPTURE)).toEqual({
      cli: 'codex',
      plan: 'free',
      windows: [{ usedPercent: 3, windowMinutes: 10_080, resetsAt: 1_779_821_762_000 }],
    })
  })

  it('reads both windows of a paid plan, shortest first', () => {
    const usage = codexPlanUsage({
      primary: { used_percent: 18, window_minutes: 10_080, resets_at: 2000 },
      secondary: { used_percent: 62, window_minutes: 300, resets_at: 1000 },
      plan_type: 'plus',
    })
    expect(usage.windows.map((w) => [w.windowMinutes, w.usedPercent, w.resetsAt])).toEqual([
      [300, 62, 1_000_000],
      [10_080, 18, 2_000_000],
    ])
  })

  it('drops a window with no reset time and fields that are not numbers', () => {
    const usage = codexPlanUsage({
      primary: { used_percent: null, window_minutes: 0, resets_at: 5 },
      secondary: { used_percent: 10, window_minutes: 300, resets_at: null },
      plan_type: '  ',
    })
    expect(usage).toEqual({ cli: 'codex', windows: [{ resetsAt: 5000 }] })
  })

  it('reads nothing from a missing payload', () => {
    expect(codexPlanUsage(undefined)).toEqual({ cli: 'codex', windows: [] })
    expect(codexPlanUsage(null)).toEqual({ cli: 'codex', windows: [] })
  })
})

describe('claudePlanUsage', () => {
  it('reads the real capture: a 7-day window with a status and no share', () => {
    expect(claudePlanUsage(CLAUDE_CAPTURE)).toEqual({
      cli: 'claude-code',
      windows: [{ resetsAt: 1_795_050_000_000, windowMinutes: 10_080, status: 'ok' }],
    })
  })

  it('reads a warning near the limit with its utilization as a share', () => {
    const usage = claudePlanUsage({
      status: 'allowed_warning',
      utilization: 0.86,
      rateLimitType: 'five_hour',
      resetsAt: 100,
    })
    expect(usage.windows).toEqual([
      { resetsAt: 100_000, windowMinutes: 300, status: 'near-limit', usedPercent: 86 },
    ])
  })

  it('reads a rejected window as limit reached', () => {
    const [window] = claudePlanUsage({
      status: 'rejected',
      rateLimitType: 'five_hour',
      resetsAt: 1,
    }).windows
    expect(window?.status).toBe('limit-reached')
  })

  it('leaves out a window length and status it does not know', () => {
    expect(
      claudePlanUsage({ status: 'odd', rateLimitType: 'monthly', resetsAt: 2 }).windows,
    ).toEqual([{ resetsAt: 2000 }])
  })

  it('reads no window without a reset time', () => {
    expect(claudePlanUsage({ status: 'allowed' })).toEqual({ cli: 'claude-code', windows: [] })
    expect(claudePlanUsage(null)).toEqual({ cli: 'claude-code', windows: [] })
  })
})

describe('planWindowName', () => {
  it.each([
    [300, '5-hour'],
    [10_080, '7-day'],
    [1_440, '1-day'],
    [90, '90-min'],
    [45, '45-min'],
    [undefined, 'Plan'],
    [0, 'Plan'],
    [-5, 'Plan'],
  ])('names %s minutes %s', (minutes, name) => {
    expect(planWindowName(minutes)).toBe(name)
  })
})

describe('planWindowResetLabel', () => {
  const now = 1_000_000_000
  it.each([
    [3 * DAY + 2 * HOUR, 'resets in 3 d'],
    [DAY, 'resets in 1 d'],
    [4 * HOUR + 20 * MINUTE, 'resets in 4 h'],
    [59 * MINUTE, 'resets in 59 min'],
    [MINUTE, 'resets in 1 min'],
    [20_000, 'resets now'],
    [-HOUR, 'resets now'],
  ])('reads %s ms ahead as %s', (ahead, label) => {
    expect(planWindowResetLabel(now + ahead, now)).toBe(label)
  })
})

describe('planWindowStatus', () => {
  it('takes what the CLI says over the share', () => {
    expect(planWindowStatus({ resetsAt: 0, usedPercent: 10, status: 'limit-reached' })).toBe(
      'limit-reached',
    )
  })

  it.each([
    [undefined, 'ok'],
    [79.9, 'ok'],
    [80, 'near-limit'],
    [99, 'near-limit'],
    [100, 'limit-reached'],
  ] as const)('reads a share of %s as %s', (usedPercent, status) => {
    expect(
      planWindowStatus({ resetsAt: 0, ...(usedPercent !== undefined ? { usedPercent } : {}) }),
    ).toBe(status)
  })
})

describe('planWindowChip', () => {
  it('draws the real codex capture as 3% of the 7-day window', () => {
    const now = 1_779_821_762_000 - 6 * DAY - 12 * HOUR
    expect(planWindowChip(codexPlanUsage(CODEX_FREE_CAPTURE), now)).toEqual({
      title: 'Codex · Free plan',
      windows: [
        {
          window: '7-day',
          percent: 3,
          value: '3%',
          status: 'ok',
          reset: 'resets in 7 d',
          detail: '7-day window: 3% used, resets in 7 d',
        },
      ],
    })
  })

  it('draws the real claude capture as a status, with no share', () => {
    const now = 1_795_050_000_000 - 3 * DAY
    expect(planWindowChip(claudePlanUsage(CLAUDE_CAPTURE), now)).toEqual({
      title: 'Claude Code',
      windows: [
        {
          window: '7-day',
          value: 'OK',
          status: 'ok',
          reset: 'resets in 3 d',
          detail: '7-day window: OK, resets in 3 d',
        },
      ],
    })
  })

  it('shows the share and the status both near the limit', () => {
    const view = planWindowChip(
      claudePlanUsage({
        status: 'allowed_warning',
        utilization: 0.86,
        rateLimitType: 'five_hour',
        resetsAt: 7200,
      }),
      0,
    )
    expect(view.windows[0]).toMatchObject({
      window: '5-hour',
      percent: 86,
      value: '86%',
      status: 'near-limit',
      reset: 'resets in 2 h',
    })
  })

  it('keeps a share past 100 on the meter at 100', () => {
    const view = planWindowChip({ cli: 'codex', windows: [{ resetsAt: 0, usedPercent: 140 }] }, 0)
    expect(view.windows[0]).toMatchObject({ percent: 100, value: '100%', status: 'limit-reached' })
  })

  it('orders windows shortest first and draws each', () => {
    const view = planWindowChip(
      {
        cli: 'codex',
        plan: 'plus',
        windows: [
          { resetsAt: 5 * DAY, usedPercent: 18, windowMinutes: 10_080 },
          { resetsAt: 3 * HOUR, usedPercent: 62, windowMinutes: 300 },
        ],
      },
      0,
    )
    expect(view.title).toBe('Codex · Plus plan')
    expect(view.windows.map((w) => `${w.window} ${w.value} ${w.reset}`)).toEqual([
      '5-hour 62% resets in 3 h',
      '7-day 18% resets in 5 d',
    ])
    expect(view.notReported).toBeUndefined()
  })

  it('says a window with neither share nor status only by its reset', () => {
    const view = planWindowChip({ cli: 'codex', windows: [{ resetsAt: HOUR }] }, 0)
    expect(view.windows[0]).toEqual({
      window: 'Plan',
      status: 'ok',
      reset: 'resets in 1 h',
      detail: 'Plan window, resets in 1 h',
    })
  })

  it('says a CLI that reports nothing has not reported', () => {
    expect(planWindowChip({ cli: 'cursor-agent', windows: [] }, 0)).toEqual({
      title: 'Cursor',
      windows: [],
      notReported: PLAN_WINDOW_COPY.notReported,
    })
  })
})
