import { REVIEW_COMMITS_TEXT as TEXT } from './reviewCommitsConstants'
import type { ReviewCommits, ReviewCommitsState, ReviewCommitsView } from './reviewCommitsTypes'

/**
 * What a ticket's pull requests did since its review's last round, in one
 * line: history rewritten on any of them, else the commits pushed since, else
 * that nothing was pushed. Nothing while no round reviewed a head, or no pull
 * request could be read. Pure.
 */
export function reviewCommitsView(
  commits: ReviewCommits | undefined,
): ReviewCommitsView | undefined {
  const read = (commits?.pullRequests ?? []).filter((pr) => pr.state !== 'unread')
  if (read.length === 0) return undefined
  if (read.some((pr) => pr.state === 'rewritten')) return { label: TEXT.rewritten, tone: 'warn' }
  const total = read.reduce((sum, pr) => sum + (pr.state === 'new-commits' ? pr.commits : 0), 0)
  return total > 0
    ? { label: TEXT.newCommits(total), tone: 'news' }
    : { label: TEXT.none, tone: 'quiet' }
}

/** The commits a state holds once read; nothing while it reads or failed. Pure. */
export function reviewCommitsOfState(state: ReviewCommitsState): ReviewCommits | undefined {
  return state.kind === 'ready' ? state.commits : undefined
}
