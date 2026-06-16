import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  createGitBranch,
  deleteFiles,
  deleteGitBranch,
  getGitBranchDiffSummary,
  getGitBundle,
  getGitFileContent,
  getGitLocalDiff,
  getGitLog,
  gitApplyPatch,
  gitDiscardStaged,
  gitDiscardUnstaged,
  gitResetAll,
  gitCheckout,
  gitCommit,
  gitFetch,
  gitMergeApply,
  gitMergePlan,
  gitMergeReport,
  gitPull,
  gitPush,
  gitReset,
  gitStage,
  gitStash,
  gitStashApply,
  gitStashDrop,
  gitUnstage,
  isGitCredentialError,
  unwrapGitEnvelope,
} from '../api'
import type {
  GitCommitResponse,
  GitDiffSummary,
  GitFetchResponse,
  GitFileChange,
  GitMergeApplyInput,
  GitMergePlan,
  GitMergePlanInput,
  GitMergeReport,
  GitMergeReportInput,
  GitMergeResult,
  GitPullResponse,
  GitPushResponse,
  GitStashResponse,
  GitLogCommit,
  GitStashListItem,
  CommitInput,
  CreateBranchInput,
  FetchInput,
  GitStatus,
  GitUnifiedBranch,
  PullInput,
  PushInput,
  StashApplyInput,
  StashDropInput,
  StashInput,
} from '../api'
import { useApi } from '../api/ApiContext'
import { useActiveProject } from './ProjectsContext'
import { ProjectResourceCache } from '../utils/projectResourceCache'
import type { SyncKVStorage } from '../hooks/useStorageBackedState'

type GitBundle = {
  status: GitStatus | null
  branches: GitUnifiedBranch[]
  log: GitLogCommit[]
  hasMoreLog: boolean
  stashes: GitStashListItem[]
}

/** SWR cache keyed by projectId — instant render on switch back to a
 *  previously-seen project (no spinner while git status / branches / log /
 *  stashes refresh in the background). */
const gitCache = new ProjectResourceCache<GitBundle>(16)

export type GitSelection =
  | { kind: 'branch'; branchName: string }
  | { kind: 'stash'; stashRef: string }
  | { kind: 'commit'; sha: string }
  | null

export type LocalDiffEntry = GitFileChange & { isConflicted?: boolean }

export type LocalDiff = {
  staged: LocalDiffEntry[]
  unstaged: LocalDiffEntry[]
  conflicts: string[]
}

export type MergePreferences = {
  autoPush: boolean
  deleteRemoteAfterMerge: boolean
}

