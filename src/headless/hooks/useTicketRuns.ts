import { useEffect, useMemo, useReducer } from 'react'
import type { ProcessRun } from 'thefactory-tools/types'
import { useApi } from '../api/ApiContext'
import { useAuth } from '../api/AuthContext'
import type { ReviewMergeJob } from '../utils/colleagueReviewMergeTypes'
import { ticketRunIndex, ticketRunMergeKeys } from '../utils/ticketRunState'
import type { TicketRunIndex } from '../utils/ticketRunStateTypes'
import { colleagueReviewMergeStoreFor } from './useColleagueReviewMerge'
import { useProcessGroupRuns } from './useProcessGroupRuns'
import { useProcessRuns } from './useProcessRuns'

export type UseTicketRuns = {
  /** The group's runs, sorted out once for every ticket shown. */
  index: TicketRunIndex
  /** The approve-and-merge of each ticket whose review run works now, by key. */
  merges: Readonly<Record<string, ReviewMergeJob>>
}

/**
 * The approve-and-merges of a group's tickets, live, read only for the keys
 * given: what the review runs that work now are merging. No keys reads none.
 */
export function useReviewMergeJobs(
  groupId: string | undefined,
  ticketKeys: readonly string[],
): Readonly<Record<string, ReviewMergeJob>> {
  const { token } = useAuth()
  const { ws } = useApi()
  const store = colleagueReviewMergeStoreFor(ws)
  const joined = ticketKeys.join('\n')
  const keys = useMemo(
    () =>
      groupId && joined ? joined.split('\n').map((ticketKey) => ({ groupId, ticketKey })) : [],
    [groupId, joined],
  )
  const [seen, changed] = useReducer((n: number) => n + 1, 0)

  useEffect(() => {
    if (!token) return
    const releases = keys.map((key) => store.retain(key))
    return () => releases.forEach((release) => release())
  }, [store, token, keys])

  useEffect(() => {
    const offs = keys.map((key) => store.listen(key, changed))
    return () => offs.forEach((off) => off())
  }, [store, keys])

  return useMemo(() => {
    void seen
    return Object.fromEntries(
      keys.flatMap((key) => {
        const job = store.snapshot(key).job
        return job ? [[key.ticketKey, job] as const] : []
      }),
    )
  }, [store, keys, seen])
}

/**
 * The runs working a group's tickets, live: every run the person can see
 * and the group's group runs, read once for the whole list or page and kept
 * by the run updates, and the merges of the tickets whose review run works.
 */
export function useTicketRuns(groupId: string | undefined): UseTicketRuns {
  const { runs } = useProcessRuns()
  const { runs: groupRuns } = useProcessGroupRuns(groupId)
  const index = useMemo(
    () => ticketRunIndex(groupId ?? '', runs as readonly ProcessRun[], groupRuns),
    [groupId, runs, groupRuns],
  )
  const merges = useReviewMergeJobs(groupId, ticketRunMergeKeys(index))
  return useMemo(() => ({ index, merges }), [index, merges])
}
