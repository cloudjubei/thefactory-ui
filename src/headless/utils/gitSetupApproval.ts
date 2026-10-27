import {
  GITHUB_OWNER_PATTERN,
  GITHUB_REPO_NAME_PATTERN,
  GIT_SETUP_COPY,
  GIT_SETUP_TOOL_NAME,
} from './gitSetupApprovalConstants'
import { GIT_CHANGE_TOOL_NAMES } from './gitChangeApprovalConstants'
import { gitChangeMilestone } from './gitChangeApproval'
import { activityStopMilestone } from './activityStopApproval'
import { STOP_ACTIVITY_TOOL_NAME } from './activityStopApprovalConstants'
import { featureQuestionAnswerMilestone } from './featureQuestionAnswerRow'
import { FEATURE_QUESTION_TOOL } from './toolAskCardConstants'
import type { GitSetupForm, GitSetupPlan, ToolRowMilestone } from './gitSetupApprovalTypes'

type GrantLike = { toolName?: string; args?: unknown; detail?: unknown }

const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}

/** Whether an approval is for `setupProjectGitRepo` — named by the grant or by its payload. */
export function isGitSetupGrant(grant: GrantLike): boolean {
  return grant.toolName === GIT_SETUP_TOOL_NAME || record(grant.detail).tool === GIT_SETUP_TOOL_NAME
}

/** The arguments the agent asked with. */
export function gitSetupArgs(grant: GrantLike): Record<string, unknown> {
  return grant.args !== undefined ? record(grant.args) : record(record(grant.detail).args)
}

/** The form as the agent asked for it; a repository named after the project, private, otherwise. */
export function gitSetupFormFor(grant: GrantLike, projectId: string): GitSetupForm {
  const args = gitSetupArgs(grant)
  const text = (key: string) => (typeof args[key] === 'string' ? (args[key] as string) : '')
  return {
    repoName: text('repoName') || projectId,
    private: args.private !== false,
    description: text('description'),
    owner: text('owner'),
  }
}

/** Why GitHub would refuse the form, or `undefined` when it would not. */
export function gitSetupFormProblem(form: GitSetupForm): string | undefined {
  const name = form.repoName.trim()
  if (!name || name === '.' || name === '..') return 'The repository needs a name.'
  if (!GITHUB_REPO_NAME_PATTERN.test(name)) {
    return 'A repository name can only use letters, digits, ".", "-" and "_".'
  }
  const owner = form.owner.trim()
  if (owner && !GITHUB_OWNER_PATTERN.test(owner)) {
    return 'An owner is a GitHub account or organisation name: letters, digits and "-".'
  }
  return undefined
}

/** The decision's metadata: only the fields the user changed, or nothing when they changed none. */
export function gitSetupDecisionMetadata(
  form: GitSetupForm,
  args: Record<string, unknown>,
  projectId: string,
): { args: Record<string, unknown> } | undefined {
  const asked = gitSetupFormFor({ args }, projectId)
  const changed: Record<string, unknown> = {}
  if (form.repoName.trim() !== asked.repoName) changed.repoName = form.repoName.trim()
  if (form.private !== asked.private) changed.private = form.private
  if (form.description.trim() !== asked.description) changed.description = form.description.trim()
  if (form.owner.trim() !== asked.owner) changed.owner = form.owner.trim()
  return Object.keys(changed).length > 0 ? { args: changed } : undefined
}

/** What approving will do, given the account the repository goes under and any remote it has. */
export function gitSetupPlan(
  form: GitSetupForm,
  ctx: { projectTitle?: string; account?: string; existingRemote?: string },
): GitSetupPlan {
  const project = ctx.projectTitle ?? 'this project'
  if (ctx.existingRemote) {
    return {
      headline: `Push ${project} to its repository`,
      lines: [
        `It already has a repository: ${ctx.existingRemote}. No new one is created.`,
        'Commits that are not there yet are pushed to it.',
      ],
      createsRepo: false,
    }
  }
  const target = `${form.owner.trim() || ctx.account || GIT_SETUP_COPY.yourAccount}/${form.repoName.trim()}`
  return {
    headline: `Put ${project} on GitHub`,
    lines: [
      `Creates the ${form.private ? 'private' : 'PUBLIC'} repository ${target}.`,
      'Puts the project folder under git first if it is not, with one commit of everything .gitignore does not leave out.',
      'Pushes it there and records the repository as the project’s remote.',
    ],
    createsRepo: true,
    target,
  }
}

