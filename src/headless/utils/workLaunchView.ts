import {
  PROOF_KIND_LABELS,
  PROOF_KINDS,
  WORK_LAUNCH_MODE_HINTS,
  WORK_LAUNCH_MODE_LABELS,
  WORK_LAUNCH_MODES,
} from 'thefactory-tools/constants'
import type { LaunchSetupSuggestion, ProcessProposal, ProofKind } from 'thefactory-tools/types'
import { projectWorkLaunchMode } from 'thefactory-tools/utils'
import type { ChatContext, CliReasoningEffort } from '../api'
import type { ActivityCliModel } from '../contexts/LLMConfigsContext'
import type { PendingToolGrantDecision } from './chatTypes'
import type { LaunchProofPlanEdits } from './proofPlanViewTypes'
import { cliLabel } from './cliRunner'
import { modelDisplayName } from './runModel'
import { FEATURE_PROCESS_WORDS, LAUNCH_SUGGESTION_LABELS } from './workLaunchViewConstants'
import type {
  LaunchSuggestionBody,
  LaunchSuggestionInput,
  LaunchSuggestionPicks,
  LaunchSuggestionRow,
  StartWorkTarget,
  WorkLaunchOptionView,
} from './workLaunchViewTypes'

/** The two ways to start work, the project's last way first-picked. Pure. */
export function workLaunchOptions(
  metadata: { workLaunchMode?: unknown } | undefined,
): WorkLaunchOptionView[] {
  const preselected = projectWorkLaunchMode(metadata)
  return WORK_LAUNCH_MODES.map((mode) => ({
    mode,
    label: WORK_LAUNCH_MODE_LABELS[mode],
    hint: WORK_LAUNCH_MODE_HINTS[mode],
    preselected: mode === preselected,
  }))
}

function proofWords(kinds: readonly ProofKind[]): string {
  return PROOF_KINDS.filter((k) => kinds.includes(k))
    .map((k) => PROOF_KIND_LABELS[k])
    .join(', ')
}

/** What an agent suggested, one row per setting, in the launch card's order. Pure. */
export function launchSuggestionRows(
  suggestion: LaunchSetupSuggestion | undefined,
): LaunchSuggestionRow[] {
  if (!suggestion) return []
  const rows: LaunchSuggestionRow[] = []
  const add = (key: LaunchSuggestionRow['key'], value: string, reason: string) =>
    rows.push({ key, label: LAUNCH_SUGGESTION_LABELS[key], value, reason })
  const s = suggestion
  if (s.processId) add('processId', s.processId.value, s.processId.reason)
  if (s.featureProcessId) {
    const id = s.featureProcessId.value
    add('featureProcessId', FEATURE_PROCESS_WORDS[id] ?? id, s.featureProcessId.reason)
  }
  if (s.proofKinds) add('proofKinds', proofWords(s.proofKinds.value), s.proofKinds.reason)
  if (s.codeReview) add('codeReview', s.codeReview.value ? 'On' : 'Off', s.codeReview.reason)
  if (s.turnLimit) {
    const { limitTurns, maxTurns } = s.turnLimit.value
    add('turnLimit', limitTurns ? `${maxTurns} turns` : 'No limit', s.turnLimit.reason)
  }
  if (s.model) add('model', s.model.value, s.model.reason)
  if (s.baseBranch) add('baseBranch', s.baseBranch.value, s.baseBranch.reason)
  return rows
}

/**
 * Who suggested a setup, as a person reads it: `claude-fable-5` → `Fable 5`,
 * `claude-code · opus` → `Claude Code · Opus`. Pure.
 */
export function launchSuggestionSigner(answeredBy: string): string {
  const [first, ...rest] = answeredBy.split(' · ').map((part) => part.trim())
  if (rest.length === 0) return modelDisplayName(first ?? '')
  return [cliLabel(first), modelDisplayName(rest.join(' · '))].filter(Boolean).join(' · ')
}

