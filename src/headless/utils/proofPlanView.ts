import {
  PROOF_KINDS,
  PROOF_KIND_LABELS,
  PROOF_KIND_MEANINGS,
  UI_CHANGE_PLAN_WARNING,
  UI_CHANGE_WORDS_HINT,
} from 'thefactory-tools/constants'
import type {
  LaunchProofPlan,
  ProcessProposal,
  ProcessRun,
  ProofKind,
  ProofPlan,
} from 'thefactory-tools/types'
import {
  normalizeProofPlan,
  processRunProofPlanStanding,
  proofPlanOf,
} from 'thefactory-tools/utils'

import {
  PROOF_KIND_STATUS_TONES,
  PROOF_KIND_STATUS_WORDS,
  PROOF_PLAN_CLEARED_TEXT,
  PROOF_PLAN_DROPPED_LINE,
  PROOF_PLAN_NOTES_PREFIX,
  PROOF_PLAN_SOURCE_LABELS,
} from './proofPlanViewConstants'
import type { ProcessProposalView } from './processProposalView'
import type {
  LaunchFeatureRow,
  LaunchProofPlanEdits,
  LaunchProofPlanRow,
  ProofKindOptionView,
  ProofPlanDraft,
  ProofPlanLaunchMetadata,
  ProofPlanMarkRow,
} from './proofPlanViewTypes'

/** Every kind of proof, in the order every picker lists them. */
export function proofKindOptions(): ProofKindOptionView[] {
  return PROOF_KINDS.map((kind) => ({
    kind,
    label: PROOF_KIND_LABELS[kind],
    meaning: PROOF_KIND_MEANINGS[kind],
  }))
}

/** A stored plan as an editor holds it. */
export function proofPlanDraftOf(plan: ProofPlan | undefined): ProofPlanDraft {
  return { kinds: plan ? [...plan.kinds] : [], notes: plan?.notes ?? '' }
}

/** The draft with `kind` picked or unpicked, kinds kept in their canonical order. */
export function toggleProofPlanDraftKind(draft: ProofPlanDraft, kind: ProofKind): ProofPlanDraft {
  const picked = draft.kinds.includes(kind)
    ? draft.kinds.filter((k) => k !== kind)
    : [...draft.kinds, kind]
  return { ...draft, kinds: PROOF_KINDS.filter((k) => picked.includes(k)) }
}

/** The plan a draft saves as — `undefined` when no kind is picked. */
export function proofPlanOfDraft(draft: ProofPlanDraft): ProofPlan | undefined {
  return normalizeProofPlan({ kinds: draft.kinds, notes: draft.notes })
}

/** Whether two drafts save as the same plan. */
export function proofPlanDraftsEqual(a: ProofPlanDraft, b: ProofPlanDraft): boolean {
  return JSON.stringify(proofPlanOfDraft(a)) === JSON.stringify(proofPlanOfDraft(b))
}

/** A plan's kinds in one line — "Unit tests · Code review". */
export function proofPlanSummaryLine(plan: ProofPlan): string {
  return plan.kinds.map((k) => PROOF_KIND_LABELS[k]).join(' · ')
}

function launchDraft(plan: LaunchProofPlan, edits: LaunchProofPlanEdits): ProofPlanDraft {
  return edits[plan.featureId] ?? proofPlanDraftOf(plan.plan)
}

/**
 * Each feature's proof plan as the launch shows it: the person's change if
 * they made one, else the proposal's — every kind marked picked or not, what
 * this host or process cannot prove marked with why and held off (never
 * picked, only dropped), flagged when the plan asks for it, and what the
 * feature's or story's own plan asked for that was dropped.
 */
export function launchProofPlanRows(
  proposal: Pick<ProcessProposal, 'proofPlans'> | undefined,
  edits: LaunchProofPlanEdits,
): LaunchProofPlanRow[] {
  return (proposal?.proofPlans ?? []).map((plan) => {
    const draft = launchDraft(plan, edits)
    const unavailable = new Map((plan.unavailable ?? []).map((u) => [u.kind, u.reason]))
    const kinds = proofKindOptions().map((option) => {
      const checked = draft.kinds.includes(option.kind)
      const reason = unavailable.get(option.kind)
      return {
        ...option,
        checked,
        ...(reason !== undefined ? { unavailable: reason } : {}),
        disabled: reason !== undefined && !checked,
      }
    })
    return {
      featureId: plan.featureId,
      title: plan.title,
      source: plan.source,
      sourceLabel: PROOF_PLAN_SOURCE_LABELS[plan.source],
      edited: edits[plan.featureId] !== undefined,
      kinds,
      flagged: kinds.flatMap((k) =>
        k.checked && k.unavailable ? [{ kind: k.kind, label: k.label, reason: k.unavailable }] : [],
      ),
      dropped: (plan.dropped ?? []).map((u) =>
        PROOF_PLAN_DROPPED_LINE(PROOF_KIND_LABELS[u.kind], u.reason),
      ),
      notes: draft.notes,
      empty: draft.kinds.length === 0,
      ...(plan.looksUi && !draft.kinds.includes('ui-before-after')
        ? plan.looksUiByWords
          ? { uiHint: UI_CHANGE_WORDS_HINT }
          : { uiWarning: UI_CHANGE_PLAN_WARNING }
        : {}),
    }
  })
}

