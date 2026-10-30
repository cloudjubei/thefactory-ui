import {
  activityStopApprovalView,
  activityStopArgs,
  activityStopCardOf,
  isActivityStopGrant,
} from './activityStopApproval'
import { grantDetailView } from './approvalGrant'
import { gitChangeArgs, gitChangeCard, isGitChangeGrant } from './gitChangeApproval'
import { gitSetupFormFor, gitSetupPlan, isGitSetupGrant } from './gitSetupApproval'
import {
  isRunProposalGrant,
  runProposalArgs,
  runProposalHostDetail,
  runProposalStepName,
  runProposalToolName,
  runProposalView,
} from './runProposalView'
import {
  gitChangeAskView,
  gitSetupAskView,
  runProposalAskView,
  toolAskCardView,
} from './toolAskCard'
import { TOOL_ASK_COPY } from './toolAskCardConstants'
import type { ToolAskCardView, ToolAskRowView } from './toolAskCardTypes'

type GrantLike = { label: string; toolName?: string; args?: unknown; detail?: unknown }

/**
 * The card an ask opens to, as its own panel reads it — a git change, a stop,
 * a run's proposal, putting a project on GitHub, or the card every other tool
 * shares. `undefined` where that card would say nothing the row does not: an
 * ordinary call the host wrote no sentence for. Pure.
 */
function askCardOf(grant: GrantLike): ToolAskCardView | undefined {
  if (isGitChangeGrant(grant)) {
    const card = gitChangeCard(grant)
    if (card) return gitChangeAskView(card, gitChangeArgs(grant))
  }
  if (isActivityStopGrant(grant)) {
    return activityStopApprovalView(activityStopCardOf(grant), activityStopArgs(grant)).ask
  }
  if (isRunProposalGrant(grant)) {
    const args = runProposalArgs(grant)
    const view = runProposalView(
      runProposalToolName(grant),
      args,
      runProposalStepName(grant),
      runProposalHostDetail(grant),
    )
    if (view) return runProposalAskView(view, args)
  }
  if (isGitSetupGrant(grant)) {
    return gitSetupAskView(gitSetupPlan(gitSetupFormFor(grant, ''), {}), runProposalArgs(grant))
  }
  const view = toolAskCardView(grant)
  const generic = view.icon === 'tool' && view.body.kind === 'details'
  return generic && grantDetailView(grant.detail).headline === undefined ? undefined : view
}

/**
 * A waiting ask as its call's row shows it, compact — the headline of the
 * card it opens to, and "Cannot be undone" on one that throws something away
 * for good. `undefined` for an ordinary call whose card would add nothing to
 * its row: that row stays as it is. Pure.
 */
export function toolAskRowView(grant: GrantLike): ToolAskRowView | undefined {
  const card = askCardOf(grant)
  if (!card) return undefined
  return {
    headline: card.headline,
    tone: card.tone,
    ...(card.tone === 'danger' ? { tag: TOOL_ASK_COPY.cannotUndo } : {}),
  }
}
