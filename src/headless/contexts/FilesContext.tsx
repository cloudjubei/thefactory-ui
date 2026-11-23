import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  deleteFiles,
  getAllFileStats,
  readFile,
  readFilePaths,
  renameFiles,
  uploadFile,
  writeFile,
  type FileMeta,
  type FilesResult,
} from '../api'
import { errorStatus } from '../api/errorMessage'
import {
  classifyPendingFileChange,
  fileChangeConcernsPath,
  fileChangeDeletedPath,
  fileChangeOriginOf,
  fileChangeRenamedTo,
  type FileChangeOrigin,
  type PendingFileChange,
} from '../utils/pendingFileChange'
import { classifyFileByExtension } from '../utils/filePaneKind'
import { useApi } from '../api/ApiContext'
import { useActiveProject } from './ProjectsContext'
import { ProjectResourceCache } from '../utils/projectResourceCache'
import { REVALIDATE_TIMEOUT_MS, acceptOkOr304, readEtagHeader } from '../utils/swrFetch'
import { wsEventConcernsProject } from '../utils/wsEventProject'
import { afterPrimaryLoads } from '../utils/afterPrimaryLoads'

/** SWR cache keyed by projectId — instant render on switch back to a
 *  project we've already seen this session. */
const filesCache = new ProjectResourceCache<FileMeta[]>()

/**
 * A project's files with what is known about each, revalidated against the
 * same cache the provider keeps — any project, not only the active one.
 */
export async function loadProjectFiles(projectId: string): Promise<FileMeta[]> {
  const cached = filesCache.get(projectId)
  const res = await getAllFileStats({
    path: { projectId },
    headers: cached?.etag ? { 'If-None-Match': cached.etag } : undefined,
    validateStatus: acceptOkOr304,
    throwOnError: true,
  })
  let files = cached?.data ?? []
  if (res.status !== 304) {
    files = (res.data ?? []) as FileMeta[]
    filesCache.set(projectId, files, readEtagHeader(res.headers))
  }
  return files
}

/**
 * A project's file paths, revalidated against the same cache the provider
 * keeps — what a chat over several projects offers after `@`.
 */
export async function loadProjectFilePaths(projectId: string): Promise<string[]> {
  const files = await loadProjectFiles(projectId)
  return files.map((f) => f.relativePath ?? f.absolutePath).filter(Boolean) as string[]
}

/** Coalesce window for `files:changed`-driven refreshes. */
const FILES_CHANGED_DEBOUNCE_MS = 250

function sameOrigin(a: FileChangeOrigin | undefined, b: FileChangeOrigin | undefined): boolean {
  if (a === b) return true
  if (!a || !b || a.kind !== b.kind) return false
  if (a.kind === 'agent' && b.kind === 'agent') {
    return a.runId === b.runId && a.chatContextId === b.chatContextId
  }
  if (a.kind === 'chat' && b.kind === 'chat') return a.chatContextId === b.chatContextId
  return true
}

