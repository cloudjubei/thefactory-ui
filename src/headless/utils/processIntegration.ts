import type {
  ProcessGroupRun,
  ProcessIntegrationMode,
  ProcessResumeChoice,
  ProcessRun,
  ProcessWorkBranch,
} from 'thefactory-tools/types'
import {
  isProcessIntegrationRequired,
  isProcessRunAwaitingIntegration,
  processAlreadyLandedText,
  processGroupLegIntegrationModes,
  processIntegrationConflictResolution,
  processIntegrationModesOffered,
} from 'thefactory-tools/utils'
import {
  PROCESS_INTEGRATION_BADGE,
  PROCESS_INTEGRATION_COMPARE_LINK,
  PROCESS_INTEGRATION_CONFLICT,
  PROCESS_INTEGRATION_NEVER_TRIED,
  PROCESS_INTEGRATION_NEVER_TRIED_TITLE,
  PROCESS_INTEGRATION_PR_LINK,
  PROCESS_INTEGRATION_SHADOW,
} from './processIntegrationConstants'
import { PROCESS_INTEGRATION_CHECK_MERGE } from './processIntegrationFormConstants'
import type { ProcessIntegrationChoice, ProcessIntegrationView } from './processIntegrationTypes'
import type { ProcessStatusTone } from './processView'

/**
 * The three ways Approve can bring a story's work in, each with the one line a
 * person reads before choosing — naming the branches it touches. A project with
 * no git of its own has the one: approving brings the work into its folder.
 */
export function processIntegrationChoices(
  workBranch: Pick<ProcessWorkBranch, 'name' | 'baseRef' | 'shadow'>,
  modes?: readonly ProcessIntegrationMode[],
): ProcessIntegrationChoice[] {
  const offered = processIntegrationModesOffered(workBranch, modes)
  return integrationChoicesOf(workBranch).filter((c) => offered.includes(c.mode))
}

function integrationChoicesOf(
  workBranch: Pick<ProcessWorkBranch, 'name' | 'baseRef' | 'shadow'>,
): ProcessIntegrationChoice[] {
  const { name, baseRef } = workBranch
  if (workBranch.shadow) {
    return [
      {
        mode: 'merge',
        label: PROCESS_INTEGRATION_SHADOW.label,
        detail: PROCESS_INTEGRATION_SHADOW.detail,
      },
    ]
  }
  return [
    {
      mode: 'merge',
      label: 'Merge',
      detail: `Adds each agent’s commit to ${baseRef} as it is.`,
    },
    {
      mode: 'squash',
      label: 'Merge as one commit',
      detail: `Squashes the work into a single commit on ${baseRef}.`,
    },
    {
      mode: 'pull-request',
      label: 'Open a pull request',
      detail: `Pushes ${name} and opens a PR for review on GitHub / Azure DevOps; nothing reaches ${baseRef} until it is merged there.`,
    },
  ]
}

/**
 * The way approved work comes in when there is only one, so approving needs no
 * choice; `undefined` when the person picks.
 */
export function soleIntegrationMode(
  workBranch: Pick<ProcessWorkBranch, 'name' | 'baseRef' | 'shadow'>,
  modes?: readonly ProcessIntegrationMode[],
): ProcessIntegrationMode | undefined {
  const choices = processIntegrationChoices(workBranch, modes)
  return choices.length === 1 ? choices[0]!.mode : undefined
}

/**
 * The ways a run's sign-off may bring its work in when they are narrowed: for
 * a group leg other legs build on, merge or squash only. `undefined` — every
 * way — for any other run, or while its group run is not loaded.
 */
export function processRunIntegrationModes(
  run: Pick<ProcessRun, 'groupLegId'>,
  group: Pick<ProcessGroupRun, 'legs'> | undefined,
): readonly ProcessIntegrationMode[] | undefined {
  return group && run.groupLegId
    ? processGroupLegIntegrationModes(group, run.groupLegId)
    : undefined
}

/** Whether answering the run's park with `choice` must also say how the work comes in. */
export function isIntegratingApproval(run: ProcessRun, choice: ProcessResumeChoice): boolean {
  const stepId = run.park?.stepId
  return choice === 'approve' && !!stepId && isProcessIntegrationRequired(run, stepId)
}

