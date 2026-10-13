/**
 * How many projects' data each per-project cache keeps — room for every project
 * of a large workspace (twenty and more), so moving between them never falls
 * back to a spinner for one pushed out.
 */
export const PROJECT_RESOURCE_CACHE_CAPACITY = 32

/** How many projects a surface reads ahead when it cannot tell which one is next (an opened drawer). */
export const PROJECT_PREFETCH_LIMIT = 4
