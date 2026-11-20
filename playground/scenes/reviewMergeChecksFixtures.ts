import type {
  ReviewCheckRequirement,
  ReviewMergeChecks,
  ReviewMergeChecksSnapshot,
} from 'thefactory-ui/headless'

/** Two repositories' checks as seen on the group's recent pull requests; the web end-to-end check is not required. */
export const MERGE_CHECKS: ReviewMergeChecks = {
  repositories: [
    {
      repository: 'acme/coach-be',
      checks: [
        { name: 'build', required: true },
        { name: 'lint', required: true },
        { name: 'test', required: true },
      ],
    },
    {
      repository: 'acme/coach-web',
      checks: [
        { name: 'build', required: true },
        { name: 'e2e (playwright)', required: false },
        { name: 'lint', required: true },
        { name: 'visual', required: true },
      ],
    },
  ],
}

/** The same, one repository's pull requests not readable. */
export const MERGE_CHECKS_NOT_READ: ReviewMergeChecks = {
  repositories: [
    MERGE_CHECKS.repositories[0]!,
    {
      repository: 'acme/coach-web',
      checks: [],
      error: 'GitHub answered 404 for acme/coach-web#112: Not Found',
    },
  ],
}

/** The person just unticked the web's visual check; its save is on its way. */
export const UNTICK_VISUAL: ReviewCheckRequirement = {
  repository: 'acme/coach-web',
  check: 'visual',
  required: false,
}

/** The merge checks as the store holds them. */
export function mergeChecksSnapshot(
  over: Partial<ReviewMergeChecksSnapshot> = {},
): ReviewMergeChecksSnapshot {
  return {
    checks: MERGE_CHECKS,
    readError: undefined,
    changes: [],
    actionError: undefined,
    ...over,
  }
}

/** Each state of the merge checks the showcase draws. */
export const MERGE_CHECKS_STATES: Record<string, ReviewMergeChecksSnapshot> = {
  mixed: mergeChecksSnapshot(),
  saving: mergeChecksSnapshot({ changes: [UNTICK_VISUAL] }),
  loading: mergeChecksSnapshot({ checks: undefined }),
  none: mergeChecksSnapshot({ checks: { repositories: [] } }),
  'not-read': mergeChecksSnapshot({ checks: MERGE_CHECKS_NOT_READ }),
  'read-failed': mergeChecksSnapshot({ checks: undefined, readError: 'Network Error' }),
  refused: mergeChecksSnapshot({ actionError: 'The check could not be saved' }),
}
