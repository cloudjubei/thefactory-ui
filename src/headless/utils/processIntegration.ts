import type {
  ProcessIntegrationMode,
  ProcessResumeChoice,
  ProcessRun,
  ProcessWorkBranch,
} from 'thefactory-tools/types'
import {
  isProcessIntegrationRequired,
  isProcessRunAwaitingIntegration,
} from 'thefactory-tools/utils'
import {
  PROCESS_INTEGRATION_BADGE,
  PROCESS_INTEGRATION_COMPARE_LINK,
  PROCESS_INTEGRATION_NEVER_TRIED,
  PROCESS_INTEGRATION_PR_LINK,
} from './processIntegrationConstants'
import type { ProcessIntegrationChoice, ProcessIntegrationView } from './processIntegrationTypes'
import type { ProcessStatusTone } from './processView'

/**
 * The three ways Approve can bring a story's work in, each with the one line a
 * person reads before choosing — naming the branches it touches.
 */
export function processIntegrationChoices(
  workBranch: Pick<ProcessWorkBranch, 'name' | 'baseRef'>,
): ProcessIntegrationChoice[] {
  const { name, baseRef } = workBranch
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
      detail: `Pushes ${name} and opens a PR for review on GitHub / Azure DevOps; nothing lands on ${baseRef} until it is merged there.`,
    },
  ]
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
  merge: (baseRef) => `Approved — not merged into ${baseRef}`,
  squash: (baseRef) => `Approved — not merged into ${baseRef}`,
  'pull-request': () => 'Approved — the pull request was not opened',
}

const short = (sha: string | undefined) => (sha ? sha.slice(0, 7) : undefined)

/**
 * What bringing a root run's approved work in came to: happening, landed (the
 * merged commit, or the pull request to open), or not landed — with the reason
 * and a retry. `undefined` for a run with nothing to bring in.
 */
export function processIntegrationView(run: ProcessRun): ProcessIntegrationView | undefined {
  const { workBranch, integration } = run
  if (!workBranch || run.parentRunId) return undefined
  if (!integration) {
    return isProcessRunAwaitingIntegration(run)
      ? {
          tone: 'on_hold',
          title: PROCESS_INTEGRATION_BADGE.awaiting,
          detail: PROCESS_INTEGRATION_NEVER_TRIED,
          canRetry: true,
          busy: false,
        }
      : undefined
  }
  const sha = short(integration.sha)
  if (integration.status === 'integrating') {
    return {
      tone: 'working',
      title: MODE_BUSY[integration.mode](workBranch),
      canRetry: false,
      busy: true,
    }
  }
  if (integration.status === 'failed') {
    return {
      tone: 'stuck',
      title: MODE_FAILED[integration.mode](workBranch.baseRef),
      ...(integration.error ? { detail: integration.error } : {}),
      ...(integration.pullRequestUrl
        ? { link: { url: integration.pullRequestUrl, label: PROCESS_INTEGRATION_PR_LINK } }
        : {}),
      canRetry: true,
      busy: false,
    }
  }
  if (integration.mode !== 'pull-request') {
    return {
      tone: 'done',
      title: MODE_DONE[integration.mode](workBranch.baseRef),
      ...(sha ? { sha } : {}),
      canRetry: false,
      busy: false,
    }
  }
  const branch = integration.branch ?? workBranch.name
  if (integration.pullRequestUrl) {
    return {
      tone: 'done',
      title: MODE_DONE['pull-request'](workBranch.baseRef),
      detail: `${branch} → ${workBranch.baseRef}. Nothing lands on ${workBranch.baseRef} until it is merged there.`,
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

/** The run badge while approved work is being brought in, or has not landed. */
export function processIntegrationBadge(
  run: ProcessRun,
): { label: string; tone: ProcessStatusTone } | undefined {
  if (run.integration?.status === 'integrating') {
    return { label: PROCESS_INTEGRATION_BADGE.integrating, tone: 'working' }
  }
  return isProcessRunAwaitingIntegration(run)
    ? { label: PROCESS_INTEGRATION_BADGE.awaiting, tone: 'on_hold' }
    : undefined
}