export type GitContextValue = {
  isLoaded: boolean
  loadError: Error | null

  status: GitStatus | null
  branches: GitUnifiedBranch[]
  log: GitLogCommit[]
  /** True when there's likely more history beyond the currently loaded `log`. */
  hasMoreLog: boolean
  isLogLoading: boolean
  /** Fetch the next page and append. Idempotent while a fetch is in flight. */
  loadMoreLog: () => Promise<void>
  stashes: GitStashListItem[]

  /** Working tree split into staged + unstaged, with conflict marks. */
  localDiff: LocalDiff | null
  isLocalDiffLoading: boolean
  loadLocalDiff: () => Promise<void>

  /**
   * Selection across views — branch / stash / commit. Lifted here so per-view
   * components stay in sync (e.g. the graph and the diff pane).
   */
  selection: GitSelection
  setSelection: (sel: GitSelection) => void

  /** Persisted merge preferences, mirrored from desktop. */
  mergePreferences: MergePreferences
  setMergePreferences: (next: Partial<MergePreferences>) => void

  commit: (input: CommitInput) => Promise<GitCommitResponse>
  push: (input?: PushInput) => Promise<GitPushResponse>
  pull: (input?: PullInput) => Promise<GitPullResponse>
  fetch: (input?: FetchInput) => Promise<GitFetchResponse>
  getFileContent: (path: string, ref: string) => Promise<string>
  /** Per-commit (or arbitrary ref-range) file-level diff with patches. */
  getCommitDiff: (baseRef: string, headRef: string) => Promise<GitDiffSummary>
  resetAll: () => Promise<void>

  stage: (paths: string[]) => Promise<void>
  unstage: (paths: string[]) => Promise<void>
  /** Discard both staged and unstaged changes for paths (restore to HEAD). */
  reset: (paths: string[]) => Promise<void>
  /**
   * Discard only the unstaged changes for paths (restore the working tree to
   * the index), leaving staged changes intact.
   */
  discardUnstaged: (paths: string[]) => Promise<void>
  /**
   * Destructively discard only the staged changes for paths: reverse the staged
   * hunks out of the working tree and reset the index to HEAD, while preserving
   * any unstaged edits to the same file. The counterpart to `discardUnstaged`.
   */
  discardStaged: (paths: string[]) => Promise<void>
  /** `git rm` equivalent — drops working-tree files via the files API. */
  removeFiles: (paths: string[]) => Promise<void>
  /**
   * Apply a raw unified diff patch via `git apply`. Used by the diff viewer
   * to stage/unstage/discard individual hunks. `cached: true` writes the
   * patch to the index only; `reverse: true` flips additions and deletions.
   */
  applyPatch: (input: {
    patch: string
    cached?: boolean
    reverse?: boolean
    index?: boolean
  }) => Promise<void>

  checkout: (branch: string) => Promise<void>
  createBranch: (input: CreateBranchInput) => Promise<void>
  deleteBranch: (name: string) => Promise<void>

  stash: (input?: StashInput) => Promise<GitStashResponse>
  applyStash: (input: StashApplyInput) => Promise<void>
  dropStash: (input: StashDropInput) => Promise<void>

  planMerge: (input: GitMergePlanInput) => Promise<GitMergePlan>
  buildMergeReport: (input: GitMergeReportInput) => Promise<GitMergeReport>
  applyMerge: (input: GitMergeApplyInput) => Promise<GitMergeResult>

  refresh: () => Promise<void>

  /**
   * Set by every remote git op (push / pull / fetch / commit-with-push)
   * when it fails with a `GIT_CREDENTIAL_ERROR` — drives the global
   * "GitHub credentials don't have access" modal mounted in `App.tsx`.
   * Null while clean. `clearCredentialError()` dismisses the modal.
   */
  credentialError: GitCredentialError | null
  clearCredentialError: () => void
}

export type GitCredentialError = {
  /** Which op surfaced the error — used in the modal copy. */
  op: 'push' | 'pull' | 'fetch' | 'commit'
  /** Raw underlying message (git stderr or SDK error string). */
  message: string
  /** Optional repo URL we tried to authenticate against. */
  repoUrl?: string
}

const GitContext = createContext<GitContextValue | null>(null)

const EMPTY_BRANCHES: GitUnifiedBranch[] = []
const EMPTY_LOG: GitLogCommit[] = []
const EMPTY_STASHES: GitStashListItem[] = []
const EMPTY_STATUS: GitStatus = { staged: [], unstaged: [], untracked: [] }

// Page size for commit log fetches. Larger initial page so most branch tips
// land in the first batch; subsequent pages append on scroll. `all: true`
// includes non-current branches so we can scroll to any branch's tip.
const LOG_PAGE_SIZE = 300

const DEFAULT_MERGE_PREFS: MergePreferences = {
  autoPush: false,
  deleteRemoteAfterMerge: false,
}

const MERGE_PREFS_KEY_PREFIX = 'git.mergePrefs:'