/** The launch's edits with `kind` toggled on one feature's plan. */
export function toggleLaunchProofKind(
  proposal: Pick<ProcessProposal, 'proofPlans'> | undefined,
  edits: LaunchProofPlanEdits,
  featureId: string,
  kind: ProofKind,
): LaunchProofPlanEdits {
  const plan = proposal?.proofPlans?.find((p) => p.featureId === featureId)
  if (!plan) return edits
  const draft = launchDraft(plan, edits)
  const adding = !draft.kinds.includes(kind)
  if (adding && (plan.unavailable ?? []).some((u) => u.kind === kind)) return edits
  return { ...edits, [featureId]: toggleProofPlanDraftKind(draft, kind) }
}

/** The launch's edits with one feature's notes replaced. */
export function setLaunchProofNotes(
  proposal: Pick<ProcessProposal, 'proofPlans'> | undefined,
  edits: LaunchProofPlanEdits,
  featureId: string,
  notes: string,
): LaunchProofPlanEdits {
  const plan = proposal?.proofPlans?.find((p) => p.featureId === featureId)
  if (!plan) return edits
  return { ...edits, [featureId]: { ...launchDraft(plan, edits), notes } }
}

/**
 * The approval's metadata for the plans as confirmed: every feature's plan as
 * it stands — the proposal's, or the person's change — and whether to save
 * them back onto the features. A feature left with no kind is not confirmed,
 * so its proof is chosen automatically. `undefined` when there is nothing.
 */
export function proofPlanMetadata(
  proposal: Pick<ProcessProposal, 'proofPlans'> | undefined,
  edits: LaunchProofPlanEdits,
  save: boolean,
  /** Turns what the person typed in the notes (`#3.2`) into ids; the proposal's own words stay. */
  canonicalize?: (text: string, before?: string) => string,
): ProofPlanLaunchMetadata | undefined {
  const proofPlans: Record<string, ProofPlan> = {}
  for (const plan of proposal?.proofPlans ?? []) {
    const draft = launchDraft(plan, edits)
    const confirmed = proofPlanOfDraft(
      canonicalize ? { ...draft, notes: canonicalize(draft.notes, plan.plan.notes) } : draft,
    )
    if (confirmed) proofPlans[plan.featureId] = confirmed
  }
  if (Object.keys(proofPlans).length === 0) return undefined
  return { proofPlans, ...(save ? { saveProofPlans: true as const } : {}) }
}

/**
 * A feature run's proof plan as its sign-off marks it — each kind, where it
 * stands and why — judged from the run's own ledger by the rule its gate uses.
 * `undefined` for a run launched without a plan.
 */
export function proofPlanMarkRows(
  run: Pick<ProcessRun, 'featureId' | 'plan' | 'ledger'> &
    Partial<Pick<ProcessRun, 'input' | 'status'>>,
): ProofPlanMarkRow[] | undefined {
  const standings = processRunProofPlanStanding({ ...run, status: run.status ?? 'succeeded' })
  return standings?.map((s) => ({
    kind: s.kind,
    label: PROOF_KIND_LABELS[s.kind],
    word: PROOF_KIND_STATUS_WORDS[s.status],
    detail: s.detail,
    tone: PROOF_KIND_STATUS_TONES[s.status],
  }))
}

/**
 * A proof plan as a field preview prints it — its kinds in a line and what
 * must be shown — or `undefined` when the value is not a plan at all.
 */
export function proofPlanFieldText(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  if (!('kinds' in value)) return undefined
  const plan = proofPlanOf(value)
  if (!plan) return PROOF_PLAN_CLEARED_TEXT
  return [
    proofPlanSummaryLine(plan),
    ...(plan.notes ? [`${PROOF_PLAN_NOTES_PREFIX} ${plan.notes}`] : []),
  ].join('\n')
}

/**
 * The launch card's features, each once: in the order the run works them, with
 * the steps it runs through and its proof plan. A proof row whose feature the
 * plan does not list follows, so no plan is hidden while the plan is unknown. Pure.
 */
export function launchFeatureRows(
  view: Pick<ProcessProposalView, 'features'> | undefined,
  proofRows: readonly LaunchProofPlanRow[],
): LaunchFeatureRow[] {
  const proofOf = new Map(proofRows.map((row) => [row.featureId, row]))
  const labels = (row: LaunchProofPlanRow | undefined): string[] =>
    row ? row.kinds.filter((k) => k.checked).map((k) => k.label) : []
  const rows: LaunchFeatureRow[] = (view?.features ?? []).map((feature) => {
    const proof = proofOf.get(feature.id)
    return {
      featureId: feature.id,
      title: feature.title,
      chain: feature.chain,
      ...(feature.maxIterations !== undefined ? { maxIterations: feature.maxIterations } : {}),
      ...(proof ? { proof } : {}),
      proofLabels: labels(proof),
    }
  })
  const listed = new Set(rows.map((r) => r.featureId))
  for (const proof of proofRows) {
    if (listed.has(proof.featureId)) continue
    rows.push({
      featureId: proof.featureId,
      title: proof.title,
      chain: [],
      proof,
      proofLabels: labels(proof),
    })
  }
  return rows
}
