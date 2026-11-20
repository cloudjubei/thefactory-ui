import { REVIEW_MERGE_CHECKS_TEXT as TEXT } from './reviewMergeChecksConstants'
import type {
  ReviewCheckRequirement,
  ReviewMergeChecks,
  ReviewMergeChecksSnapshot,
  ReviewMergeChecksView,
} from './reviewMergeChecksTypes'

const same = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase()

const concerns = (change: ReviewCheckRequirement, repository: string, name: string): boolean =>
  same(change.repository, repository) && same(change.check, name)

/** The group's merge checks with the person's changes on their way laid over them, in order. Pure. */
export function reviewMergeChecksShown(
  checks: ReviewMergeChecks | undefined,
  changes: readonly ReviewCheckRequirement[],
): ReviewMergeChecks | undefined {
  if (!checks || changes.length === 0) return checks
  return {
    repositories: checks.repositories.map((repo) => {
      if (!changes.some((change) => same(change.repository, repo.repository))) return repo
      return {
        ...repo,
        checks: repo.checks.map((check) => {
          const last = changes
            .filter((change) => concerns(change, repo.repository, check.name))
            .at(-1)
          return last ? { ...check, required: last.required } : check
        }),
      }
    }),
  }
}

/** The change would alter what the group's merges wait for, as shown: anything else need not be sent. Pure. */
export function reviewCheckChangeNeeded(
  shown: ReviewMergeChecks | undefined,
  change: ReviewCheckRequirement,
): boolean {
  const held = shown?.repositories
    .find((repo) => same(repo.repository, change.repository))
    ?.checks.find((check) => same(check.name, change.check))
  return (held?.required ?? true) !== change.required
}

/** The checks the group's merges wait for, as Settings shows them, the person's changes included. Pure. */
export function reviewMergeChecksView(snapshot: ReviewMergeChecksSnapshot): ReviewMergeChecksView {
  const { checks, readError, changes, actionError } = snapshot
  const shown = reviewMergeChecksShown(checks, changes)
  const repositories = (shown?.repositories ?? []).map((repo) => ({
    repository: repo.repository,
    checks: repo.checks.map((check) => ({
      repository: repo.repository,
      name: check.name,
      required: check.required,
      saving: changes.some((change) => concerns(change, repo.repository, check.name)),
    })),
    ...(repo.error ? { error: TEXT.notRead(repo.error) } : {}),
  }))
  return {
    loading: checks === undefined && readError === undefined,
    repositories,
    empty: checks !== undefined && repositories.length === 0,
    ...(readError ? { readError } : {}),
    ...(actionError ? { actionError } : {}),
  }
}
