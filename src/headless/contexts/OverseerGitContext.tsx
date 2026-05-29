import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { getOverseerGitDiffSummary, getOverseerGitLog, useApi } from '../api'
import type { GitDiffSummary, GitLogCommit } from '../api'

const EMPTY_LOG: GitLogCommit[] = []

const LOG_PAGE_SIZE = 300

/**
 * Read-only data layer behind the overseer Git view that the web / desktop /
 * mobile clients all render. Calls only the two SDK methods the view needs
 * (`getOverseerGitLog`, `getOverseerGitDiffSummary`) and subscribes to
 * `overseer:git-status-changed` over the WS hub so live commits stream in
 * without polling. No caches, no mutations, no credential modal — the
 * overseer's mutating surface (commit, push, branch) is owned by the
 * backend's debounce + daily-squash machinery, not the UI.
 */
export interface OverseerGitContextValue {
  isLoaded: boolean
  loadError: Error | null

  log: GitLogCommit[]
  hasMoreLog: boolean
  isLogLoading: boolean
  loadMoreLog: () => Promise<void>

  /** Fetcher for per-commit diffs — feeds the read-only commit diff viewer. */
  fetchCommitDiff: (
    input: { baseRef: string; headRef: string; includePatch: boolean },
    signal: AbortSignal,
  ) => Promise<GitDiffSummary>

  refresh: () => Promise<void>
}

const OverseerGitContext = createContext<OverseerGitContextValue | null>(null)

export function OverseerGitProvider({ children }: { children: ReactNode }) {
  const { ws } = useApi()

  const [log, setLog] = useState<GitLogCommit[]>(EMPTY_LOG)
  const [hasMoreLog, setHasMoreLog] = useState(true)
  const [isLogLoading, setIsLogLoading] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<Error | null>(null)

  const logFetchRef = useRef(false)

  const refresh = useCallback(async () => {
    try {
      const { data } = await getOverseerGitLog({
        query: { maxCount: LOG_PAGE_SIZE, all: true },
        throwOnError: true,
      })
      setLog(data.commits)
      setHasMoreLog(data.commits.length >= LOG_PAGE_SIZE)
      setLoadError(null)
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoaded(true)
    }
  }, [])

  const loadMoreLog = useCallback(async () => {
    if (logFetchRef.current || !hasMoreLog) return
    logFetchRef.current = true
    setIsLogLoading(true)
    try {
      const { data } = await getOverseerGitLog({
        query: { maxCount: LOG_PAGE_SIZE, all: true, skip: log.length },
        throwOnError: true,
      })
      const next = data.commits
      if (next.length === 0) {
        setHasMoreLog(false)
        return
      }
      setLog((prev) => {
        const seen = new Set(prev.map((c) => c.hash))
        const merged = [...prev]
        for (const c of next) if (!seen.has(c.hash)) merged.push(c)
        return merged
      })
      setHasMoreLog(next.length >= LOG_PAGE_SIZE)
    } catch (err) {
      // Pagination failures shouldn't blank the existing log; log and stop.
      console.warn('[OverseerGit] loadMoreLog failed', err)
      setHasMoreLog(false)
    } finally {
      logFetchRef.current = false
      setIsLogLoading(false)
    }
  }, [hasMoreLog, log.length])

  const fetchCommitDiff = useCallback<OverseerGitContextValue['fetchCommitDiff']>(
    async ({ baseRef, headRef, includePatch }, signal) => {
      const { data } = await getOverseerGitDiffSummary({
        body: { baseRef, headRef, includePatch },
        signal,
        throwOnError: true,
      })
      return data
    },
    [],
  )

  useEffect(() => {
    void refresh()
    const off = ws.on('overseer:git-status-changed', () => {
      void refresh()
    })
    return off
  }, [ws, refresh])

  const value = useMemo<OverseerGitContextValue>(
    () => ({
      isLoaded,
      loadError,
      log,
      hasMoreLog,
      isLogLoading,
      loadMoreLog,
      fetchCommitDiff,
      refresh,
    }),
    [isLoaded, loadError, log, hasMoreLog, isLogLoading, loadMoreLog, fetchCommitDiff, refresh],
  )

  return <OverseerGitContext.Provider value={value}>{children}</OverseerGitContext.Provider>
}

export function useOverseerGit(): OverseerGitContextValue {
  const ctx = useContext(OverseerGitContext)
  if (!ctx) throw new Error('useOverseerGit must be used within OverseerGitProvider')
  return ctx
}
