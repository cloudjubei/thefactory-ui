/** The fewest characters of a sha a `?commit=` link may use — git's own short-sha floor. */
export const GIT_COMMIT_LINK_MIN_LENGTH = 7

/**
 * How far into the history the Git view pages looking for a linked commit
 * before it says the commit is not in the part it loaded.
 */
export const GIT_COMMIT_LINK_MAX_COMMITS = 3000

export const GIT_COMMIT_LINK_TEXT = {
  tooShort: (link: string) =>
    `A commit link needs at least ${GIT_COMMIT_LINK_MIN_LENGTH} characters of the sha; '${link}' is too short.`,
  ambiguous: (link: string, matches: number) =>
    `'${link}' matches ${matches} commits. Use more characters of the sha.`,
  notInHistory: (link: string) => `No commit in this project's history matches '${link}'.`,
  beyondSearched: (link: string, searched: number) =>
    `'${link}' isn't among the latest ${searched.toLocaleString('en-US')} commits, so it isn't highlighted in the graph.`,
} as const
