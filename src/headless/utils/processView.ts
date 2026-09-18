import type {
  ProcessDefinition,
  ProcessLedgerEntry,
  ProcessNodeRunRef,
  ProcessPlan,
  ProcessRun,
  ProcessStep,
  ProcessStepKind,
  ProcessStepOutcome,
} from 'thefactory-tools/types'
import type { ProcessStepState } from 'thefactory-tools/utils'
import { processRunProgress, processStepStates } from 'thefactory-tools/utils'

/**
 * How a process reads on screen — shared by the `web/` and `native/` peers so
 * the two cannot drift on what an outcome is called or which status colour it
 * carries.
 *
 * The status keys are the package's own semantic set (`--status-<key>-fg` /
 * `-bg`), not invented names: a colour that resolves to no token renders as
 * nothing at all, which is worse than the wrong colour because it looks
 * deliberate.
 */
export type ProcessStatusTone =
  | 'empty'
  | 'done'
  | 'working'
  | 'stuck'
  | 'blocked'
  | 'queued'
  | 'on_hold'
  | 'review'

/** What each step outcome is called, and the status tone it carries. */
export const PROCESS_OUTCOME_VIEW: Record<
  ProcessStepOutcome,
  { label: string; tone: ProcessStatusTone }
> = {
  passed: { label: 'passed', tone: 'done' },
  failed: { label: 'did not pass', tone: 'stuck' },
  // Distinct from `failed` on purpose: nothing was measured, which is a reason
  // to stop and ask rather than a verdict against the work.
  unchecked: { label: 'nothing checked', tone: 'blocked' },
  // Its own label because its answer is its own: the step asked something, and
  // nothing moves until a person replies.
  question: { label: 'asked a question', tone: 'queued' },
  skipped: { label: 'skipped', tone: 'empty' },
  errored: { label: 'errored', tone: 'stuck' },
}

/** How a whole run reads in one word. */
export const PROCESS_RUN_STATUS_VIEW: Record<
  ProcessRun['status'],
  { label: string; tone: ProcessStatusTone }
> = {
  pending: { label: 'Starting', tone: 'queued' },
  running: { label: 'Running', tone: 'working' },
  parked: { label: 'Waiting for you', tone: 'blocked' },
  succeeded: { label: 'Finished', tone: 'done' },
  failed: { label: 'Stopped', tone: 'stuck' },
  cancelled: { label: 'Cancelled', tone: 'empty' },
}

/** The tone a step node shows, given where it is and how it ended. */
export function processStepTone(
  status: 'pending' | 'running' | 'done',
  outcome: ProcessStepOutcome | undefined,
): ProcessStatusTone {
  if (status === 'pending') return 'empty'
  if (status === 'running') return 'working'
  return outcome ? PROCESS_OUTCOME_VIEW[outcome].tone : 'empty'
}

/**
 * The step chain of a RUN, from its frozen plan.
 *
 * Read live rather than carried on the launch tool result: the result holds
 * status only, so the chain costs nothing in the chat's context on every later
 * turn — and there is one source for it rather than a frozen copy that a
 * re-planned run would silently contradict.
 */
export function processRunChain(run: ProcessRun): string {
  const names = run.plan.steps.map((s) => s.name)
  return names.length > 0 ? names.join(' → ') : 'No steps'
}

/**
 * One line for the chat card that launched a run.
 *
 * A parked run says a decision is PENDING and nothing more — which one, and the
 * choices that answer it, live in the pipeline where their context is.
 */
export function processRunChipLabel(run: ProcessRun): string {
  const { completed, total } = processRunProgress(run)
  const steps = `${completed}/${total} steps`
  switch (run.status) {
    case 'parked':
      return `A decision is pending · ${steps}`
    case 'succeeded':
      return `Finished · ${steps}`
    case 'failed':
      return `Stopped · ${steps}`
    case 'cancelled':
      return 'Cancelled'
    default:
      return `Running · ${steps}`
  }
}

/**
 * What a run has spent against what it was allowed, or `undefined` when it was
 * never capped.
 *
 * Shown because a cap the user cannot see is one they cannot act on until it
 * parks them — and by then they are reading a banner instead of a number they
 * could have watched.
 */
export function processRunSpend(
  run: ProcessRun,
): { spent: number; cap?: number; label: string } | undefined {
  const cap = run.budget?.spendUsdCap
  const granted = run.budgetGrants?.spendUsdCap ?? 0
  const spent = run.spentUsd
  if (cap === undefined && spent === undefined) return undefined
  const limit = cap === undefined ? undefined : cap + granted
  const money = (value: number) => `$${value.toFixed(2)}`
  return {
    spent: spent ?? 0,
    ...(limit !== undefined ? { cap: limit } : {}),
    label:
      limit === undefined
        ? money(spent ?? 0)
        : `${money(spent ?? 0)} of ${money(limit)}${granted > 0 ? ' (raised)' : ''}`,
  }
}

