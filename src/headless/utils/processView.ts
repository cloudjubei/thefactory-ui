import type {
  ProcessDefinition,
  ProcessLedgerEntry,
  ProcessNodeRunRef,
  ProcessPlan,
  ProcessRun,
  ProcessStep,
  ProcessStepKind,
  ProcessStepOutcome,
  ProcessVerifyReview,
} from 'thefactory-tools/types'
import type { ProcessNodeLook, ProcessNodeSummary } from './processViewTypes'
import type { ProcessStepState } from 'thefactory-tools/utils'
import { processRunProgress, processStepStates, processVerifyReview } from 'thefactory-tools/utils'

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

/**
 * The tone of process work that is RUNNING — the same green as work that is
 * done. A run making progress is good news; the orange working token read as a
 * warning, and it is shared with story rows, so processes move off it rather
 * than recolour it. Running and done are told apart by shape: a spinning ring
 * against a filled mark.
 */
export const PROCESS_LIVE_TONE: ProcessStatusTone = 'done'

/** How a whole run reads in one word. */
export const PROCESS_RUN_STATUS_VIEW: Record<
  ProcessRun['status'],
  { label: string; tone: ProcessStatusTone }
> = {
  pending: { label: 'Starting', tone: 'queued' },
  running: { label: 'Running', tone: PROCESS_LIVE_TONE },
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
  if (status === 'running') return PROCESS_LIVE_TONE
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
 * never capped and nothing has been measured.
 *
 * Read from the ledger totals every surface shares — never from `spentUsd`,
 * which the driver stamps between steps and so lags whatever just finished.
 * Tokens with no known price are named beside the dollars, never counted as $0.
 */
export function processRunSpend(
  run: ProcessRun,
): { spent: number; cap?: number; label: string } | undefined {
  const cap = run.budget?.spendUsdCap
  const granted = run.budgetGrants?.spendUsdCap ?? 0
  const spent = run.totals?.costUsd
  const unpriced = run.totals?.unpricedTokens
  if (cap === undefined && spent === undefined && unpriced === undefined) return undefined
  const limit = cap === undefined ? undefined : cap + granted
  const money = (usd: number) => formatProcessCost({ costUsd: usd }) ?? ''
  const label =
    limit === undefined
      ? (formatProcessCost({ costUsd: spent, unpricedTokens: unpriced }) ?? '')
      : `${money(spent ?? 0)} of ${money(limit)}${granted > 0 ? ' (raised)' : ''}` +
        (unpriced ? ` + ${formatTokenCount(unpriced)} unpriced tokens` : '')
  return { spent: spent ?? 0, ...(limit !== undefined ? { cap: limit } : {}), label }
}

/**
 * Priced spend and unpriced tokens as one label, or `undefined` when neither
 * was measured. Sub-cent spend keeps four decimals so it never reads as $0.00.
 */
export function formatProcessCost(
  cost: { costUsd?: number; unpricedTokens?: number } | undefined,
): string | undefined {
  const parts: string[] = []
  const usd = cost?.costUsd
  if (usd !== undefined && Number.isFinite(usd)) {
    parts.push(usd > 0 && usd < 0.01 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(2)}`)
  }
  if (cost?.unpricedTokens) parts.push(`${formatTokenCount(cost.unpricedTokens)} unpriced tokens`)
  return parts.length > 0 ? parts.join(' + ') : undefined
}

function formatTokenCount(tokens: number): string {
  const compact = (value: number, unit: string) => `${Number(value.toFixed(1))}${unit}`
  if (tokens < 1_000) return String(tokens)
  if (tokens < 1_000_000) return compact(tokens / 1_000, 'k')
  return compact(tokens / 1_000_000, 'M')
}

/**
 * How long a run has worked at `now`: its ledger totals, with the clock carried
 * on from when they were read while a step is running. Parked time and gates
 * are not work, so they never count. Undefined for a run read without totals.
 */
export function processRunWorkMs(run: Pick<ProcessRun, 'totals'>, now: number): number | undefined {
  const totals = run.totals
  if (!totals) return undefined
  return totals.workMs + (totals.ticking ? Math.max(0, now - totals.at) : 0)
}

/** A run's work time as a label, or undefined when the run was read without totals. */
export function processRunWorkLabel(
  run: Pick<ProcessRun, 'totals'>,
  now: number,
): string | undefined {
  const ms = processRunWorkMs(run, now)
  return ms === undefined ? undefined : formatProcessDuration(ms)
}

/**
 * How long a step has worked across EVERY attempt, live while its latest one
 * runs. A step retried three times took all three — the latest alone is what
 * made a verifier look like it ran for nine minutes when it ran for forty.
 */
export function processStepWorkMs(
  run: Pick<ProcessRun, 'totals'>,
  state: {
    step: Pick<ProcessStep, 'id'>
    latest?: Pick<ProcessLedgerEntry, 'status'>
  },
  now: number,
): number | undefined {
  const totals = run.totals
  const step = totals?.steps[state.step.id]
  if (!totals || !step) return undefined
  const live =
    totals.ticking && state.latest?.status === 'running' ? Math.max(0, now - totals.at) : 0
  return step.workMs + live
}

/** What a step has cost across every attempt, as a label. */
export function processStepCostLabel(
  run: Pick<ProcessRun, 'totals'>,
  stepId: string,
): string | undefined {
  return formatProcessCost(run.totals?.steps[stepId])
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
 * A node's visual state on the pipeline spine.
 *
 * Derived, not stored: it folds the run's cursor, the step's outcome and the
 * run's park point into the one word the marker needs. `parked` wins over
 * everything, because a run sitting on a decision is the thing the eye must find
 * first. `requeued` is a step a later pass went back over — a verify that failed
 * and sent the work back is NEXT again, not the red failure it no longer is.
 */
export type ProcessNodeState =
  | 'done'
  | 'working'
  | 'failed'
  | 'parked'
  | 'queued'
  | 'skipped'
  | 'requeued'

/** The node state for one step, given where the run has parked (if anywhere). */
export function processNodeState(
  state: Pick<ProcessStepState, 'status' | 'outcome' | 'requeued'> & { step: { id: string } },
  parkedStepId: string | undefined,
): ProcessNodeState {
  if (parkedStepId !== undefined && state.step.id === parkedStepId) return 'parked'
  if (state.status === 'running') return 'working'
  if (state.requeued) return 'requeued'
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
      return PROCESS_LIVE_TONE
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

/** How a node's marker is drawn — see {@link ProcessNodeLook}. */
export function processNodeLook(
  nodeState: ProcessNodeState,
  isGate: boolean,
  ordinal: number,
): ProcessNodeLook {
  const shape: ProcessNodeLook['shape'] =
    nodeState === 'working'
      ? 'ring'
      : nodeState === 'queued' || nodeState === 'requeued' || nodeState === 'skipped'
        ? 'dashed'
        : 'solid'
  return {
    tone: processNodeTone(nodeState, isGate),
    shape,
    spin: nodeState === 'working',
    glyph: processNodeGlyph(nodeState, ordinal),
  }
}

/**
 * A node's attempt badge. A requeued step names the attempt that is COMING —
 * "attempt 4 of 4 · next" — rather than the one that is over.
 */
export function processNodeBadge(
  state: Pick<ProcessStepState, 'attempts' | 'requeued'>,
  run: { plan: Pick<ProcessPlan, 'loops'> } & Pick<ProcessRun, 'iterationGrants'>,
): string | undefined {
  if (!state.requeued) return processIterationBadge(state.attempts, run)
  return `${processIterationBadge(state.attempts + 1, run)} · next`
}

/**
 * The line under a node. For a requeued step its last result is history, said
 * as such and drawn muted, so it cannot read as the current verdict.
 */
export function processNodeSummary(
  state: Pick<ProcessStepState, 'attempts' | 'requeued' | 'outcome'> & {
    latest?: Pick<ProcessLedgerEntry, 'summary'>
  },
): ProcessNodeSummary | undefined {
  const summary = state.latest?.summary?.trim()
  if (!summary) return undefined
  if (!state.requeued) return { text: summary, muted: false }
  const failed =
    state.outcome === 'failed' || state.outcome === 'errored' || state.outcome === 'unchecked'
  return {
    text: failed
      ? `Attempt ${state.attempts} did not pass: ${summary}`
      : `Attempt ${state.attempts}: ${summary}`,
    muted: true,
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
 * The "attempt N of M" badge for a node — shown ONLY once a loop has actually
 * fired (more than one attempt), because a "1 of 3" on every step is noise that
 * hides the one node that really did retry. M is the plan's retry cap plus any
 * extra attempts the user granted at an exhausted loop, as the driver counts it.
 */
export function processIterationBadge(
  attempts: number,
  run: { plan: Pick<ProcessPlan, 'loops'> } & Pick<ProcessRun, 'iterationGrants'>,
): string | undefined {
  if (attempts <= 1) return undefined
  let cap: number | undefined
  for (const loop of run.plan.loops) {
    const allowed = loop.maxIterations + (run.iterationGrants?.[loop.id] ?? 0)
    if (cap === undefined || allowed > cap) cap = allowed
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

/**
 * Whether a step's attempts are separate agent runs, each with its own chat.
 *
 * Only then do per-attempt chips open anything different. A developer's fix
 * loop RESUMES one chat, so its three attempts are one conversation — chips for
 * it would all open the same place. A verifier runs fresh every time, so each
 * attempt is its own chat worth opening. Attempts that have not attached a chat
 * yet are left out rather than counted as different.
 */
export function hasIsolatedAttempts(
  entries: readonly Pick<ProcessLedgerEntry, 'runRef'>[],
): boolean {
  const chats = entries
    .map((e) => e.runRef?.chatContextId)
    .filter((c): c is string => c !== undefined)
  return chats.length >= 2 && new Set(chats).size === chats.length
}

/** A verify attempt's headline, toned the way the sign-off tones a section. */
export type VerifyReviewStatus = { tone: 'done' | 'review' | 'stuck'; label: string }

/** What a verify attempt came to, in the sign-off's words. */
export function verifyReviewStatus(
  entry: Pick<ProcessLedgerEntry, 'status' | 'outcome'>,
): VerifyReviewStatus {
  if (entry.status === 'running') return { tone: 'review', label: 'Verifying…' }
  switch (entry.outcome) {
    case 'passed':
      return { tone: 'done', label: 'Verify passed' }
    case 'failed':
      return { tone: 'stuck', label: 'Verify failed' }
    case 'errored':
      return { tone: 'stuck', label: 'Verify errored' }
    case 'question':
      return { tone: 'review', label: 'Waiting on a question' }
    case 'skipped':
      return { tone: 'review', label: 'Skipped' }
    default:
      return { tone: 'review', label: 'Not proven' }
  }
}

/** A leaf opened from the pipeline: the run it owns, what to call it, and its ledger entry. */
export type ProcessOpenLeaf = {
  ref: ProcessNodeRunRef
  title: string
  /** The attempt it came from — lets its verify proof be re-read live as the run moves. */
  entryId?: string
}

/**
 * The leaf for one attempt of a step, or `undefined` when it has no run to open.
 * Numbered only when the step ran more than once.
 */
export function processAttemptLeaf(
  entry: ProcessLedgerEntry | undefined,
  stepName: string,
  attempt?: { index: number; total: number },
): ProcessOpenLeaf | undefined {
  if (!entry?.runRef) return undefined
  return {
    ref: entry.runRef,
    title: attempt && attempt.total > 1 ? `${stepName} · attempt ${attempt.index}` : stepName,
    entryId: entry.id,
  }
}

/** A verify leaf's proof, read from the run as it is NOW — not as it was when opened. */
export function processLeafReview(
  run: Pick<ProcessRun, 'ledger' | 'plan'>,
  leaf: Pick<ProcessOpenLeaf, 'entryId'>,
): { scope: ProcessVerifyReview; entry: ProcessLedgerEntry } | undefined {
  if (leaf.entryId === undefined) return undefined
  const entry = run.ledger.find((e) => e.id === leaf.entryId)
  if (!entry) return undefined
  const scope = processVerifyReview(run, entry)
  return scope ? { scope, entry } : undefined
}

/**
 * Whether a leaf opens: a verify attempt always does (its proof renders in
 * place), any other only when there is a chat to open and a way to show it.
 */
export function isProcessLeafOpenable(
  run: Pick<ProcessRun, 'ledger' | 'plan'>,
  leaf: ProcessOpenLeaf | undefined,
  canOpenTranscript: boolean,
): leaf is ProcessOpenLeaf {
  if (!leaf) return false
  if (processLeafReview(run, leaf)) return true
  return canOpenTranscript && leaf.ref.chatContextId !== undefined
}

/**
 * The newest attempt of a step that has something to open. A retry that never
 * attached a run (the reviewer could not start) must not make the step's earlier,
 * real attempt unreachable behind a dead "open".
 */
export function latestOpenableAttempt(
  run: Pick<ProcessRun, 'ledger' | 'plan'>,
  entries: readonly ProcessLedgerEntry[],
  stepName: string,
  canOpenTranscript: boolean,
): ProcessOpenLeaf | undefined {
  for (let i = entries.length - 1; i >= 0; i--) {
    const leaf = processAttemptLeaf(entries[i], stepName, { index: i + 1, total: entries.length })
    if (isProcessLeafOpenable(run, leaf, canOpenTranscript)) return leaf
  }
  return undefined
}
