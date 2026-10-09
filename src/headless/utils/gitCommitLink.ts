import {
  GIT_COMMIT_LINK_MAX_COMMITS,
  GIT_COMMIT_LINK_MIN_LENGTH,
  GIT_COMMIT_LINK_TEXT,
} from './gitCommitLinkConstants'
import type { GitCommitLinkResolution } from './gitCommitLinkTypes'

/**
 * Resolve a Git view `?commit=` link against the loaded log: a full sha or a
 * unique prefix of at least {@link GIT_COMMIT_LINK_MIN_LENGTH} characters
 * resolves to the full sha; otherwise the caller pages further while
 * `searching`, up to `maxCommits`.
 */
export function resolveCommitLink(input: {
  link: string | undefined
  log: readonly { hash: string }[]
  hasMore: boolean
  maxCommits?: number
}): GitCommitLinkResolution {
  const link = input.link?.trim()
  if (!link || link === 'UNCOMMITTED') return { state: 'none' }
  if (link.length < GIT_COMMIT_LINK_MIN_LENGTH) return { state: 'too-short', link }
  const prefix = link.toLowerCase()
  const matches = input.log.filter((c) => c.hash.toLowerCase().startsWith(prefix))
  if (matches.length === 1) return { state: 'found', sha: matches[0]!.hash }
  if (matches.length > 1) return { state: 'ambiguous', link, matches: matches.length }
  const maxCommits = input.maxCommits ?? GIT_COMMIT_LINK_MAX_COMMITS
  if (input.hasMore && input.log.length < maxCommits) return { state: 'searching', link }
  return { state: 'not-found', link, searched: input.log.length, exhausted: !input.hasMore }
}

/** What the Git view says about a link that did not resolve; nothing while it resolves or once it has. */
export function commitLinkNotice(resolution: GitCommitLinkResolution): string | undefined {
  switch (resolution.state) {
    case 'too-short':
      return GIT_COMMIT_LINK_TEXT.tooShort(resolution.link)
    case 'ambiguous':
      return GIT_COMMIT_LINK_TEXT.ambiguous(resolution.link, resolution.matches)
    case 'not-found':
      return resolution.exhausted
        ? GIT_COMMIT_LINK_TEXT.notInHistory(resolution.link)
        : GIT_COMMIT_LINK_TEXT.beyondSearched(resolution.link, resolution.searched)
    default:
      return undefined
  }
}