const MODE_DONE: Record<ProcessIntegrationMode, (baseRef: string) => string> = {
  merge: (baseRef) => `Merged into ${baseRef}`,
  squash: (baseRef) => `Merged into ${baseRef} as one commit`,
  'pull-request': () => 'Pull request opened',
}

const MODE_BUSY: Record<ProcessIntegrationMode, (branch: ProcessWorkBranch) => string> = {
  merge: (b) => `Merging into ${b.baseRef}…`,
  squash: (b) => `Squashing into ${b.baseRef}…`,
  'pull-request': (b) => `Pushing ${b.name} and opening a pull request…`,
}

const MODE_FAILED: Record<ProcessIntegrationMode, (baseRef: string) => string> = {
  merge: (baseRef) => `Not merged into ${baseRef}`,
  squash: (baseRef) => `Not merged into ${baseRef}`,
  'pull-request': () => 'Pull request not opened',
}

/**
 * What bringing a root run's approved work in came to: happening, landed (the
 * merged commit, or the pull request to open), or not landed — with the reason
 * and a retry. `undefined` for a run with nothing to bring in.
 */
export function processIntegrationView(run: ProcessRun): ProcessIntegrationView | undefined {
  const { workBranch, integration } = run
  if (!workBranch || run.parentRunId) return undefined
  if (workBranch.shadow) return shadowIntegrationView(run)
  if (!integration && (run.status === 'running' || run.status === 'parked')) {
    return conflictResolutionView(run)
  }
  if (!integration) {
    return isProcessRunAwaitingIntegration(run)
      ? {
          tone: 'on_hold',
          title: PROCESS_INTEGRATION_NEVER_TRIED_TITLE,
          detail: PROCESS_INTEGRATION_NEVER_TRIED,
          canRetry: true,
          busy: false,
        }
      : undefined
  }
  const sha = integration.sha
  const checks = integration.checks ? { checks: integration.checks } : {}
  if (integration.status === 'integrating') {
    return {
      tone: 'working',
      title: MODE_BUSY[integration.mode](workBranch),
      ...(integration.landing?.checkMerge
        ? { detail: PROCESS_INTEGRATION_CHECK_MERGE.busy(workBranch.baseRef) }
        : {}),
      canRetry: false,
      busy: true,
    }
  }
  if (integration.status === 'failed') {
    return {
      tone: 'stuck',
      title: MODE_FAILED[integration.mode](workBranch.baseRef),
      ...(integration.error ? { detail: integration.error } : {}),
      ...checks,
      ...(integration.conflict
        ? {
            conflict: {
              baseRef: integration.conflict.baseRef,
              paths: integration.conflict.paths,
            },
          }
        : {}),
      ...(integration.pullRequestUrl
        ? { link: { url: integration.pullRequestUrl, label: PROCESS_INTEGRATION_PR_LINK } }
        : {}),
      canRetry: true,
      busy: false,
    }
  }
  if (integration.status === 'already-landed') {
    const landedBy = integration.landedBy ?? (sha ? { commit: sha } : undefined)
    return {
      tone: 'done',
      title: landedBy
        ? processAlreadyLandedText(workBranch.baseRef, landedBy)
        : MODE_DONE[integration.mode](workBranch.baseRef),
      ...(landedBy ? { sha: landedBy.commit } : {}),
      canRetry: false,
      busy: false,
    }
  }
  if (integration.mode !== 'pull-request') {
    return {
      tone: 'done',
      title: MODE_DONE[integration.mode](workBranch.baseRef),
      ...(sha ? { sha } : {}),
      ...checks,
      canRetry: false,
      busy: false,
    }
  }
  const branch = integration.branch ?? workBranch.name
  if (integration.pullRequestUrl) {
    return {
      tone: 'done',
      title: MODE_DONE['pull-request'](workBranch.baseRef),
      detail: `${branch} → ${workBranch.baseRef}. Nothing reaches ${workBranch.baseRef} until it is merged there.`,
      link: { url: integration.pullRequestUrl, label: PROCESS_INTEGRATION_PR_LINK },
      ...(sha ? { sha } : {}),
      canRetry: false,
      busy: false,
    }
  }
  return {
    tone: 'done',
    title: `Pushed ${branch}`,
    detail: integration.compareUrl
      ? `Open a pull request for it into ${workBranch.baseRef} on the host.`
      : `Open a pull request for it into ${workBranch.baseRef} on your git host.`,
    ...(integration.compareUrl
      ? { link: { url: integration.compareUrl, label: PROCESS_INTEGRATION_COMPARE_LINK } }
      : {}),
    ...(sha ? { sha } : {}),
    canRetry: false,
    busy: false,
  }
}