export type FilesContextValue = {
  /** True once the first file-list fetch for the active project has completed. */
  isLoaded: boolean
  /** Last list fetch error; cleared on the next successful refresh. */
  loadError: Error | null

  /** Flat list of relative paths for every project file (recursive, files only). */
  paths: string[]
  /** Full per-file metadata for every project file (recursive, files only). */
  files: FileMeta[]

  /** Currently-selected file path, or `null`. */
  selectedPath: string | null
  /** Content of the selected file, or `null` while loading / none selected. */
  content: string | null
  /** True while fetching content for `selectedPath`. */
  isContentLoading: boolean
  /** Error from the last content fetch, cleared when a new one succeeds. */
  contentError: Error | null

  /** The latest disk version held aside while the selected file has unsaved edits. */
  pendingFileChange: PendingFileChange | null
  /** True after accepting a remote deletion while keeping unsaved edits to recreate on save. */
  isDeletedOnDisk: boolean
  /** Acknowledge the displayed disk version as the new base without writing it.
   * The editor decides whether to retain its draft or display that base. */
  acceptFileChangeBase: (change: PendingFileChange, choice: 'keep' | 'take') => boolean
  /** True while reading the latest change notification. */
  isCheckingFileChange: boolean
  /** The latest check failed without determining what is on disk. */
  fileChangeCheckFailed: boolean
  /** Retry the failed check for the selected file without reopening it. */
  retryFileChangeCheck: () => void
  /** Also sees notifications received before React has committed the next render. */
  hasUncheckedFileChange: () => boolean
  /** Report the canonical draft for the selected file; null means clean or closed. */
  reportFileDraft: (path: string, draft: string | null) => void
  selectFile: (path: string | null) => void

  /** Returns the unified diff produced by the backend. */
  writeFile: (path: string, content: string) => Promise<string>
  /**
   * Upload a file. Pass either text `content` or base64-encoded
   * `contentBase64` for binary payloads — exactly one. The backend rejects
   * the request when neither or both are present.
   */
  uploadFile: (
    name: string,
    body: { content: string } | { contentBase64: string },
  ) => Promise<string>
  deleteFiles: (paths: string[]) => Promise<void>
  renameFile: (from: string, to: string) => Promise<void>
  /** Rename/move a folder — moves every file under `fromDir` to `toDir`. */
  renameFolder: (fromDir: string, toDir: string) => Promise<void>
  /** Delete a folder — removes every file nested under `dir`. */
  deleteFolder: (dir: string) => Promise<void>

  /**
   * Read several files in one request. Returns a `FilesResult` keyed by
   * the requested path; values are `string` (when `lineNumbers === false`)
   * or `Array<string>` (one entry per line, prefixed with the line number)
   * when `lineNumbers === true`.
   */
  readPaths: (paths: string[], opts?: { lineNumbers?: boolean }) => Promise<FilesResult>

  refresh: () => Promise<void>
}

const FilesContext = createContext<FilesContextValue | null>(null)

