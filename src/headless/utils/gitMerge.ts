import type { MergeChecks } from 'thefactory-tools/types'
import { mergeChecksDefault } from 'thefactory-tools/utils'
import type { GitMergeBranchResult, GitMergeInProgress, GitUnifiedBranch } from '../api'
import { checkMethodRows, ranCheckMethods } from './checkMethods'
import { GIT_DEFAULT_REMOTE, GIT_MERGE_TEXT } from './gitMergeConstants'
import type {
  GitBranchMenuInput,
  GitBranchMenuItem,
  GitBranchSection,
  GitMergeChecksView,
  GitMergeOutcomeLine,
  GitMergeSourceOption,
} from './gitMergeTypes'

function files(count: number): string {
  return `${count} ${count === 1 ? 'file' : 'files'}`
}

/** What a merge of this branch row is given: the local name, or the remote-tracking one. */
export function mergeSourceRef(
  branch: Pick<GitUnifiedBranch, 'name' | 'remoteName'>,
  section: GitBranchSection,
): string {
  if (section === 'local') return branch.name
  return branch.remoteName ?? `${GIT_DEFAULT_REMOTE}/${branch.name}`
}

/**
 * The branches the "Merge…" sheet offers: local ones, then remote ones, those
 * matching `query`, the current branch disabled.
 */
export function mergeSourceOptions(
  branches: readonly GitUnifiedBranch[],
  current: string | undefined,
  query: string,
): GitMergeSourceOption[] {
  const needle = query.trim().toLowerCase()
  const options: GitMergeSourceOption[] = [
    ...branches
      .filter((b) => b.isLocal)
      .map((b): GitMergeSourceOption => ({ ref: mergeSourceRef(b, 'local'), kind: 'local' })),
    ...branches
      .filter((b) => b.isRemote)
      .map((b): GitMergeSourceOption => ({ ref: mergeSourceRef(b, 'remote'), kind: 'remote' })),
  ]
  return options
    .filter((o) => !needle || o.ref.toLowerCase().includes(needle))
    .map((o) =>
      o.kind === 'local' && o.ref === current
        ? { ...o, disabledReason: GIT_MERGE_TEXT.currentBranch }
        : o,
    )
}

/** Why `source` cannot be merged into `current` now; `undefined` when it can. */
export function mergeBlockedReason(input: {
  current: string | undefined
  merging: boolean
  source: string | undefined
}): string | undefined {
  if (!input.current) return GIT_MERGE_TEXT.detached
  if (input.merging) return GIT_MERGE_TEXT.inProgress
  if (!input.source) return GIT_MERGE_TEXT.pickSource
  if (input.source === input.current) return GIT_MERGE_TEXT.currentBranch
  return undefined
}

/** "Merge 'dev' into 'feature/x'" — the sheet's one-line statement of the merge. */
export function mergeSentence(source: string, into: string): string {
  return `Merge '${source}' into '${into}'`
}

/** A branch row's context menu: merge it into the current branch, plus what the Git view already does with a branch. */
export function branchMenuItems(input: GitBranchMenuInput): GitBranchMenuItem[] {
  const { branch, section, current, merging } = input
  const ref = mergeSourceRef(branch, section)
  const isCurrent = section === 'local' && !!branch.current
  const mergeReason = isCurrent
    ? GIT_MERGE_TEXT.currentBranch
    : mergeBlockedReason({ current, merging, source: ref })
  const items: GitBranchMenuItem[] = [
    {
      action: 'merge',
      label: current ? `Merge ${ref} into ${current}` : `Merge ${ref}`,
      ...(mergeReason ? { disabledReason: mergeReason } : {}),
    },
  ]
  if (isCurrent) return items
  if (section === 'local') {
    const checkoutReason = merging
      ? GIT_MERGE_TEXT.inProgress
      : input.isDirty
        ? GIT_MERGE_TEXT.dirtyCheckout
        : undefined
    items.push({
      action: 'checkout',
      label: `Check out ${branch.name}`,
      ...(checkoutReason ? { disabledReason: checkoutReason } : {}),
    })
  }
  if (input.canCreatePullRequest) {
    items.push({ action: 'pull-request', label: `Create pull request for ${branch.name}` })
  }
  items.push({ action: 'delete', label: `Delete ${branch.name}…`, destructive: true })
  return items
}