/**
 * A run sent to resolve a conflict on landing: an agent resolving it while the
 * run works, or — waiting at the gate that confirms the landing — what changed:
 * the merge commit, the files, the checks. A park on the way says for itself
 * what it needs.
 */
function conflictResolutionView(run: ProcessRun): ProcessIntegrationView | undefined {
  const resolution = processIntegrationConflictResolution(run)
  if (!resolution) return undefined
  const { baseRef, paths } = resolution.conflict
  if (run.status === 'running') {
    return {
      tone: 'running',
      title: PROCESS_INTEGRATION_CONFLICT.resolving(baseRef),
      detail: PROCESS_INTEGRATION_CONFLICT.resolvingDetail(baseRef),
      files: paths,
      canRetry: false,
      busy: true,
    }
  }
  if (run.park?.reason !== 'gate' || run.park.stepId !== resolution.gateStepId) return undefined
  const sha = resolution.checks?.checkedSha ?? resolution.mergeSha
  return {
    tone: 'review',
    title: PROCESS_INTEGRATION_CONFLICT.resolved(baseRef),
    detail: PROCESS_INTEGRATION_CONFLICT.resolvedDetail(baseRef, resolution.checks?.summary),
    ...(sha ? { sha } : {}),
    files: paths,
    canRetry: false,
    busy: false,
  }
}

/** {@link processIntegrationView} for a project with no git of its own — no git words, no sha. */
function shadowIntegrationView(run: ProcessRun): ProcessIntegrationView | undefined {
  const { integration } = run
  if (!integration) {
    return isProcessRunAwaitingIntegration(run)
      ? {
          tone: 'on_hold',
          title: PROCESS_INTEGRATION_SHADOW.neverTriedTitle,
          detail: PROCESS_INTEGRATION_SHADOW.neverTried,
          canRetry: true,
          busy: false,
        }
      : undefined
  }
  if (integration.status === 'integrating') {
    return { tone: 'working', title: PROCESS_INTEGRATION_SHADOW.busy, canRetry: false, busy: true }
  }
  if (integration.status === 'failed') {
    return {
      tone: 'stuck',
      title: PROCESS_INTEGRATION_SHADOW.failed,
      ...(integration.error ? { detail: integration.error } : {}),
      canRetry: true,
      busy: false,
    }
  }
  return {
    tone: 'done',
    title:
      integration.status === 'already-landed'
        ? PROCESS_INTEGRATION_SHADOW.alreadyIn
        : PROCESS_INTEGRATION_SHADOW.done,
    canRetry: false,
    busy: false,
  }
}

/**
 * The run badge while approved work is being merged ("Merging"), or after it
 * was not ("Not merged") — said without git words for a project with no git of
 * its own.
 */
export function processIntegrationBadge(
  run: ProcessRun,
): { label: string; tone: ProcessStatusTone } | undefined {
  if (run.integration?.status === 'integrating') {
    return {
      label: run.workBranch?.shadow
        ? PROCESS_INTEGRATION_SHADOW.integratingBadge
        : PROCESS_INTEGRATION_BADGE.integrating,
      tone: 'working',
    }
  }
  if (!isProcessRunAwaitingIntegration(run)) return undefined
  return {
    label: run.workBranch?.shadow
      ? PROCESS_INTEGRATION_SHADOW.awaitingBadge
      : PROCESS_INTEGRATION_BADGE.awaiting,
    tone: 'on_hold',
  }
}
