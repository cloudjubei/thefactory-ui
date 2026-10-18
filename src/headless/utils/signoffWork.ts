import type { ProcessPlanStep, ProcessStepTotals } from 'thefactory-tools/types'
import { processLaunchModel } from 'thefactory-tools/utils'

import { agentRoleLabel } from './agentRole'
import { addCost, costChipLabel, costDetailsView, formatCostUSD, pickCost } from './costDetails'
import type { CostSource } from './costDetailsTypes'
import { formatProcessDuration } from './processView'
import { processRunModelChip, uniqueRunModels, type RunModel } from './runModel'
import type { CostSpend } from './costDetailsTypes'
import {
  SIGNOFF_AGENT_STEP_KINDS,
  SIGNOFF_BILLING_MIXED,
  SIGNOFF_BILLING_NOTES,
  SIGNOFF_BILLING_WORDS,
  SIGNOFF_CHECK_STEP_KINDS,
  SIGNOFF_COST_BILLED_SUFFIX,
  SIGNOFF_TIME_PART_LABELS,
  SIGNOFF_TIME_PARTS,
  SIGNOFF_TIME_WAITING,
  SIGNOFF_TIME_WAITING_LEGEND,
  SIGNOFF_TIME_WORK_SUFFIX,
  SIGNOFF_UNCOUNTED_STEP_KINDS,
} from './signoffWorkConstants'
import type {
  SignoffCostView,
  SignoffTimePart,
  SignoffTimeSegment,
  SignoffTimeView,
  SignoffWork,
  SignoffWorkRole,
  SignoffWorkScope,
  SignoffWorkStep,
} from './signoffWorkTypes'
import type { StorySignoffProcessRun } from './storySignoffTypes'

const noParts = (): Record<SignoffTimePart, number> => ({
  thinking: 0,
  tools: 0,
  system: 0,
  checks: 0,
  other: 0,
})

function stepParts(
  kind: string,
  workMs: number,
  time: { thinkingMs: number; toolMs: number; systemMs: number } | undefined,
): Record<SignoffTimePart, number> {
  if (SIGNOFF_CHECK_STEP_KINDS.includes(kind)) return { ...noParts(), checks: workMs }
  const thinking = time?.thinkingMs ?? 0
  const tools = time?.toolMs ?? 0
  const system = time?.systemMs ?? 0
  return {
    ...noParts(),
    thinking,
    tools,
    system,
    other: Math.max(0, workMs - thinking - tools - system),
  }
}

/** A spend's model as a chip, for a record that kept no model it was launched on. */
function spendOnlyModel(spend: Pick<CostSpend, 'model' | 'label' | 'billing'>): RunModel {
  return {
    tool: undefined,
    tag: spend.billing === 'subscription' ? 'CLI' : 'API',
    model: spend.label ?? spend.model,
    effort: undefined,
  }
}

/**
 * The models one step's attempts ran on: each attempt's spend named on the
 * model it was launched on (else the run's launch), else the step's priced
 * models on its latest launched model, else that model alone.
 */
function stepModels(
  run: StorySignoffProcessRun,
  step: ProcessPlanStep,
  totals: ProcessStepTotals | undefined,
): RunModel[] {
  const launch = processLaunchModel(run.input)
  const entries = run.ledger.filter((e) => e.stepId === step.id && (e.runRef || e.cost))
  const fromEntries = entries.flatMap((e) => {
    const model = e.model ?? launch
    return (e.cost?.byModel ?? []).map((s) =>
      model ? processRunModelChip(model, s.label ?? s.model) : spendOnlyModel(s),
    )
  })
  if (fromEntries.length > 0) return fromEntries
  const model = [...entries].reverse().find((e) => e.model)?.model ?? launch
  const spends = totals?.byModel ?? []
  if (spends.length > 0) {
    return spends.map((s) =>
      model ? processRunModelChip(model, s.label ?? s.model) : spendOnlyModel(s),
    )
  }
  return model && entries.length > 0 ? [processRunModelChip(model)] : []
}

