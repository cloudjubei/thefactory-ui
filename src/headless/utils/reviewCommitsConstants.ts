export const REVIEW_COMMITS_TEXT = {
  newCommits: (n: number) => `${n} new ${n === 1 ? 'commit' : 'commits'}`,
  none: 'No new commits',
  rewritten: 'Rewritten since review',
} as const
