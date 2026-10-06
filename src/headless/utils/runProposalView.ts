import {
  PROPOSE_FEATURE_CHANGE_TOOL_NAME,
  PROPOSE_RUN_FEATURE_TOOL_NAME,
  RESOLVE_NEEDS_YOU_ITEM_TOOL_NAME,
  RUN_PROPOSAL_CHANGE,
  RUN_PROPOSAL_DEFER,
  RUN_PROPOSAL_FEATURE,
  RUN_PROPOSAL_LINE_LABELS,
  RUN_PROPOSAL_NEW_STORY,
  RUN_PROPOSAL_RESOLVE,
  RUN_PROPOSAL_TOOL_NAMES,
} from './runProposalViewConstants'
import type { RunProposalLine, RunProposalView } from './runProposalViewTypes'

type GrantLike = { toolName?: string; args?: unknown; detail?: unknown }

const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}

const text = (args: Record<string, unknown>, key: string): string | undefined =>
  typeof args[key] === 'string' && (args[key] as string).trim()
    ? (args[key] as string).trim()
    : undefined

/** Whether an approval is for one of a run chat's proposals — named by the grant or its payload. */
export function isRunProposalGrant(grant: GrantLike): boolean {
  const tool = grant.toolName ?? record(grant.detail).tool
  return typeof tool === 'string' && RUN_PROPOSAL_TOOL_NAMES.includes(tool)
}

/** The tool a run-chat approval is for. */
export function runProposalToolName(grant: GrantLike): string {
  const tool = grant.toolName ?? record(grant.detail).tool
  return typeof tool === 'string' ? tool : ''
}

/** The arguments the agent proposed with. */
export function runProposalArgs(grant: GrantLike): Record<string, unknown> {
  return grant.args !== undefined ? record(grant.args) : record(record(grant.detail).args)
}

function proofPlanLine(value: unknown): string | undefined {
  const plan = record(value)
  const kinds = Array.isArray(plan.kinds)
    ? plan.kinds.filter((k): k is string => typeof k === 'string')
    : []
  if (kinds.length === 0) return undefined
  const notes = text(plan, 'notes')
  return notes ? `${kinds.join(', ')} — ${notes}` : kinds.join(', ')
}

function lines(entries: Array<[string, string | undefined]>): RunProposalLine[] {
  return entries.flatMap(([label, value]) => (value ? [{ label, text: value }] : []))
}

/**
 * A run chat's proposal as its approval card shows it: its kind, what it says
 * and what approving it does. `featureTitle` names the feature a change is
 * for, when it can be read. `undefined` for any other tool.
 */
export function runProposalView(
  toolName: string,
  args: Record<string, unknown>,
  featureTitle?: string,
): RunProposalView | undefined {
  const needsYouItemId = text(args, 'needsYouItemId') ?? text(args, 'itemId')
  const base = { featureId: undefined, storyId: undefined, needsYouItemId }
  if (toolName === PROPOSE_RUN_FEATURE_TOOL_NAME) {
    return {
      ...base,
      kind: 'feature',
      kindLabel: RUN_PROPOSAL_FEATURE.kindLabel,
      tone: 'review',
      title: text(args, 'title') ?? '',
      lines: lines([
        [RUN_PROPOSAL_LINE_LABELS.description, text(args, 'description')],
        [RUN_PROPOSAL_LINE_LABELS.acceptance, text(args, 'acceptance')],
        [RUN_PROPOSAL_LINE_LABELS.proofPlan, proofPlanLine(args.proofPlan)],
      ]),
      effect: RUN_PROPOSAL_FEATURE.effect,
      approveLabel: RUN_PROPOSAL_FEATURE.approveLabel,
    }
  }
  if (toolName === PROPOSE_FEATURE_CHANGE_TOOL_NAME) {
    const featureId = text(args, 'featureId')
    const proof = Array.isArray(args.proofKinds)
      ? args.proofKinds.filter((k): k is string => typeof k === 'string')
      : []
    return {
      ...base,
      featureId,
      kind: 'change',
      kindLabel: RUN_PROPOSAL_CHANGE.kindLabel,
      tone: 'working',
      title: featureTitle ?? featureId ?? '',
      lines: lines([
        [RUN_PROPOSAL_LINE_LABELS.description, text(args, 'description')],
        [RUN_PROPOSAL_LINE_LABELS.acceptance, text(args, 'acceptance')],
        [RUN_PROPOSAL_LINE_LABELS.proofPlan, proofPlanLine(args.proofPlan)],
        [RUN_PROPOSAL_LINE_LABELS.note, text(args, 'note')],
        [RUN_PROPOSAL_LINE_LABELS.proof, proof.length > 0 ? proof.join(', ') : undefined],
      ]),
      effect: RUN_PROPOSAL_CHANGE.effect,
      approveLabel: RUN_PROPOSAL_CHANGE.approveLabel,
    }
  }
  if (toolName === RESOLVE_NEEDS_YOU_ITEM_TOOL_NAME) {
    const storyId = text(args, 'storyId')
    const copy = storyId
      ? RUN_PROPOSAL_NEW_STORY
      : args.kind === 'deferred'
        ? RUN_PROPOSAL_DEFER
        : RUN_PROPOSAL_RESOLVE
    return {
      ...base,
      storyId,
      kind: 'resolve',
      kindLabel: copy.kindLabel,
      tone: 'done',
      title: text(args, 'decision') ?? '',
      lines: [],
      effect: copy.effect,
      approveLabel: copy.approveLabel,
    }
  }
  return undefined
}