/** The runs a sign-off reads, in the order their work is listed: features, fix passes, the story's own. */
function scopedRuns(scope: SignoffWorkScope): StorySignoffProcessRun[] {
  return [
    ...scope.featureRuns.values(),
    ...scope.fixPasses.map((f) => f.run),
    ...(scope.storyRun ? [scope.storyRun] : []),
  ]
}

/**
 * The time and spend behind a sign-off, from the totals its runs carry — each
 * feature's latest run, each fix pass, and the story run's own steps (its
 * nested runs count in their own totals, its gates are waiting): every step's
 * work by name with where it went, a checks step's all checks; every park as
 * waiting; and the spend by the agent role whose steps ran it, with how many
 * agent runs each started. Undefined when no run carries totals. Pure.
 */
export function signoffWorkOf(scope: SignoffWorkScope | undefined): SignoffWork | undefined {
  if (!scope) return undefined
  const runs = scopedRuns(scope).filter((r) => r.totals)
  if (runs.length === 0) return undefined
  const steps = new Map<string, SignoffWorkStep>()
  const roles = new Map<string, SignoffWorkRole>()
  let cost: CostSource | undefined
  let waitingMs = 0
  let agentRuns = 0
  const allModels: RunModel[] = []
  for (const run of runs) {
    const totals = run.totals!
    waitingMs += totals.time?.waitingMs ?? 0
    for (const step of run.plan.steps) {
      if (SIGNOFF_UNCOUNTED_STEP_KINDS.includes(step.kind)) continue
      const stepTotals = totals.steps[step.id]
      if (stepTotals && stepTotals.workMs > 0) {
        const parts = stepParts(step.kind, stepTotals.workMs, stepTotals.time)
        const seen = steps.get(step.name)
        steps.set(step.name, {
          key: step.name,
          label: step.name,
          workMs: (seen?.workMs ?? 0) + stepTotals.workMs,
          parts: seen
            ? (Object.fromEntries(
                SIGNOFF_TIME_PARTS.map((p) => [p, seen.parts[p] + parts[p]]),
              ) as Record<SignoffTimePart, number>)
            : parts,
        })
      }
      if (!SIGNOFF_AGENT_STEP_KINDS.includes(step.kind)) continue
      const role = step.agentType ?? step.kind
      const started = run.ledger.filter((e) => e.stepId === step.id && e.runRef).length
      const spent = stepTotals ? pickCost(stepTotals) : undefined
      const seen = roles.get(role)
      const models = stepModels(run, step, stepTotals)
      roles.set(role, {
        role,
        runs: (seen?.runs ?? 0) + started,
        cost: addCost(seen?.cost, spent),
        models: uniqueRunModels([...(seen?.models ?? []), ...models]),
      })
      allModels.push(...models)
      agentRuns += started
      cost = addCost(cost, spent)
    }
  }
  const stepList = [...steps.values()]
  return {
    steps: stepList,
    workMs: stepList.reduce((n, s) => n + s.workMs, 0),
    waitingMs,
    roles: [...roles.values()]
      .filter((r) => r.runs > 0 || r.cost)
      .sort((a, b) => listOf(b.cost) - listOf(a.cost)),
    cost,
    agentRuns,
    models: uniqueRunModels(allModels),
  }
}

const listOf = (cost: CostSource | undefined): number => cost?.listCostUsd ?? cost?.costUsd ?? 0

function segments(parts: Record<SignoffTimePart, number>, scaleMs: number): SignoffTimeSegment[] {
  return SIGNOFF_TIME_PARTS.filter((p) => parts[p] > 0).map((part) => ({
    part,
    label: SIGNOFF_TIME_PART_LABELS[part],
    value: formatProcessDuration(parts[part]),
    fraction: scaleMs > 0 ? parts[part] / scaleMs : 0,
  }))
}

/**
 * What the Time tile says: the work, its bar split into agents thinking,
 * agents' tools, system and checks, and the waiting for a person beside it —
 * then a row per step, every bar on the whole sign-off's scale. Undefined when
 * there is neither work nor waiting. Pure.
 */