function readMergePrefs(storage: SyncKVStorage, projectId: string | undefined): MergePreferences {
  if (!projectId) return DEFAULT_MERGE_PREFS
  try {
    const raw = storage.get(`${MERGE_PREFS_KEY_PREFIX}${projectId}`)
    if (!raw) return DEFAULT_MERGE_PREFS
    const parsed = JSON.parse(raw)
    return {
      autoPush: !!parsed?.autoPush,
      deleteRemoteAfterMerge: !!parsed?.deleteRemoteAfterMerge,
    }
  } catch {
    return DEFAULT_MERGE_PREFS
  }
}

function persistMergePrefs(
  storage: SyncKVStorage,
  projectId: string | undefined,
  prefs: MergePreferences,
) {
  if (!projectId) return
  try {
    storage.set(`${MERGE_PREFS_KEY_PREFIX}${projectId}`, JSON.stringify(prefs))
  } catch {
    // private mode / MMKV write failure — best-effort, never block on
    // storage failure
  }
}

export interface GitProviderProps {
  children: ReactNode
  /**
   * Adapter for persisting per-project merge prefs (auto-push, delete-
   * remote-after-merge). Web/desktop pass a `localStorage`-backed adapter;
   * mobile passes an MMKV-backed one. The adapter is invoked
   * synchronously — it must be the same `SyncKVStorage` shape used by
   * `AppSettingsProvider` and `useStorageBackedState`.
   */
  storage: SyncKVStorage
}