function reportOf(result: unknown): Record<string, unknown> | undefined {
  if (typeof result === 'string') {
    try {
      return reportOf(JSON.parse(result))
    } catch {
      return undefined
    }
  }
  return result && typeof result === 'object' ? (result as Record<string, unknown>) : undefined
}

/**
 * Where a `setupProjectGitRepo` row stands: waiting on the user, or what it did —
 * the repository it created (the moment it exists), what it pushed, or why not.
 */
export function gitSetupMilestone(
  result: unknown,
  resultType: string | undefined,
  awaitingDecision: boolean,
): ToolRowMilestone | undefined {
  if (awaitingDecision) return { tone: 'waiting', title: GIT_SETUP_COPY.waiting }
  if (resultType !== 'success') return undefined
  const report = reportOf(result)
  if (!report) return undefined
  if (typeof report.error === 'string') {
    return { tone: 'error', title: GIT_SETUP_COPY.failed, detail: report.error }
  }
  if (report.needsCredentials === true)
    return { tone: 'warning', title: GIT_SETUP_COPY.needsCredential }
  const branch = typeof report.pushedBranch === 'string' ? report.pushedBranch : undefined
  const created = record(report.createdRepo)
  if (typeof created.fullName === 'string') {
    const htmlUrl = typeof report.htmlUrl === 'string' ? report.htmlUrl : undefined
    return {
      tone: 'success',
      title: `Repository created: ${created.fullName}`,
      detail: [
        created.private === false ? 'Public' : 'Private',
        branch ? `${branch} pushed` : undefined,
      ]
        .filter(Boolean)
        .join(' · '),
      ...(htmlUrl ? { link: { url: htmlUrl, label: GIT_SETUP_COPY.openOnGitHub } } : {}),
    }
  }
  if (branch) {
    const to = typeof report.repoUrl === 'string' ? report.repoUrl : 'origin'
    return { tone: 'success', title: `Pushed ${branch} to ${to}` }
  }
  return { tone: 'success', title: GIT_SETUP_COPY.nothingToDo }
}

const MILESTONES: Record<
  string,
  (
    result: unknown,
    resultType: string | undefined,
    awaitingDecision: boolean,
    execution?: unknown,
  ) => ToolRowMilestone | undefined
> = {
  [GIT_SETUP_TOOL_NAME]: gitSetupMilestone,
  ...Object.fromEntries(GIT_CHANGE_TOOL_NAMES.map((name) => [name, gitChangeMilestone])),
  [STOP_ACTIVITY_TOOL_NAME]: activityStopMilestone,
  [FEATURE_QUESTION_TOOL]: featureQuestionAnswerMilestone,
}

/**
 * The milestone line a tool row shows, for the tools that have one. `execution` is what the
 * call's action recorded carrying it out, for the lines that read it.
 */
export function toolRowMilestone(
  toolName: string | undefined,
  result: unknown,
  resultType: string | undefined,
  awaitingDecision: boolean,
  execution?: unknown,
): ToolRowMilestone | undefined {
  const milestone = toolName ? MILESTONES[toolName] : undefined
  return milestone?.(result, resultType, awaitingDecision, execution)
}

/**
 * A call that ran but whose milestone says it did not do what it was asked — a stop refused, a
 * setup that failed: its row's icon warns instead of showing a success tick. Pure.
 */
export function toolRowFellShort(
  resultType: string | undefined,
  milestone: ToolRowMilestone | undefined,
): boolean {
  return resultType === 'success' && (milestone?.tone === 'warning' || milestone?.tone === 'error')
}