/** What the Git view says once a merge returns — and, under it, how its result's checks went. */
export function mergeOutcomeLine(outcome: GitMergeBranchResult): GitMergeOutcomeLine {
  const line = outcomeLine(outcome)
  return outcome.checks && line.tone !== 'error'
    ? { ...line, checksNote: outcome.checks.summary }
    : line
}

function outcomeLine(outcome: GitMergeBranchResult): GitMergeOutcomeLine {
  const into = outcome.into ?? ''
  switch (outcome.status) {
    case 'merged':
      return {
        tone: 'success',
        text: GIT_MERGE_TEXT.merged(outcome.source, into),
        ...(outcome.mergedSha ? { sha: outcome.mergedSha } : {}),
      }
    case 'fast-forward':
      return {
        tone: 'success',
        text: outcome.message,
        ...(outcome.mergedSha ? { sha: outcome.mergedSha } : {}),
      }
    case 'up-to-date':
      return { tone: 'info', text: outcome.message }
    case 'staged':
      return { tone: 'info', text: GIT_MERGE_TEXT.staged(outcome.source) }
    case 'conflicts':
      return {
        tone: 'warning',
        text: GIT_MERGE_TEXT.stopped(
          outcome.source,
          into,
          files(outcome.conflictedFiles?.length ?? 0),
        ),
      }
    default:
      return { tone: 'error', text: outcome.reason ?? outcome.message }
  }
}

/** "Merging dev into feature/x — 3 files in conflict" / "— ready to commit". */
export function mergeBannerTitle(merging: GitMergeInProgress, current: string | undefined): string {
  const what = [merging.source, current ? `into ${current}` : undefined].filter(Boolean).join(' ')
  const state =
    merging.conflictedFiles.length > 0
      ? `${files(merging.conflictedFiles.length)} in conflict`
      : 'ready to commit'
  return `Merging ${what} — ${state}`
}

/** "12 commits to bring in"; `capped` when the count stopped at the read's limit. */
export function commitsToBringInLabel(count: number, capped: boolean): string {
  if (count === 0) return 'Nothing to bring in'
  if (capped) return `${count}+ commits to bring in`
  return `${count} ${count === 1 ? 'commit' : 'commits'} to bring in`
}

/**
 * Whether the "Merge…" sheet starts with the result built and type-checked
 * first: for a merge committed right away into the repository's default branch.
 */
export function mergeChecksOnByDefault(
  branches: readonly Pick<GitUnifiedBranch, 'name' | 'current' | 'isDefault'>[],
  commit: boolean,
): boolean {
  return mergeChecksDefault({
    into: branches.find((b) => b.current)?.name,
    defaultBranch: branches.find((b) => b.isDefault)?.name,
    commit,
  })
}

/** A merge result's build and type check as chips, with what the failed ones printed. */
export function mergeChecksView(checks: MergeChecks): GitMergeChecksView {
  const chips = ranCheckMethods(
    checkMethodRows({
      verification: {
        status: checks.status === 'skipped' ? 'unchecked' : checks.status,
        checks: checks.checks,
        startedAt: 0,
        finishedAt: 0,
      },
      approaches: [],
      evidence: [],
    }),
  )
  const failingOutput = checks.checks
    .filter((c) => c.status === 'failed' || c.status === 'error')
    .map((c) => c.details?.trim())
    .filter((d): d is string => !!d)
    .join('\n\n')
  return {
    status: checks.status,
    summary: checks.summary,
    chips,
    ...(failingOutput ? { failingOutput } : {}),
  }
}
