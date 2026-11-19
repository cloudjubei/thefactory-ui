import type { CliAgentSubscriptionStatus, CliRun } from '../../src/headless/api/generated'
import { FAKE_CLI_RUN } from '../../src/fakeBackend/fixtures/cliRuns'
import type { FixtureRoutes } from './onFixtures'

const CODEX_PAID_SUBSCRIPTION: CliAgentSubscriptionStatus = {
  plan: 'plus',
  windows: [
    { usedPercent: 62, windowMinutes: 300, resetsAt: 1795050000 },
    { usedPercent: 18, windowMinutes: 10080, resetsAt: 1795395600 },
  ],
}

/** Raw persisted snapshots: reset times are Unix seconds, statuses are CLI values.
 * Settled screens have no timers: Codex 62%/18%, Claude warning (or rejected) without
 * utilization, Cursor not reported, and a second Codex credential with no record.
 */
export const PERSISTED_PLAN_CASES: {
  id: string
  label: string
  cli: string
  subscription?: CliAgentSubscriptionStatus
}[] = [
  {
    id: 'codex-paid',
    label: 'Codex paid',
    cli: 'codex',
    subscription: CODEX_PAID_SUBSCRIPTION,
  },
  {
    id: 'claude-near',
    label: 'Claude warning without utilization',
    cli: 'claude-code',
    subscription: {
      windows: [{ windowMinutes: 300, resetsAt: 1795050000, status: 'allowed_warning' }],
    },
  },
  {
    id: 'claude-reached',
    label: 'Claude rejected without utilization',
    cli: 'claude-code',
    subscription: { windows: [{ windowMinutes: 300, resetsAt: 1795050000, status: 'rejected' }] },
  },
  {
    id: 'cursor',
    label: 'Cursor not reported',
    cli: 'cursor-agent',
    subscription: { windowsNotReported: true },
  },
  { id: 'no-window', label: 'No subscription', cli: 'codex' },
]
/** Shared reference time (epoch milliseconds) for the persisted playground countdowns. */
export const PERSISTED_PLAN_NOW = 1795046400000

export const PLAN_WINDOW_FALLBACK_CASES = [
  { id: 'no-output', label: 'No renderable run output', settled: false, subscribed: true },
  { id: 'settled-notice', label: 'Changes discarded', settled: true, subscribed: true },
  {
    id: 'no-output-no-subscription',
    label: 'No renderable run output or subscription',
    settled: false,
    subscribed: false,
  },
  {
    id: 'settled-notice-no-subscription',
    label: 'Changes discarded without a subscription',
    settled: true,
    subscribed: false,
  },
] as const

type PlanWindowFallbackCase = (typeof PLAN_WINDOW_FALLBACK_CASES)[number]

export function planWindowFallbackRun({ id, settled, subscribed }: PlanWindowFallbackCase): CliRun {
  const { subscription: _subscription, ...base } = FAKE_CLI_RUN
  return {
    ...base,
    id: `capture-${id}`,
    cli: { tool: 'codex', version: 'fixture' },
    ...(subscribed ? { subscription: CODEX_PAID_SUBSCRIPTION } : {}),
    artifacts: settled
      ? [
          {
            id: 'capture-discarded-changes',
            kind: 'files-emitted',
            at: base.updatedAt,
            discardedAt: base.updatedAt,
            payload: { files: [{ path: 'plan-window-example.txt', status: 'added' }] },
          },
        ]
      : [],
  }
}

export function planSettingsRoutes(rejected = false): FixtureRoutes {
  return {
    '/api/v1/cli-runs/subscription-windows': () =>
      PERSISTED_PLAN_CASES.filter((c) =>
        ['codex-paid', rejected ? 'claude-reached' : 'claude-near', 'cursor'].includes(c.id),
      ).map((c) => ({
        cli: c.cli,
        credentialId: c.cli,
        runId: `capture-${c.id}`,
        subscription: c.subscription,
      })),
    '/api/v1/cli-auth-caches': () =>
      ['claude-code', 'codex', 'cursor-agent', 'codex-new'].map((id) => ({
        id,
        cli: id === 'codex-new' ? 'codex' : id,
        name: id === 'codex-new' ? 'New login — no run yet' : `${id} captured login`,
      })),
    '/api/v1/cli-configs/active': () => ({}),
    '/api/v1/cli-runs/probe/models': () => ({ models: [], efforts: [] }),
    '/api/v1/cli-runs/probe/capability': () => [],
    '/api/v1/cli-images': () => ({ images: [], docker: 'missing' }),
  }
}