export function signoffTimeView(work: SignoffWork): SignoffTimeView | undefined {
  if (work.workMs <= 0 && work.waitingMs <= 0) return undefined
  const total = noParts()
  for (const step of work.steps) for (const p of SIGNOFF_TIME_PARTS) total[p] += step.parts[p]
  const overall = segments(total, work.workMs)
  const waiting = work.waitingMs > 0 ? formatProcessDuration(work.waitingMs) : undefined
  return {
    headline: `${formatProcessDuration(work.workMs)} ${SIGNOFF_TIME_WORK_SUFFIX}`,
    segments: overall,
    waiting: waiting ? SIGNOFF_TIME_WAITING(waiting) : undefined,
    legend: overall,
    waitingLegend: waiting ? SIGNOFF_TIME_WAITING_LEGEND(waiting) : undefined,
    rows: work.steps.map((step) => ({
      key: step.key,
      label: step.label,
      total: formatProcessDuration(step.workMs),
      segments: segments(step.parts, work.workMs),
    })),
  }
}

function billingOf(cost: CostSource): keyof typeof SIGNOFF_BILLING_NOTES | undefined {
  const kinds = [...new Set((cost.byModel ?? []).flatMap((s) => (s.billing ? [s.billing] : [])))]
  if (kinds.length === 0) return undefined
  return kinds.length === 1 ? kinds[0] : 'mixed'
}

const runsWord = (n: number) => `${n} agent ${n === 1 ? 'run' : 'runs'}`
const sentenceCase = (words: string) => words.charAt(0).toUpperCase() + words.slice(1)

/**
 * What the Cost tile says: what was billed (a subscription's share unknown, so
 * not "billed" at all), how it was billed, its list price,
 * and the agent runs and models behind it — then the list price by agent role
 * on the priciest role's scale, or, for a single agent run, its model and how
 * its tokens split. Undefined when no cost was measured. Pure.
 */
export function signoffCostView(work: SignoffWork): SignoffCostView | undefined {
  const details = costDetailsView(work.cost)
  if (!work.cost || !details) return undefined
  const billing = billingOf(work.cost)
  const list = formatCostUSD(work.cost.listCostUsd)
  const billingWords = billing
    ? billing === 'mixed'
      ? SIGNOFF_BILLING_MIXED
      : SIGNOFF_BILLING_WORDS[billing]
    : undefined
  const models =
    work.models.length > 0
      ? work.models
      : uniqueRunModels((work.cost.byModel ?? []).map((s) => spendOnlyModel(s)))
  const single = work.agentRuns === 1 && details.rows.length === 1
  const top = Math.max(0, ...work.roles.map((r) => listOf(r.cost)))
  return {
    headline: (work.cost.byModel ?? []).some((s) => s.billing === 'subscription')
      ? (costChipLabel(work.cost) ?? details.charged)
      : `${costChipLabel(work.cost) ?? details.charged} ${SIGNOFF_COST_BILLED_SUFFIX}`,
    billing:
      [billingWords, list ? `list price ${list}` : undefined].filter(Boolean).join(' · ') ||
      undefined,
    runs: work.agentRuns > 0 ? runsWord(work.agentRuns) : undefined,
    models,
    note: billing ? SIGNOFF_BILLING_NOTES[billing] : undefined,
    rows: single
      ? []
      : work.roles.map((r) => ({
          key: r.role,
          label: `${sentenceCase(agentRoleLabel(r.role))} · ${r.runs} ${r.runs === 1 ? 'run' : 'runs'}`,
          amount: formatCostUSD(listOf(r.cost)) ?? '—',
          fraction: top > 0 ? listOf(r.cost) / top : 0,
          models: r.models,
        })),
    tokens: single
      ? {
          model: models[0] ?? spendOnlyModel({ model: details.rows[0].model }),
          rows: details.rows[0].tokens,
        }
      : undefined,
  }
}