/**
 * What each step kind actually does, in the words a person picking one needs.
 *
 * Shared so the two peers cannot drift on the wording. Typed against
 * `ProcessStepKind`, so adding a kind upstream is one compile error here rather
 * than two silent gaps in two clients.
 */
export const PROCESS_KIND_BLURB: Record<ProcessStepKind, string> = {
  agent: 'An agent run in an isolated copy of the project.',
  check: "The project's verification checks, over what the previous step landed.",
  capture: 'Drive the app and file screenshots as evidence.',
  judge: 'Read the evidence and the diff, and return a verdict.',
  report: 'One model pass over the ledger. No tools, no workspace.',
  gate: 'Stop and wait for a person to decide.',
  process: 'A nested process, one level down.',
}

/** Where a definition came from, as the list row says it. */
export function processScopeLabel(definition: ProcessDefinition): string {
  if (definition.scope !== 'project') return 'SHARED'
  return definition.shadowsGlobal ? 'OVERRIDES SHARED' : 'THIS PROJECT'
}

/** A step's display name from its id, for a loop description. */
export function processStepName(definition: ProcessDefinition, stepId: string): string {
  return definition.steps.find((s) => s.id === stepId)?.name ?? stepId
}

/** A blank step for the editor's "add step". */
export function blankProcessStep(index: number): ProcessStep {
  return { id: `step-${index}`, name: `Step ${index}`, kind: 'agent', agentType: 'developer' }
}

/** A blank definition for the editor's "new". */
export function blankProcessDefinition(): ProcessDefinition {
  return {
    id: '',
    name: '',
    description: '',
    steps: [blankProcessStep(1)],
    loops: [],
    version: 1,
    updatedAt: 0,
  }
}

/**
 * A copy of an existing definition, ready to edit as a new one.
 *
 * The version resets: a copy has no history of its own, and carrying the
 * original's number would make the first save look like an edit to it.
 */
export function copyProcessDefinition(definition: ProcessDefinition): ProcessDefinition {
  return {
    ...structuredClone(definition),
    id: `${definition.id}-copy`,
    name: `${definition.name} (copy)`,
    version: 1,
  }
}

/**
 * Whether saving this draft would FORK a shared process into the project.
 *
 * Read from the definition being edited, not by looking its id back up: a user
 * who renames the id mid-edit is doing exactly the thing the warning explains,
 * and a lookup-based rule made the explanation vanish at that moment.
 */
export function isProcessFork(draft: ProcessDefinition): boolean {
  return draft.scope === 'global'
}

/**
 * The agent run a PARKED step owns, when it has one.
 *
 * What makes "answer the question" reachable from the park banner. Shared
 * rather than written twice: which ledger entry answers the park is exactly the
 * kind of rule that gains cases, and a rule fixed in one peer and not the other
 * is the drift this module exists to prevent.
 *
 * Returns nothing unless the ref carries a `chatContextId` — that is what a host
 * navigates with, and offering the one control a park banner has when tapping it
 * would do nothing is worse than offering none.
 */
export function parkedRunRef(run: ProcessRun): ProcessNodeRunRef | undefined {
  const stepId = run.park?.stepId
  if (!stepId) return undefined
  for (let i = run.ledger.length - 1; i >= 0; i--) {
    const entry = run.ledger[i]
    if (entry.stepId === stepId && entry.runRef?.chatContextId) return entry.runRef
  }
  return undefined
}

/**
 * A node's visual state on the pipeline spine — the six the design draws.
 *
 * Derived, not stored: it folds the run's cursor, the step's outcome and the
 * run's park point into the one word the marker needs. `parked` wins over
 * everything, because a run sitting on a decision is the thing the eye must find
 * first.
 */
export type ProcessNodeState = 'done' | 'working' | 'failed' | 'parked' | 'queued' | 'skipped'

/** The node state for one step, given where the run has parked (if anywhere). */
export function processNodeState(
  state: Pick<ProcessStepState, 'status' | 'outcome'> & { step: { id: string } },
  parkedStepId: string | undefined,
): ProcessNodeState {
  if (parkedStepId !== undefined && state.step.id === parkedStepId) return 'parked'
  if (state.status === 'running') return 'working'
  if (state.status === 'pending') return 'queued'
  if (state.outcome === 'failed' || state.outcome === 'errored' || state.outcome === 'unchecked')
    return 'failed'
  if (state.outcome === 'skipped') return 'skipped'
  return 'done'
}

/** The status tone a node marker carries. A parked GATE reads as review (ready
 * for you), any other park as on-hold (waiting for you) — the design's two
 * distinct purples/blues, not one "blocked" red. */
export function processNodeTone(nodeState: ProcessNodeState, isGate: boolean): ProcessStatusTone {
  switch (nodeState) {
    case 'done':
      return 'done'
    case 'working':
      return 'working'
    case 'failed':
      return 'stuck'
    case 'parked':
      return isGate ? 'review' : 'on_hold'
    case 'skipped':
      return 'empty'
    default:
      return 'queued'
  }
}

