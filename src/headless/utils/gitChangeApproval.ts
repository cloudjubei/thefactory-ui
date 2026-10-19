import { processRunWorksOnBranchNow } from 'thefactory-tools/utils'
import type { ProcessRun } from 'thefactory-tools/types'
import {
  CHANGE_STATUS_LETTERS,
  COMMIT_RECEIPT_COPY,
  COMMIT_TOOL_NAME,
  GIT_CHANGE_COPY,
  GIT_CHANGE_DONE,
  GIT_CHANGE_RUN_BUSY,
  GIT_CHANGE_TOOL_NAMES,
} from './gitChangeApprovalConstants'
import type {
  CommitReceiptFile,
  CommitReceiptView,
  GitChangeCardView,
  GitChangeFileView,
} from './gitChangeApprovalTypes'
import { SHORT_SHA_LENGTH } from './runReviewConstants'
import type { ToolRowMilestone } from './gitSetupApprovalTypes'

type GrantLike = { toolName?: string; args?: unknown; detail?: unknown }

const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}

/** The tool an approval is for — named by the grant or by its payload. Pure. */
function grantTool(grant: GrantLike): string | undefined {
  const tool = grant.toolName ?? record(grant.detail).tool
  return typeof tool === 'string' ? tool : undefined
}

/** Whether an approval is for one of the host's git change tools. Pure. */
export function isGitChangeGrant(grant: GrantLike): boolean {
  const tool = grantTool(grant)
  return tool !== undefined && GIT_CHANGE_TOOL_NAMES.includes(tool)
}

/** The arguments the agent asked with. Pure. */
export function gitChangeArgs(grant: GrantLike): Record<string, unknown> {
  return grant.args !== undefined ? record(grant.args) : record(record(grant.detail).args)
}

/**
 * The card the host read for the ask, or `undefined` when it carried none — a
 * git change is never approved from the agent's arguments alone. Pure.
 */
export function gitChangeCard(grant: GrantLike): GitChangeCardView | undefined {
  const card = record(record(grant.detail).detail)
  if (typeof card.repoPath !== 'string' || typeof card.headline !== 'string') return undefined
  if (typeof card.warning !== 'string' || typeof card.operation !== 'string') return undefined
  return { ...card, facts: Array.isArray(card.facts) ? card.facts : [] } as GitChangeCardView
}

/** The values the card's edits start with: those the host read the card with. Pure. */
export function gitChangeEditValues(card: GitChangeCardView): Record<string, string> {
  return Object.fromEntries((card.edits ?? []).map((edit) => [edit.arg, edit.value]))
}

/** Why the card cannot be approved as it stands, or `undefined`. Pure. */
export function gitChangeProblem(
  card: GitChangeCardView,
  values: Record<string, string>,
  run: Pick<ProcessRun, 'status' | 'park'> | undefined,
): string | undefined {
  if (run && card.run && card.branch && processRunWorksOnBranchNow(run)) {
    return GIT_CHANGE_RUN_BUSY(card.run.title, card.branch)
  }
  const empty = (card.edits ?? []).find(
    (edit) => edit.required === true && (values[edit.arg] ?? '').trim().length === 0,
  )
  return empty ? GIT_CHANGE_COPY.editEmpty(empty.label) : undefined
}

/** The decision's metadata: the edits the person changed, and only those. Pure. */
export function gitChangeDecisionMetadata(
  card: GitChangeCardView,
  values: Record<string, string>,
): { args: Record<string, string | boolean> } | undefined {
  const start = gitChangeEditValues(card)
  const changed = Object.fromEntries(
    (card.edits ?? [])
      .filter((edit) => (values[edit.arg] ?? '').trim() !== (start[edit.arg] ?? '').trim())
      .map((edit) => {
        const next = (values[edit.arg] ?? '').trim()
        return [edit.arg, edit.kind === 'toggle' ? next === 'true' : next] as const
      }),
  )
  return Object.keys(changed).length > 0 ? { args: changed } : undefined
}

function resultOf(result: unknown): Record<string, unknown> | undefined {
  if (typeof result === 'string') {
    try {
      return resultOf(JSON.parse(result))
    } catch {
      return undefined
    }
  }
  return result && typeof result === 'object' ? (result as Record<string, unknown>) : undefined
}