/** The launch card's own picks a suggestion sets, each only when it suggested one. Pure. */
export function launchSuggestionPicks(suggestion: LaunchSetupSuggestion): LaunchSuggestionPicks {
  return {
    ...(suggestion.processId ? { processId: suggestion.processId.value } : {}),
    ...(suggestion.featureProcessId ? { featureProcessId: suggestion.featureProcessId.value } : {}),
    ...(suggestion.baseBranch ? { baseBranch: suggestion.baseBranch.value } : {}),
    ...(suggestion.model ? { model: suggestion.model.value } : {}),
    ...(suggestion.turnLimit
      ? {
          turnLimit: {
            limited: suggestion.turnLimit.value.limitTurns,
            maxTurns: suggestion.turnLimit.value.maxTurns,
          },
        }
      : {}),
  }
}

/**
 * Each feature's proof as a suggestion sets it: the suggested kinds, the code
 * review's approval switched as suggested, never a kind the feature cannot
 * produce, its notes kept. Empty when it suggested no proof. Pure.
 */
export function launchSuggestionProofEdits(
  proposal: Pick<ProcessProposal, 'proofPlans'> | undefined,
  suggestion: LaunchSetupSuggestion,
): LaunchProofPlanEdits {
  if (!suggestion.proofKinds && !suggestion.codeReview) return {}
  const edits: Record<string, { kinds: ProofKind[]; notes: string }> = {}
  for (const plan of proposal?.proofPlans ?? []) {
    const unavailable = new Set((plan.unavailable ?? []).map((u) => u.kind))
    const chosen = new Set<ProofKind>(suggestion.proofKinds?.value ?? plan.plan.kinds)
    if (suggestion.codeReview?.value === true) chosen.add('code-review')
    if (suggestion.codeReview?.value === false) chosen.delete('code-review')
    edits[plan.featureId] = {
      kinds: PROOF_KINDS.filter((k) => chosen.has(k) && !unavailable.has(k)),
      notes: plan.plan.notes ?? '',
    }
  }
  return edits
}

/** What asking for a suggested setup sends for a card as it stands, leaving out what is not picked. Pure. */
export function launchSuggestionBody(
  input: LaunchSuggestionInput & { projectId: string; storyId: string },
): LaunchSuggestionBody {
  return {
    projectId: input.projectId,
    storyId: input.storyId,
    runner: input.runner,
    ...(input.featureIds?.length ? { featureIds: [...input.featureIds] } : {}),
    ...(input.processId ? { processId: input.processId } : {}),
    ...(input.featureProcessId ? { featureProcessId: input.featureProcessId } : {}),
    ...(input.baseBranch ? { baseBranch: input.baseBranch } : {}),
    ...(input.cliTool ? { cliTool: input.cliTool } : {}),
    ...(input.model ? { model: input.model } : {}),
    ...(input.cliCredentialId ? { cliCredentialId: input.cliCredentialId } : {}),
    ...(input.chatContextId ? { chatContextId: input.chatContextId } : {}),
    ...(input.models?.length ? { models: [...input.models] } : {}),
    ...(input.turnLimit ? { turnLimit: input.turnLimit } : {}),
  }
}

/**
 * The agent work started in a chat runs on, as a launch carries it: the
 * person's active CLI pick with its model, login and effort, else the API at
 * the agent-run effort. Pure.
 */
export function workLaunchChatAgent(
  runnerKind: 'api' | 'cli',
  cli: ActivityCliModel | null,
  apiEffort: CliReasoningEffort | null,
): Record<string, unknown> {
  if (runnerKind === 'cli' && cli) {
    return {
      runner: 'cli',
      cliTool: cli.cli,
      ...(cli.modelId ? { cliModel: cli.modelId } : {}),
      ...(cli.credentialId ? { cliCredentialId: cli.credentialId } : {}),
      ...(cli.effort ? { effort: cli.effort } : {}),
    }
  }
  return { runner: 'api', ...(apiEffort ? { effort: apiEffort } : {}) }
}

/** What a launch card's decision carries: the card's picks on an approval, nothing on a deny. Pure. */
export function launchDecisionMetadata(
  decision: PendingToolGrantDecision,
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  return decision === 'deny' ? undefined : metadata
}

/** The chat a start's work belongs to — a feature request's, else its story's. Pure. */
export function startWorkChatContext(target: StartWorkTarget): ChatContext {
  return target.request
    ? { type: 'FEATURE_REQUEST', projectId: target.projectId, featureRequestId: target.request.id }
    : { type: 'STORY', projectId: target.projectId, storyId: target.storyId }
}