/** The glyph a marker shows: a verdict where there is one, else the ordinal. */
export function processNodeGlyph(nodeState: ProcessNodeState, ordinal: number): string {
  switch (nodeState) {
    case 'done':
      return '✓'
    case 'failed':
      return '!'
    case 'parked':
      return '?'
    default:
      return String(ordinal)
  }
}

/** ms → "6m 12s" / "1m 04s" / "44s" / "1h 03m", the way the design writes them. */
export function formatProcessDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  if (total < 60) return `${total}s`
  const m = Math.floor(total / 60)
  const s = total % 60
  if (m < 60) return `${m}m ${String(s).padStart(2, '0')}s`
  const h = Math.floor(m / 60)
  return `${h}h ${String(m % 60).padStart(2, '0')}m`
}

/**
 * How long a ledger attempt took, in ms — ended attempts from their span, a
 * still-running one against `now` (passed in, never read here, so this stays
 * pure and testable). Undefined when there is nothing to measure yet.
 */
export function processEntryDurationMs(
  entry: Pick<ProcessLedgerEntry, 'startedAt' | 'endedAt'> | undefined,
  now?: number,
): number | undefined {
  if (!entry) return undefined
  const end = entry.endedAt ?? now
  if (end === undefined) return undefined
  return Math.max(0, end - entry.startedAt)
}

/** A ledger attempt's duration as a label, or undefined when unmeasurable. */
export function processEntryDurationLabel(
  entry: Pick<ProcessLedgerEntry, 'startedAt' | 'endedAt'> | undefined,
  now?: number,
): string | undefined {
  const ms = processEntryDurationMs(entry, now)
  return ms === undefined ? undefined : formatProcessDuration(ms)
}

/**
 * The "attempt N of M" badge for a node — shown ONLY once a loop has actually
 * fired (more than one attempt), because a "1 of 3" on every step is noise that
 * hides the one node that really did retry. M is the plan's own retry cap.
 */
export function processIterationBadge(
  attempts: number,
  plan: Pick<ProcessPlan, 'loops'>,
): string | undefined {
  if (attempts <= 1) return undefined
  let cap: number | undefined
  for (const loop of plan.loops) {
    if (cap === undefined || loop.maxIterations > cap) cap = loop.maxIterations
  }
  return cap === undefined ? `attempt ${attempts}` : `attempt ${attempts} of ${cap}`
}

/**
 * The run's headline badge — refined for a park, which the plain status view
 * cannot be: a run stopped on the sign-off GATE is "Ready for you" (review),
 * one stopped on a question or a failure is "Waiting for you" (on-hold). Every
 * other status reads straight from {@link PROCESS_RUN_STATUS_VIEW}.
 */
export function processRunBadge(run: ProcessRun): { label: string; tone: ProcessStatusTone } {
  if (run.status === 'parked') {
    return run.park?.reason === 'gate'
      ? { label: 'Ready for you', tone: 'review' }
      : { label: 'Waiting for you', tone: 'on_hold' }
  }
  return PROCESS_RUN_STATUS_VIEW[run.status]
}

/** The chat card, in the three states the design gives it — reports, never
 * decides. Its only action stays "Open the pipeline". */
export interface ProcessRunCardView {
  title: string
  badge: { label: string; tone: ProcessStatusTone }
  sub: string
  /** A second line drawn as a tinted strip — a pending decision, or a finished
   * summary. Absent while simply running. */
  body?: { text: string; tone: ProcessStatusTone }
  cta: string
}

/**
 * The card a launched run leaves in the chat, arranged for one render.
 *
 * Running shows the step it is on; parked says a decision is pending and points
 * into the run (never answers it here); finished leaves an honest summary so
 * "did it work?" is a normal next message. The counts come from the run itself,
 * so the card can never claim more than happened.
 */
export function processRunCardView(run: ProcessRun): ProcessRunCardView {
  const { completed, total } = processRunProgress(run)
  const current = processStepStates(run).find((s) => s.current)
  const badge = processRunBadge(run)
  const cta = 'Open the pipeline'
  const title = processRunChain(run)
  if (run.status === 'parked') {
    return {
      title,
      badge,
      sub: current ? current.step.name : `${completed}/${total} steps`,
      body: {
        text:
          run.park?.reason === 'gate'
            ? 'Ready to sign off — decide in the run'
            : '1 decision pending — answer it in the run',
        tone: badge.tone,
      },
      cta,
    }
  }
  if (run.status === 'succeeded') {
    return {
      title,
      badge,
      sub: `${completed} of ${total} steps`,
      body: { text: `Finished · ${completed} of ${total} steps done`, tone: 'done' },
      cta,
    }
  }
  if (run.status === 'failed' || run.status === 'cancelled') {
    return { title, badge, sub: `${completed}/${total} steps`, cta }
  }
  return {
    title,
    badge,
    sub: current ? current.step.name : `${completed}/${total} steps`,
    cta,
  }
}