export function GitProvider({ children, storage }: GitProviderProps) {
  const { ws } = useApi()
  const { projectId, project } = useActiveProject()

  const [status, setStatus] = useState<GitStatus | null>(null)
  const [branches, setBranches] = useState<GitUnifiedBranch[]>(EMPTY_BRANCHES)
  const [log, setLog] = useState<GitLogCommit[]>(EMPTY_LOG)
  const [hasMoreLog, setHasMoreLog] = useState(true)
  const [isLogLoading, setIsLogLoading] = useState(false)
  const logFetchRef = useRef(false)
  const [stashes, setStashes] = useState<GitStashListItem[]>(EMPTY_STASHES)
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<Error | null>(null)

  const [localDiff, setLocalDiff] = useState<LocalDiff | null>(null)
  const [isLocalDiffLoading, setIsLocalDiffLoading] = useState(false)
  const localDiffAbortRef = useRef<AbortController | null>(null)
  const localDiffLoadedRef = useRef(false)

  const [selection, setSelectionState] = useState<GitSelection>(null)
  const [mergePreferences, setMergePreferencesState] = useState<MergePreferences>(() =>
    readMergePrefs(storage, projectId),
  )
  const [credentialError, setCredentialError] = useState<GitCredentialError | null>(null)
  const clearCredentialError = useCallback(() => setCredentialError(null), [])
  // Auto-clear the credential error when the active project changes — a new
  // project might have working credentials, and a stale modal would just be
  // noise. Push/pull/fetch will re-trigger if the new project fails too.
  useEffect(() => {
    setCredentialError(null)
  }, [projectId])

  // Resync mergePrefs whenever the project changes.
  useEffect(() => {
    setMergePreferencesState(readMergePrefs(storage, projectId))
  }, [storage, projectId])

  const setMergePreferences = useCallback(
    (next: Partial<MergePreferences>) => {
      setMergePreferencesState((prev) => {
        const merged = { ...prev, ...next }
        persistMergePrefs(storage, projectId, merged)
        return merged
      })
    },
    [storage, projectId],
  )

  const setSelection = useCallback((sel: GitSelection) => {
    setSelectionState(sel)
  }, [])

  // `latestProjectIdRef` always reflects the *currently rendered* projectId.
  // A `refresh()` call captures `projectId` in its closure at start time —
  // when the user switches projects, an in-flight refresh from a mutation
  // callback (`await refresh()` after a commit / push) could still be
  // carrying the OLD projectId. Comparing the captured `reqProjectId`
  // against `latestProjectIdRef.current` at write-time guarantees we never
  // commit the wrong project's data — even if the gen counter happens to
  // line up the wrong way (mutation's stale refresh increments gen LATER
  // than the project-switch refresh and would otherwise "win").
  const latestProjectIdRef = useRef(projectId)
  useEffect(() => {
    latestProjectIdRef.current = projectId
  }, [projectId])

  // AbortController per refresh + 60s timeout. Project switch / StrictMode
  // double-invoke aborts the previous fan-out so it can't hold connection
  // slots or land on stale state. 60 s matches the backend's bundle-handler
  // hard cap exactly — anything that the backend doesn't finish by then
  // isn't going to anyway, and the FE surfaces a Retry CTA via the
  // catch + finally below instead of a frozen spinner.
  const abortRef = useRef<AbortController | null>(null)
  const REVALIDATE_TIMEOUT_MS = 60_000
  // Generation counter — second guard against stale responses landing in
  // state after the controller's abort hasn't propagated yet.
  const refreshGenRef = useRef(0)
  const refresh = useCallback(async () => {
    const gen = ++refreshGenRef.current
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const timeoutId = setTimeout(() => controller.abort(), REVALIDATE_TIMEOUT_MS)
    const reqProjectId = projectId
    if (!reqProjectId) {
      setStatus(null)
      setBranches(EMPTY_BRANCHES)
      setLog(EMPTY_LOG)
      setHasMoreLog(true)
      setStashes(EMPTY_STASHES)
      setIsLoaded(true)
      setLoadError(null)
      clearTimeout(timeoutId)
      return
    }
    try {
      const path = { projectId: reqProjectId }
      const sigOpts = { signal: controller.signal, throwOnError: true } as const
      // Single bundled request → the backend runs the four reads
      // sequentially under one HTTP request. This collapses the FE's
      // historical 4-parallel spawn burst into a single spawn-at-a-time
      // chain, which (together with the runCommand semaphore + EBADF
      // retries downstream) was the source of the intermittent
      // `spawn EBADF` under rapid project switching.
      const bundleRes = await getGitBundle({
        path,
        query: { all: true, maxCount: LOG_PAGE_SIZE },
        ...sigOpts,
      })
      if (
        gen !== refreshGenRef.current ||
        latestProjectIdRef.current !== reqProjectId ||
        controller.signal.aborted
      )
        return
      const nextStatus = unwrapGitEnvelope(bundleRes.data.status, 'status', EMPTY_STATUS)
      const nextBranches = unwrapGitEnvelope(bundleRes.data.branches, 'branches', EMPTY_BRANCHES)
      const commits = bundleRes.data.log.commits
      const nextHasMore = commits.length >= LOG_PAGE_SIZE
      const nextStashes = unwrapGitEnvelope(bundleRes.data.stashes, 'stashes', EMPTY_STASHES)
      setStatus(nextStatus)
      setBranches(nextBranches)
      setLog(commits)
      setHasMoreLog(nextHasMore)
      setStashes(nextStashes)
      setLoadError(null)
      gitCache.set(
        reqProjectId,
        {
          status: nextStatus,
          branches: nextBranches,
          log: commits,
          hasMoreLog: nextHasMore,
          stashes: nextStashes,
        },
        null,
      )
    } catch (err) {
      // Stale renders (project switched, or a newer refresh started)
      // discard their error — the live request will surface its own.
      if (gen !== refreshGenRef.current || latestProjectIdRef.current !== reqProjectId) return
      // Aborts on the LIVE project (i.e. nobody switched away) come from
      // our own revalidate timeout firing — surface them as a real error
      // so the screen exits the loading state. Previously this `catch`
      // silently returned and the finally also skipped `setIsLoaded(true)`,
      // leaving the spinner stuck until the next project switch.
      if (controller.signal.aborted) {
        setLoadError(
          new Error(
            `Git refresh timed out after ${REVALIDATE_TIMEOUT_MS / 1000}s — backend may be queued; try again.`,
          ),
        )
      } else {
        setLoadError(err instanceof Error ? err : new Error(String(err)))
      }
    } finally {
      clearTimeout(timeoutId)
      // Always exit the loading state on the live project, including the
      // timeout-abort case. Project-switch aborts (latestProjectIdRef
      // moved on) are still skipped — the new project's refresh will set
      // its own `isLoaded`.
      if (latestProjectIdRef.current === reqProjectId) {
        setIsLoaded(true)
      }
    }
  }, [projectId])

  const loadMoreLog = useCallback(async () => {
    if (!projectId) return
    if (logFetchRef.current) return
    if (!hasMoreLog) return
    logFetchRef.current = true
    setIsLogLoading(true)
    try {
      const { data } = await getGitLog({
        path: { projectId },
        query: { all: true, maxCount: LOG_PAGE_SIZE, skip: log.length },
        throwOnError: true,
      })
      const next = data.commits
      if (next.length === 0) {
        setHasMoreLog(false)
        return
      }
      // Dedupe in case the backend returned overlapping commits (defensive
      // — `skip` should already avoid this).
      setLog((prev) => {
        const seen = new Set(prev.map((c) => c.hash))
        const merged = [...prev]
        for (const c of next) {
          if (!seen.has(c.hash)) merged.push(c)
        }
        return merged
      })
      setHasMoreLog(next.length >= LOG_PAGE_SIZE)
    } catch (err) {
      // Pagination failures shouldn't blank the existing log; log them.
      console.warn('[GitContext] loadMoreLog failed', err)
      setHasMoreLog(false)
    } finally {
      logFetchRef.current = false
      setIsLogLoading(false)
    }
  }, [projectId, hasMoreLog, log])

  // On project switch: hydrate from cache if we have one (no spinner) and
  // kick off a revalidate. Cache miss → spinner until first 200. The
  // local-diff stream + selection state are session-scoped and always
  // cleared on switch.
  useEffect(() => {
    localDiffAbortRef.current?.abort()
    localDiffLoadedRef.current = false
    logFetchRef.current = false
    setIsLogLoading(false)
    setLocalDiff(null)
    setSelectionState(null)
    setLoadError(null)
    if (!projectId) {
      setStatus(null)
      setBranches(EMPTY_BRANCHES)
      setLog(EMPTY_LOG)
      setHasMoreLog(true)
      setStashes(EMPTY_STASHES)
      setIsLoaded(true)
    } else {
      const cached = gitCache.get(projectId)
      if (cached) {
        setStatus(cached.data.status)
        setBranches(cached.data.branches)
        setLog(cached.data.log)
        setHasMoreLog(cached.data.hasMoreLog)
        setStashes(cached.data.stashes)
        setIsLoaded(true)
      } else {
        setStatus(null)
        setBranches(EMPTY_BRANCHES)
        setLog(EMPTY_LOG)
        setHasMoreLog(true)
        setStashes(EMPTY_STASHES)
        setIsLoaded(false)
      }
    }
    void refresh()
    return () => abortRef.current?.abort()
  }, [projectId, refresh])

  const requireProject = useCallback(() => {
    if (!projectId) throw new Error('No active project — cannot perform git operation')
    return projectId
  }, [projectId])

  const loadLocalDiff = useCallback(async () => {
    const id = requireProject()
    localDiffAbortRef.current?.abort()
    const controller = new AbortController()
    localDiffAbortRef.current = controller
    setIsLocalDiffLoading(true)
    try {
      const [stagedRes, unstagedRes] = await Promise.all([
        getGitLocalDiff({
          path: { projectId: id },
          body: { staged: true, includePatch: true, includeStructured: true },
          signal: controller.signal,
          throwOnError: true,
        }),
        getGitLocalDiff({
          path: { projectId: id },
          body: { staged: false, includePatch: true, includeStructured: true },
          signal: controller.signal,
          throwOnError: true,
        }),
      ])
      if (controller.signal.aborted) return
      const stagedFiles: GitFileChange[] = stagedRes.data
      const unstagedFiles: GitFileChange[] = unstagedRes.data
      const conflictedSet = new Set<string>(
        [...stagedFiles, ...unstagedFiles]
          .filter((f) => f.status === 'U')
          .map((f) => f.path)
          .filter((p): p is string => typeof p === 'string' && p.length > 0),
      )
      const decorate = (f: GitFileChange): LocalDiffEntry => ({
        ...f,
        isConflicted: conflictedSet.has(f.path),
      })
      setLocalDiff({
        staged: stagedFiles.map(decorate),
        unstaged: unstagedFiles.map(decorate),
        conflicts: Array.from(conflictedSet),
      })
      localDiffLoadedRef.current = true
    } catch (err) {
      if (controller.signal.aborted) return
      throw err
    } finally {
      if (localDiffAbortRef.current === controller) {
        localDiffAbortRef.current = null
        setIsLocalDiffLoading(false)
      }
    }
  }, [requireProject])

  // Re-fetch on backend mutation. localDiff piggybacks only when previously
  // loaded so a tab that doesn't show it doesn't pay the round-trip cost.
  useEffect(
    () =>
      ws.on('git:status-changed', () => {
        void refresh()
        if (localDiffLoadedRef.current) void loadLocalDiff()
      }),
    [ws, refresh, loadLocalDiff],
  )

  // Working-tree file mutations (delete / rename / write / upload) change git
  // status without touching `.git`, so the `git:status-changed` watcher above
  // never fires for them — the status would otherwise go stale until a manual
  // refresh. React to `files:changed` too, debounced to coalesce bursts (e.g.
  // an agent writing many files into a single refresh).
  const filesChangedDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const unsub = ws.on<{ projectId?: string }>('files:changed', (event) => {
      // Ignore mutations in a background project — `refresh()` only ever
      // operates on the active project, so a stray refresh would be wasted.
      if (event.projectId && event.projectId !== latestProjectIdRef.current) return
      if (filesChangedDebounceRef.current) clearTimeout(filesChangedDebounceRef.current)
      filesChangedDebounceRef.current = setTimeout(() => {
        filesChangedDebounceRef.current = null
        void refresh()
        if (localDiffLoadedRef.current) void loadLocalDiff()
      }, 250)
    })
    return () => {
      unsub()
      if (filesChangedDebounceRef.current) {
        clearTimeout(filesChangedDebounceRef.current)
        filesChangedDebounceRef.current = null
      }
    }
  }, [ws, refresh, loadLocalDiff])

  const commit = useCallback(
    async (input: CommitInput) => {
      const id = requireProject()
      const { data } = await gitCommit({
        path: { projectId: id },
        body: input,
        throwOnError: true,
      })
      await refresh()
      return data
    },
    [requireProject, refresh],
  )

  const push = useCallback(
    async (input: PushInput = {}) => {
      const id = requireProject()
      try {
        const { data } = await gitPush({
          path: { projectId: id },
          body: input,
          throwOnError: true,
        })
        await refresh()
        return data
      } catch (err) {
        if (isGitCredentialError(err)) {
          setCredentialError({
            op: 'push',
            message: err instanceof Error ? err.message : String(err),
            repoUrl: project?.repo_url ?? undefined,
          })
        }
        throw err
      }
    },
    [requireProject, refresh, project?.repo_url],
  )

  const pull = useCallback(
    async (input: PullInput = {}) => {
      const id = requireProject()
      try {
        const { data } = await gitPull({
          path: { projectId: id },
          body: input,
          throwOnError: true,
        })
        await refresh()
        return data
      } catch (err) {
        if (isGitCredentialError(err)) {
          setCredentialError({
            op: 'pull',
            message: err instanceof Error ? err.message : String(err),
            repoUrl: project?.repo_url ?? undefined,
          })
        }
        throw err
      }
    },
    [requireProject, refresh, project?.repo_url],
  )

  const fetchOp = useCallback(
    async (input: FetchInput = {}) => {
      const id = requireProject()
      try {
        const { data } = await gitFetch({
          path: { projectId: id },
          body: input,
          throwOnError: true,
        })
        await refresh()
        return data
      } catch (err) {
        if (isGitCredentialError(err)) {
          setCredentialError({
            op: 'fetch',
            message: err instanceof Error ? err.message : String(err),
            repoUrl: project?.repo_url ?? undefined,
          })
        }
        throw err
      }
    },
    [requireProject, refresh, project?.repo_url],
  )

  const getFileContent = useCallback(
    async (path: string, ref: string) => {
      const id = requireProject()
      const { data } = await getGitFileContent({
        path: { projectId: id },
        body: { path, ref },
        throwOnError: true,
      })
      return data.content
    },
    [requireProject],
  )

  const getCommitDiff = useCallback(
    async (baseRef: string, headRef: string) => {
      const id = requireProject()
      const { data } = await getGitBranchDiffSummary({
        path: { projectId: id },
        body: { baseRef, headRef, includePatch: true },
        throwOnError: true,
      })
      return data
    },
    [requireProject],
  )

  const resetAll = useCallback(async () => {
    const id = requireProject()
    await gitResetAll({ path: { projectId: id }, throwOnError: true })
    await refresh()
  }, [requireProject, refresh])

  const stage = useCallback(
    async (paths: string[]) => {
      const id = requireProject()
      await gitStage({ path: { projectId: id }, body: { paths }, throwOnError: true })
      await refresh()
    },
    [requireProject, refresh],
  )

  const unstage = useCallback(
    async (paths: string[]) => {
      const id = requireProject()
      await gitUnstage({ path: { projectId: id }, body: { paths }, throwOnError: true })
      await refresh()
    },
    [requireProject, refresh],
  )

  const reset = useCallback(
    async (paths: string[]) => {
      const id = requireProject()
      await gitReset({ path: { projectId: id }, body: { paths }, throwOnError: true })
      await refresh()
    },
    [requireProject, refresh],
  )

  const discardUnstaged = useCallback(
    async (paths: string[]) => {
      const id = requireProject()
      await gitDiscardUnstaged({ path: { projectId: id }, body: { paths }, throwOnError: true })
      await refresh()
    },
    [requireProject, refresh],
  )

  const discardStaged = useCallback(
    async (paths: string[]) => {
      const id = requireProject()
      await gitDiscardStaged({ path: { projectId: id }, body: { paths }, throwOnError: true })
      await refresh()
    },
    [requireProject, refresh],
  )

  const removeFiles = useCallback(
    async (paths: string[]) => {
      const id = requireProject()
      if (paths.length === 0) return
      await deleteFiles({ path: { projectId: id }, body: { paths }, throwOnError: true })
      await refresh()
    },
    [requireProject, refresh],
  )

  const applyPatch = useCallback(
    async (input: { patch: string; cached?: boolean; reverse?: boolean; index?: boolean }) => {
      const id = requireProject()
      await gitApplyPatch({ path: { projectId: id }, body: input, throwOnError: true })
      await refresh()
      // Don't wait on the WS `git:status-changed` round-trip — if `localDiff`
      // was loaded, refetch it inline so the file row's "modified" badge
      // and the diff pane both reflect the new index state immediately.
      if (localDiffLoadedRef.current) {
        await loadLocalDiff()
      }
    },
    [requireProject, refresh, loadLocalDiff],
  )

  const checkout = useCallback(
    async (branch: string) => {
      const id = requireProject()
      await gitCheckout({ path: { projectId: id }, body: { branch }, throwOnError: true })
      await refresh()
    },
    [requireProject, refresh],
  )

  const createBranch = useCallback(
    async (input: CreateBranchInput) => {
      const id = requireProject()
      await createGitBranch({ path: { projectId: id }, body: input, throwOnError: true })
      await refresh()
    },
    [requireProject, refresh],
  )

  const deleteBranch = useCallback(
    async (name: string) => {
      const id = requireProject()
      await deleteGitBranch({
        path: { projectId: id },
        body: { name },
        throwOnError: true,
      })
      await refresh()
    },
    [requireProject, refresh],
  )

  const stash = useCallback(
    async (input: StashInput = {}) => {
      const id = requireProject()
      const { data } = await gitStash({ path: { projectId: id }, body: input, throwOnError: true })
      await refresh()
      return data
    },
    [requireProject, refresh],
  )

  const applyStash = useCallback(
    async (input: StashApplyInput) => {
      const id = requireProject()
      await gitStashApply({ path: { projectId: id }, body: input, throwOnError: true })
      await refresh()
    },
    [requireProject, refresh],
  )

  const dropStash = useCallback(
    async (input: StashDropInput) => {
      const id = requireProject()
      await gitStashDrop({ path: { projectId: id }, body: input, throwOnError: true })
      await refresh()
    },
    [requireProject, refresh],
  )

  const planMerge = useCallback(
    async (input: GitMergePlanInput) => {
      const id = requireProject()
      const { data } = await gitMergePlan({
        path: { projectId: id },
        body: input,
        throwOnError: true,
      })
      return data
    },
    [requireProject],
  )

  const buildMergeReport = useCallback(
    async (input: GitMergeReportInput) => {
      const id = requireProject()
      const { data } = await gitMergeReport({
        path: { projectId: id },
        body: input,
        throwOnError: true,
      })
      return data
    },
    [requireProject],
  )

  const applyMerge = useCallback(
    async (input: GitMergeApplyInput) => {
      const id = requireProject()
      const { data } = await gitMergeApply({
        path: { projectId: id },
        body: input,
        throwOnError: true,
      })
      await refresh()
      return data
    },
    [requireProject, refresh],
  )

  const value = useMemo<GitContextValue>(
    () => ({
      isLoaded,
      loadError,
      status,
      branches,
      log,
      hasMoreLog,
      isLogLoading,
      loadMoreLog,
      stashes,
      localDiff,
      isLocalDiffLoading,
      loadLocalDiff,
      selection,
      setSelection,
      mergePreferences,
      setMergePreferences,
      commit,
      push,
      pull,
      fetch: fetchOp,
      getFileContent,
      getCommitDiff,
      resetAll,
      stage,
      unstage,
      reset,
      discardUnstaged,
      discardStaged,
      removeFiles,
      applyPatch,
      checkout,
      createBranch,
      deleteBranch,
      stash,
      applyStash,
      dropStash,
      planMerge,
      buildMergeReport,
      applyMerge,
      refresh,
      credentialError,
      clearCredentialError,
    }),
    [
      isLoaded,
      loadError,
      status,
      branches,
      log,
      hasMoreLog,
      isLogLoading,
      loadMoreLog,
      stashes,
      localDiff,
      isLocalDiffLoading,
      loadLocalDiff,
      selection,
      setSelection,
      mergePreferences,
      setMergePreferences,
      commit,
      push,
      pull,
      fetchOp,
      getFileContent,
      getCommitDiff,
      resetAll,
      stage,
      unstage,
      reset,
      discardUnstaged,
      discardStaged,
      removeFiles,
      applyPatch,
      checkout,
      createBranch,
      deleteBranch,
      stash,
      applyStash,
      dropStash,
      planMerge,
      buildMergeReport,
      applyMerge,
      refresh,
      credentialError,
      clearCredentialError,
    ],
  )

  return <GitContext.Provider value={value}>{children}</GitContext.Provider>
}

export function useGit(): GitContextValue {
  const ctx = useContext(GitContext)
  if (!ctx) throw new Error('useGit must be used within GitProvider')
  return ctx
}