/**
 * Where a git change's row stands: waiting on the person, or what it did — the
 * commit read back from the repository, or why nothing changed. Pure.
 */
export function gitChangeMilestone(
  result: unknown,
  resultType: string | undefined,
  awaitingDecision: boolean,
): ToolRowMilestone | undefined {
  if (awaitingDecision) return { tone: 'waiting', title: GIT_CHANGE_COPY.waiting }
  if (resultType !== 'success') return undefined
  const out = resultOf(result)
  if (!out) return undefined
  const error = typeof out.error === 'string' ? out.error : undefined
  if (error || out.ok === false) {
    return { tone: 'error', title: GIT_CHANGE_COPY.failed, ...(error ? { detail: error } : {}) }
  }
  const sha = typeof out.sha === 'string' ? out.sha.slice(0, 8) : undefined
  const branch = typeof out.branch === 'string' ? out.branch : undefined
  const verb =
    out.operation === 'resolve-conflicts' && out.committed === true
      ? GIT_CHANGE_COPY.mergeCommitted
      : (GIT_CHANGE_DONE[typeof out.operation === 'string' ? out.operation : ''] ?? 'Done')
  const link =
    typeof out.pullRequestUrl === 'string'
      ? { url: out.pullRequestUrl, label: GIT_CHANGE_COPY.pullRequest }
      : typeof out.compareUrl === 'string'
        ? { url: out.compareUrl, label: GIT_CHANGE_COPY.pullRequestPage }
        : undefined
  return {
    tone: 'success',
    title: [verb, sha, branch ? `on ${branch}` : undefined].filter(Boolean).join(' '),
    ...(typeof out.repoPath === 'string' ? { detail: out.repoPath } : {}),
    ...(link ? { link } : {}),
  }
}

/** A commit's files, each with its status as one letter. Pure. */
export function commitReceiptFiles(files: readonly GitChangeFileView[]): CommitReceiptFile[] {
  return files.map((file) => ({
    path: file.path,
    status: file.status,
    ...(file.binary ? { binary: true } : {}),
    letter: CHANGE_STATUS_LETTERS[file.status],
  }))
}

/** A commit's result as the host returned it, when the commit was made. */
function madeCommit(result: unknown): { sha: string; out: Record<string, unknown> } | undefined {
  const out = resultOf(result)
  if (!out || out.ok !== true || typeof out.error === 'string') return undefined
  return typeof out.sha === 'string' && out.sha.length > 0 ? { sha: out.sha, out } : undefined
}

/**
 * The receipt a successful commit leaves in the chat in place of its tool row:
 * the commit, the branch it went to, and the files the person approved — from
 * the card they approved it on, since the commit's result names none. `undefined`
 * for any other tool, a commit not yet made, or one that failed. Pure.
 */
export function commitReceiptView(
  toolName: string | undefined,
  result: unknown,
  resultType: string | undefined,
  files: readonly GitChangeFileView[] | undefined,
): CommitReceiptView | undefined {
  if (toolName !== COMMIT_TOOL_NAME || resultType !== 'success') return undefined
  const made = madeCommit(result)
  if (!made) return undefined
  const { out } = made
  const message = typeof out.message === 'string' && out.message.trim() ? out.message : undefined
  return {
    sha: made.sha.slice(0, SHORT_SHA_LENGTH),
    fullSha: made.sha,
    branch: typeof out.branch === 'string' ? out.branch : undefined,
    ...(files ? { filesLabel: COMMIT_RECEIPT_COPY.files(files.length) } : {}),
    files: commitReceiptFiles(files ?? []),
    message,
  }
}

/**
 * Every commit the chat's approved commit asks made — what a turn's changes
 * already on their base are matched against, so the receipt alone says so.
 * Pure.
 */
export function commitReceiptShas(
  asks: readonly { toolName?: string; execution?: { ok: boolean; result: string } }[],
): string[] {
  return asks.flatMap((ask) => {
    if (ask.toolName !== COMMIT_TOOL_NAME || !ask.execution?.ok) return []
    const made = madeCommit(ask.execution.result)
    return made ? [made.sha] : []
  })
}
