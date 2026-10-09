import { useCallback, useEffect, useMemo, useState } from 'react'
import { extractErrorMessage, searchFiles, type SearchHit } from '../api'
import { useAuth } from '../api/AuthContext'
import {
  isSearchableQuery,
  projectSearchGroups,
  projectSearchRows,
  projectSearchStatus,
} from '../utils/projectSearch'
import { PROJECT_SEARCH_DEBOUNCE_MS, PROJECT_SEARCH_TEXT } from '../utils/projectSearchConstants'
import type {
  ProjectSearchGroup,
  ProjectSearchRow,
  ProjectSearchStatus,
} from '../utils/projectSearchTypes'

export type UseProjectSearch = {
  /** What is typed. */
  query: string
  setQuery: (query: string) => void
  /** The query the results answer — lags `query` while a search is out. */
  searched: string
  status: ProjectSearchStatus
  /** The last results, kept while a new search is out. */
  groups: ProjectSearchGroup[]
  rows: ProjectSearchRow[]
  error: string | undefined
  retry: () => void
}

type Answer = { projectId: string; query: string; hits: SearchHit[]; error?: string }

/**
 * The person's search of a project — its files with the lines that matched, its stories, features
 * and notes — run once typing pauses, its results grouped for the Search tab. `initialQuery` is
 * searched at once, so a link (or Back) to a search shows its results.
 */
export function useProjectSearch(
  projectId: string | undefined,
  initialQuery = '',
): UseProjectSearch {
  const { token } = useAuth()
  const [query, setQuery] = useState(initialQuery)
  const [settled, setSettled] = useState(initialQuery.trim())
  const [answer, setAnswer] = useState<Answer | undefined>(undefined)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setSettled(query.trim()), PROJECT_SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    if (!token || !projectId || !isSearchableQuery(settled)) return
    let live = true
    searchFiles({ path: { projectId }, body: { query: settled }, throwOnError: true }).then(
      ({ data }) => {
        if (live) setAnswer({ projectId, query: settled, hits: data })
      },
      (err: unknown) => {
        if (live)
          setAnswer({
            projectId,
            query: settled,
            hits: [],
            error: extractErrorMessage(err, PROJECT_SEARCH_TEXT.failed),
          })
      },
    )
    return () => {
      live = false
    }
  }, [token, projectId, settled, attempt])

  const current = answer?.projectId === projectId ? answer : undefined
  const groups = useMemo(
    () => (current ? projectSearchGroups(current.hits, current.query) : []),
    [current],
  )
  const rows = useMemo(() => projectSearchRows(groups), [groups])
  const retry = useCallback(() => {
    setAnswer(undefined)
    setAttempt((n) => n + 1)
  }, [])

  return {
    query,
    setQuery,
    searched: current?.query ?? '',
    status: projectSearchStatus(
      query,
      current ? { query: current.query, failed: current.error !== undefined } : undefined,
    ),
    groups,
    rows,
    error: current?.error,
    retry,
  }
}
