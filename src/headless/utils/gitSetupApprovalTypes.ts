/** What the user can set before approving `setupProjectGitRepo`. */
export type GitSetupForm = {
  repoName: string
  private: boolean
  description: string
  /** A GitHub organisation; empty for the git credential's own account. */
  owner: string
}

/** What approving will do, in plain words. */
export type GitSetupPlan = {
  headline: string
  lines: string[]
  /** Whether a new GitHub repository is created — false when the project already has a remote. */
  createsRepo: boolean
  /** `owner/name` of the repository it creates. */
  target?: string
}

/** A line under a tool row marking where its work stands — waiting on you, or what it did. */
export type ToolRowMilestone = {
  tone: 'waiting' | 'success' | 'warning' | 'error' | 'neutral'
  title: string
  detail?: string
  link?: { url: string; label: string }
}
