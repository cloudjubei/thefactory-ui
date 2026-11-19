/** Where one pull request stands against the head its review's last round reviewed. */
export type ReviewPullRequestCommitsState = 'new-commits' | 'no-commits' | 'rewritten' | 'unread'

/** One pull request's commits since the round reviewed its head. */
export interface ReviewPullRequestCommits {
  url: string
  /** "owner/repo #12". */
  name: string
  state: ReviewPullRequestCommitsState
  commits: number
}

/** A ticket's pull requests against the heads its review's last round reviewed, as the backend reads them. */
export interface ReviewCommits {
  ticketKey: string
  /** The round whose heads were compared; 0 while none recorded any. */
  round: number
  checkedAt: string
  pullRequests: ReviewPullRequestCommits[]
}

/** Where one ticket's commits since review stand in the app. */
export type ReviewCommitsState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; commits: ReviewCommits }
  | { kind: 'failed' }

/** What a view says of a ticket's commits since review: its line, and its tone. */
export interface ReviewCommitsView {
  /** "3 new commits", "No new commits", "Rewritten since review". */
  label: string
  /** `news` when something was pushed, `quiet` when nothing was, `warn` when history was rewritten. */
  tone: 'news' | 'quiet' | 'warn'
}