export function FilesProvider({ children }: { children: ReactNode }) {
  const { ws } = useApi()
  const { projectId } = useActiveProject()

  const [files, setFiles] = useState<FileMeta[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<Error | null>(null)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [content, setContent] = useState<string | null>(null)
  const [isContentLoading, setIsContentLoading] = useState(false)
  const [contentError, setContentError] = useState<Error | null>(null)

  const [remote, setRemote] = useState<{
    text: string | null
    error: Error | null
    origin: FileChangeOrigin | undefined
    renamedTo?: string
  } | null>(null)
  const remoteRef = useRef<typeof remote>(null)
  remoteRef.current = remote
  const acceptedRemote = useRef<typeof remote>(null)
  const [deletedOnDisk, setDeletedOnDisk] = useState(false)
  const [draft, setDraft] = useState<string | null>(null)
  const [contentRevision, setContentRevision] = useState(0)
  const writing = useRef<{ projectId: string; path: string; text: string } | null>(null)
  const localRemoving = useRef<{ projectId: string; paths: Set<string> } | null>(null)
  const pendingFileChange = useMemo(() => {
    const diskText = deletedOnDisk ? null : content
    if (
      !remote ||
      (!deletedOnDisk && content === null) ||
      draft === null ||
      (!deletedOnDisk && draft === content) ||
      remote.text === diskText
    )
      return null
    const change = classifyPendingFileChange(
      deletedOnDisk ? '' : (content ?? ''),
      draft,
      remote.text,
    )
    const withRename = remote.renamedTo ? { ...change, renamedTo: remote.renamedTo } : change
    return remote.origin ? { ...withRename, origin: remote.origin } : withRename
  }, [remote, content, deletedOnDisk, draft])
  const reportFileDraft = useCallback(
    (path: string, next: string | null) => {
      if (path === selectedPath) setDraft(next)
    },
    [selectedPath],
  )

  // A clean editor follows the disk. A dirty editor keeps its original base
  // and receives the latest remote head separately, without a loading flash.
  useEffect(() => {
    if (!remote || pendingFileChange) return
    if (deletedOnDisk && draft !== null && remote.text === null) {
      setRemote(null)
      return
    }
    setDeletedOnDisk(false)
    setContent(remote.text)
    setContentError(remote.error)
    setRemote(null)
  }, [remote, pendingFileChange, deletedOnDisk, draft])

  // AbortController per refresh: project switch (or StrictMode's double-
  // invoke of the load effect) aborts the previous request so it can't
  // hold a browser connection slot or land on stale state.
  const abortRef = useRef<AbortController | null>(null)
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
      if (gen !== refreshGenRef.current) return
      setFiles([])
      setIsLoaded(true)
      setLoadError(null)
      clearTimeout(timeoutId)
      return
    }
    const cached = filesCache.get(reqProjectId)
    try {
      const res = await getAllFileStats({
        path: { projectId: reqProjectId },
        headers: cached?.etag ? { 'If-None-Match': cached.etag } : undefined,
        signal: controller.signal,
        validateStatus: acceptOkOr304,
        throwOnError: true,
      })
      if (gen !== refreshGenRef.current || controller.signal.aborted) return
      if (res.status !== 304) {
        const data = (res.data ?? []) as FileMeta[]
        const etag = readEtagHeader(res.headers)
        setFiles(data)
        filesCache.set(reqProjectId, data, etag)
      }
      setLoadError(null)
    } catch (err) {
      if (controller.signal.aborted) return
      if (gen !== refreshGenRef.current) return
      setLoadError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      clearTimeout(timeoutId)
      if (gen === refreshGenRef.current && !controller.signal.aborted) {
        setIsLoaded(true)
      }
    }
  }, [projectId])

  // On project switch, hydrate the file list from cache if available so
  // the file tree renders without a spinner; selectedPath / content are
  // cleared (they're tab-local state, not project-cacheable).
  useEffect(() => {
    setSelectedPath(null)
    setContent(null)
    setDeletedOnDisk(false)
    setLoadError(null)
    setContentError(null)
    if (!projectId) {
      setFiles([])
      setIsLoaded(true)
    } else {
      const cached = filesCache.get(projectId)
      if (cached) {
        setFiles(cached.data)
        setIsLoaded(true)
      } else {
        setFiles([])
        setIsLoaded(false)
      }
    }
    const cancel = afterPrimaryLoads(() => void refresh())
    return () => {
      cancel()
      abortRef.current?.abort()
    }
  }, [projectId, refresh])

  const paths = useMemo<string[]>(
    () => files.map((f) => f.relativePath ?? f.absolutePath).filter(Boolean) as string[],
    [files],
  )

  // Coalesce a burst of `files:changed` events (e.g. an agent writing many
  // files in quick succession) into a single refresh so the list doesn't
  // refetch per event.
  const refreshDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const unsub = ws.on('files:changed', (data: unknown) => {
      if (!wsEventConcernsProject(data, projectId)) return
      if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current)
      refreshDebounceRef.current = setTimeout(() => {
        refreshDebounceRef.current = null
        void refresh()
      }, FILES_CHANGED_DEBOUNCE_MS)
    })
    return () => {
      unsub()
      if (refreshDebounceRef.current) {
        clearTimeout(refreshDebounceRef.current)
        refreshDebounceRef.current = null
      }
    }
  }, [ws, refresh, projectId])

  const selection = useMemo(() => ({ projectId, selectedPath }), [projectId, selectedPath])
  type Check = {
    selection: typeof selection
    origin: FileChangeOrigin | undefined
    renamedTo?: string
  }
  const latestCheck = useRef<Check | null>(null)
  const [requestedCheck, setRequestedCheck] = useState<Check | null>(null)
  const [checked, setChecked] = useState<Check | null>(null)
  const [failedCheck, setFailedCheck] = useState<Check | null>(null)
  const unchecked = requestedCheck?.selection === selection && requestedCheck !== checked
  const fileChangeCheckFailed = unchecked && requestedCheck === failedCheck
  const isCheckingFileChange = unchecked && !fileChangeCheckFailed
  const requestFileChangeCheck = useCallback(
    (origin: FileChangeOrigin | undefined, renamedTo?: string) => {
      const prior = latestCheck.current?.selection === selection ? latestCheck.current : null
      const check: Check = {
        selection,
        origin: origin ?? prior?.origin,
        ...(renamedTo ? { renamedTo } : {}),
      }
      latestCheck.current = check
      setRequestedCheck(check)
    },
    [selection],
  )
  const retryFileChangeCheck = useCallback(() => {
    if (fileChangeCheckFailed && failedCheck && latestCheck.current === failedCheck) {
      requestFileChangeCheck(failedCheck.origin, failedCheck.renamedTo)
    }
  }, [fileChangeCheckFailed, failedCheck, requestFileChangeCheck])
  const hasUncheckedFileChange = useCallback(() => {
    return latestCheck.current?.selection === selection && latestCheck.current !== checked
  }, [selection, checked])

  useEffect(() => {
    if (!selectedPath) return
    return ws.on('files:changed', (data: unknown) => {
      if (!wsEventConcernsProject(data, projectId)) return
      const removing = localRemoving.current
      if (removing && removing.projectId === projectId && removing.paths.has(selectedPath)) return
      const priorTarget =
        (latestCheck.current?.selection === selection
          ? latestCheck.current.renamedTo
          : undefined) ?? remoteRef.current?.renamedTo
      const directRename = fileChangeRenamedTo(data, selectedPath)
      const chainedRename = priorTarget ? fileChangeRenamedTo(data, priorTarget) : undefined
      const targetDeleted = priorTarget ? fileChangeDeletedPath(data, priorTarget) : false
      if (
        !fileChangeConcernsPath(data, selectedPath) &&
        chainedRename === undefined &&
        !targetDeleted
      ) {
        return
      }
      const nextRenamedTo =
        directRename !== undefined
          ? directRename
          : chainedRename !== undefined
            ? chainedRename === selectedPath
              ? undefined
              : chainedRename
            : targetDeleted
              ? undefined
              : priorTarget
      requestFileChangeCheck(fileChangeOriginOf(data), nextRenamedTo)
    })
  }, [ws, projectId, selectedPath, selection, requestFileChangeCheck])
  const loadedSelection = useRef<typeof selection | null>(null)
  const acceptFileChangeBase = useCallback<FilesContextValue['acceptFileChangeBase']>(
    (change, choice) => {
      if (
        loadedSelection.current !== selection ||
        hasUncheckedFileChange() ||
        !remote ||
        remote === acceptedRemote.current ||
        pendingFileChange !== change
      ) {
        return false
      }
      acceptedRemote.current = remote
      setContentError(null)
      setRemote(null)
      if (change.kind === 'deleted') {
        if (choice === 'keep') {
          setDeletedOnDisk(true)
          setContent('')
        } else {
          setDeletedOnDisk(false)
          setContent(null)
          setDraft(null)
          setSelectedPath(null)
        }
        return true
      }
      setDeletedOnDisk(false)
      setContent(change.remote)
      if (choice === 'take') setDraft(null)
      return true
    },
    [selection, hasUncheckedFileChange, remote, pendingFileChange],
  )
  useEffect(() => {
    setContent(null)
    setContentError(null)
    setRemote(null)
    setDeletedOnDisk(false)
    setDraft(null)
    setIsContentLoading(false)
    return () => {
      loadedSelection.current = null
    }
  }, [selection])
  useEffect(() => {
    if (!projectId || !selectedPath) {
      return
    }
    // Images / PDFs / unknown binaries go through the raw-bytes endpoint
    // (consumers fetch a blob URL). Skip the text read so we don't surface
    // a decode error in the FilePane's text branch for binary clicks.
    const kind = classifyFileByExtension(selectedPath)
    if (kind !== 'markdown' && kind !== 'html' && kind !== 'text') {
      return
    }
    let cancelled = false
    const check = requestedCheck?.selection === selection ? requestedCheck : null
    const isStale = () =>
      cancelled || (latestCheck.current?.selection === selection && latestCheck.current !== check)
    const initial = loadedSelection.current !== selection
    if (initial) setIsContentLoading(true)
    const controller = new AbortController()
    readFile({
      path: { projectId },
      body: { path: selectedPath },
      signal: controller.signal,
      throwOnError: true,
    })
      .then(({ data }) => {
        if (isStale()) return
        const ownWrite = writing.current
        if (
          ownWrite?.projectId === projectId &&
          ownWrite.path === selectedPath &&
          ownWrite.text === data.content
        )
          return
        loadedSelection.current = selection
        if (initial) {
          setDeletedOnDisk(false)
          setContent(data.content)
          setContentError(null)
        } else {
          setRemote((prev) => {
            const nextOrigin = check?.origin ?? prev?.origin
            const nextRenamedTo = check ? check.renamedTo : prev?.renamedTo
            if (
              prev &&
              prev.text === data.content &&
              prev.error === null &&
              prev.renamedTo === nextRenamedTo &&
              sameOrigin(prev.origin, nextOrigin)
            ) {
              return prev
            }
            return {
              text: data.content,
              error: null,
              origin: nextOrigin,
              ...(nextRenamedTo ? { renamedTo: nextRenamedTo } : {}),
            }
          })
        }
        if (check) setChecked(check)
      })
      .catch((err: unknown) => {
        if (isStale()) return
        const error = err instanceof Error ? err : new Error(String(err))
        const missing = errorStatus(err) === 404
        if (initial) setContentError(error)
        else if (missing) {
          setRemote((prev) => {
            const nextOrigin = check?.origin ?? prev?.origin
            const nextRenamedTo = check?.renamedTo
            if (
              prev &&
              prev.text === null &&
              prev.renamedTo === nextRenamedTo &&
              sameOrigin(prev.origin, nextOrigin)
            ) {
              return prev
            }
            return {
              text: null,
              error,
              origin: nextOrigin,
              ...(nextRenamedTo ? { renamedTo: nextRenamedTo } : {}),
            }
          })
        }
        // A failed read does not establish that it is safe to write.
        if (check) {
          if (missing) setChecked(check)
          else setFailedCheck(check)
        }
      })
      .finally(() => {
        if (!cancelled) setIsContentLoading(false)
      })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [projectId, selectedPath, selection, contentRevision, requestedCheck])

  const requireProject = useCallback(() => {
    if (!projectId) throw new Error('No active project — cannot perform file operation')
    return projectId
  }, [projectId])

  const writeFileImpl = useCallback(
    async (path: string, next: string): Promise<string> => {
      const id = requireProject()
      const operation = { projectId: id, path, text: next }
      writing.current = operation
      try {
        const { data } = await writeFile({
          path: { projectId: id },
          body: { path, content: next },
          throwOnError: true,
        })
        if (loadedSelection.current === selection && selectedPath === path) {
          setDeletedOnDisk(false)
          setContent(next)
          setRemote(null)
        }
        await refresh()
        return data.diff
      } finally {
        if (writing.current === operation) writing.current = null
        if (loadedSelection.current === selection && selectedPath === path) {
          setContentRevision((revision) => revision + 1)
        }
      }
    },
    [requireProject, refresh, selectedPath, selection],
  )

  const uploadFileImpl = useCallback<FilesContextValue['uploadFile']>(
    async (name, body) => {
      const id = requireProject()
      const { data } = await uploadFile({
        path: { projectId: id },
        body: { name, ...body },
        throwOnError: true,
      })
      await refresh()
      return data.path
    },
    [requireProject, refresh],
  )

  const deleteFilesImpl = useCallback(
    async (toDelete: string[]) => {
      const id = requireProject()
      const op = { projectId: id, paths: new Set(toDelete) }
      localRemoving.current = op
      try {
        await deleteFiles({
          path: { projectId: id },
          body: { paths: toDelete },
          throwOnError: true,
        })
        if (selectedPath && toDelete.includes(selectedPath)) setSelectedPath(null)
        await refresh()
      } finally {
        if (localRemoving.current === op) localRemoving.current = null
      }
    },
    [requireProject, refresh, selectedPath],
  )

  const renameFileImpl = useCallback(
    async (from: string, to: string) => {
      const id = requireProject()
      const op = { projectId: id, paths: new Set([from]) }
      localRemoving.current = op
      try {
        await renameFiles({
          path: { projectId: id },
          body: { moves: [{ src: from, dst: to }] },
          throwOnError: true,
        })
        if (selectedPath === from) setSelectedPath(to)
        await refresh()
      } finally {
        if (localRemoving.current === op) localRemoving.current = null
      }
    },
    [requireProject, refresh, selectedPath],
  )

  // Folder ops are synthesised from the file list: the backend speaks in
  // files, so a folder rename moves every nested file and a folder delete
  // removes them all. (Empty directories carry no files and so aren't
  // affected — they aren't part of the file-list model.)
  const deleteFolderImpl = useCallback(
    async (dir: string) => {
      const prefix = `${dir.replace(/\/+$/, '')}/`
      const underFolder = paths.filter((p) => p.startsWith(prefix))
      if (underFolder.length === 0) return
      await deleteFilesImpl(underFolder)
    },
    [paths, deleteFilesImpl],
  )

  const renameFolderImpl = useCallback(
    async (fromDir: string, toDir: string) => {
      const id = requireProject()
      const fromPrefix = `${fromDir.replace(/\/+$/, '')}/`
      const toBase = toDir.replace(/\/+$/, '')
      const moves = paths
        .filter((p) => p.startsWith(fromPrefix))
        .map((p) => ({ src: p, dst: `${toBase}/${p.slice(fromPrefix.length)}` }))
      if (moves.length === 0) return
      const op = { projectId: id, paths: new Set(moves.map((m) => m.src)) }
      localRemoving.current = op
      try {
        await renameFiles({
          path: { projectId: id },
          body: { moves },
          throwOnError: true,
        })
        if (selectedPath?.startsWith(fromPrefix)) {
          setSelectedPath(`${toBase}/${selectedPath.slice(fromPrefix.length)}`)
        }
        await refresh()
      } finally {
        if (localRemoving.current === op) localRemoving.current = null
      }
    },
    [paths, requireProject, refresh, selectedPath],
  )

  const readPathsImpl = useCallback<FilesContextValue['readPaths']>(
    async (pathsToRead, opts) => {
      const id = requireProject()
      const { data } = await readFilePaths({
        path: { projectId: id },
        body: {
          paths: pathsToRead,
          ...(opts?.lineNumbers ? { lineNumbers: true } : {}),
        },
        throwOnError: true,
      })
      return data
    },
    [requireProject],
  )

  const value = useMemo<FilesContextValue>(
    () => ({
      isLoaded,
      loadError,
      paths,
      files,
      selectedPath,
      content,
      isContentLoading,
      contentError,
      pendingFileChange,
      isDeletedOnDisk: deletedOnDisk,
      acceptFileChangeBase,
      isCheckingFileChange,
      fileChangeCheckFailed,
      retryFileChangeCheck,
      hasUncheckedFileChange,
      reportFileDraft,
      selectFile: setSelectedPath,
      writeFile: writeFileImpl,
      uploadFile: uploadFileImpl,
      deleteFiles: deleteFilesImpl,
      renameFile: renameFileImpl,
      renameFolder: renameFolderImpl,
      deleteFolder: deleteFolderImpl,
      readPaths: readPathsImpl,
      refresh,
    }),
    [
      isLoaded,
      loadError,
      paths,
      files,
      selectedPath,
      content,
      isContentLoading,
      contentError,
      pendingFileChange,
      deletedOnDisk,
      acceptFileChangeBase,
      isCheckingFileChange,
      fileChangeCheckFailed,
      retryFileChangeCheck,
      hasUncheckedFileChange,
      reportFileDraft,
      writeFileImpl,
      uploadFileImpl,
      deleteFilesImpl,
      renameFileImpl,
      renameFolderImpl,
      deleteFolderImpl,
      readPathsImpl,
      refresh,
    ],
  )

  return <FilesContext.Provider value={value}>{children}</FilesContext.Provider>
}

export function useOptionalFiles(): FilesContextValue | null {
  return useContext(FilesContext)
}

export function useFiles(): FilesContextValue {
  const ctx = useContext(FilesContext)
  if (!ctx) throw new Error('useFiles must be used within FilesProvider')
  return ctx
}
