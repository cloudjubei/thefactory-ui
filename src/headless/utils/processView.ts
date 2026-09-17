import type {
  ProcessDefinition,
  ProcessNodeRunRef,
  ProcessRun,
  ProcessStep,
  ProcessStepKind,
  ProcessStepOutcome,
} from 'thefactory-tools/types'
import { processRunProgress } from 'thefactory-tools/utils'

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
export type ProcessStatusTone = 'empty' | 'done' | 'working' | 'stuck' | 'blocked' | 'queued'

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
