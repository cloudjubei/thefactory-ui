import type { GitBundle, GitBundleRead } from './gitBundleTypes'

/**
 * The bundle read's query: a page of the log while a screen shows it, none
 * otherwise — a project switch reads status and branches (what badges show)
 * without the log. Pure.
 */
export function gitBundleQuery(
  logWanted: boolean,
  pageSize: number,
): { all: true; maxCount: number } {
  return { all: true, maxCount: logWanted ? pageSize : 0 }
}

/**
 * A project's git after a read: everything as read, and the log as read — or,
 * when the read left it out, the log read before. Pure.
 */
export function nextGitBundle(
  prev: GitBundle | undefined,
  read: GitBundleRead,
  pageSize: number,
): GitBundle {
  const { log, ...rest } = read
  if (log) return { ...rest, log, hasMoreLog: log.length >= pageSize, hasLog: true }
  return {
    ...rest,
    log: prev?.log ?? [],
    hasMoreLog: prev?.hasMoreLog ?? true,
    hasLog: prev?.hasLog ?? false,
  }
}

/** Whether what was read is enough to show: status and branches, and the log too while a screen shows it. Pure. */
export function gitBundleShows(bundle: GitBundle | undefined, logWanted: boolean): boolean {
  return bundle !== undefined && (!logWanted || bundle.hasLog)
}
