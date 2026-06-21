import { useCallback, useEffect, useRef, useState } from 'react'
import {
  applyCliAgentArtifact,
  getCliAgentRun,
  getGitBranchDiffSummary,
  mergeCliRunReview,
  previewCliAgentArtifact,
  type ApplyCliAgentArtifactResult,
  type CliRunReview,
  type CliRunStatus,
  type CliRunTranscriptEntry,
  type FilesEmittedArtifact,
  type FilesEmittedPreview,
  type GitDiffSummary,
  type GitMergeResult,
} from '../api/generated'
import { useApi } from '../api/ApiContext'
import { filesEmittedArtifactOf } from '../utils/cliRunner'

// How long to keep retrying a 404 while a just-started run's record is still
// being written (≈ container auth/workspace prep before the first writeRun).
const CLI_RUN_NOT_READY_RETRY_MS = 800
const CLI_RUN_NOT_READY_MAX_RETRIES = 10

/**
 * Whether an API error is a 404 — i.e. the run record doesn't exist YET (a
 * fast-return run whose record hasn't been written to disk), as opposed to a
 * genuine failure. Handles the axios-shaped error the generated client throws
 * (`response.status` / `status`) plus a message fallback.
 */
function isNotReadyError(err: unknown): boolean {
  const e = err as { status?: number; response?: { status?: number }; message?: unknown }
  if (e?.response?.status === 404 || e?.status === 404) return true
  return typeof e?.message === 'string' && /\b404\b/.test(e.message)
}

export type UseCliRunArtifact = {
  /** The run's files-emitted artifact (the agent's workspace diff), once loaded. */
  artifact: FilesEmittedArtifact | undefined
  /**
   * The run's full step-by-step transcript (assistant text, tool calls, tool
   * results, protocol events) for inspecting exactly what the agent did between
   * the prompt and the final diff. Empty until the run record loads.
   */
  transcript: CliRunTranscriptEntry[]
  /**
   * The run's lifecycle status, kept live off `statusChanged` events. Drives the
   * transcript's "streaming" affordances (current step expanded + running timer)
   * while the run is active (`running` / `awaiting-approval` / `paused`).
   */
  status: CliRunStatus | undefined
  /**
   * Branch-landing state when the run was committed to a per-run branch (git
   * projects). When present the panel is in PR-review mode (review the branch
   * diff + Sign off & merge); when absent it's the no-git direct-apply path.
   */
  review: CliRunReview | undefined
  /** True while the run record is being fetched. */
  loading: boolean
  /**
   * True when the run record doesn't exist on disk yet — a just-started run
   * still booting its sandbox (the record is written after auth/workspace prep).
   * The run view shows a "Preparing…" indicator while this holds, so the long
   * container spin-up isn't a blank gap before any status exists.
   */
  notReady: boolean
  /** Per-file diff preview against the project's current checkout (no-git path), once loaded. */
  preview: FilesEmittedPreview | undefined
  /** True while the preview is being computed server-side. */
  previewLoading: boolean
  /** Fetch (or refresh) the diff preview. Clears a prior error, enabling retry. */
  loadPreview: () => Promise<void>
  /** Re-fetch the run record (retry after a failed load). */
  reload: () => void
  /** Apply the artifact onto the project checkout (no-git path). */
  apply: () => Promise<void>
  /** True while an apply is in flight. */
  applying: boolean
  /** Result of the last apply (added/modified/deleted/errors), once applied. */
  applyResult: ApplyCliAgentArtifactResult | undefined
  /** The run branch's diff vs its base (review mode), once loaded. */
  reviewDiff: GitDiffSummary | undefined
  /** True while the branch diff is being fetched. */
  reviewLoading: boolean
  /** Fetch (or refresh) the run-branch diff. */
  loadReviewDiff: () => Promise<void>
  /** Sign off: merge the run branch into the current working branch. */
  merge: () => Promise<void>
  /** True while a merge is in flight. */
  merging: boolean
  /** Result of the last merge (ok / conflicts / mergeCommit), once attempted. */
  mergeResult: GitMergeResult | undefined
  /** Last fetch/preview/apply/merge failure, for inline display. */
  error: string | undefined
}

/**
 * The chat-side surface for a CLI run's changes. Two modes off the loaded run:
 * - **Review (git projects):** the run was landed on a per-run branch
 *   (`run.review`); render the branch-vs-base diff and Sign off & merge.
 * - **Direct apply (no-git fallback):** no branch; render the files-emitted
 *   artifact preview and Apply onto the working tree.
 * Platform-agnostic — the web + native panels are thin renderings of this state.
 */
export function useCliRunArtifact(
  runId: string | undefined,
  projectId: string | undefined,
): UseCliRunArtifact {
  const [artifact, setArtifact] = useState<FilesEmittedArtifact | undefined>(undefined)
  const [transcript, setTranscript] = useState<CliRunTranscriptEntry[]>([])
  const [status, setStatus] = useState<CliRunStatus | undefined>(undefined)
  const [review, setReview] = useState<CliRunReview | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<FilesEmittedPreview | undefined>(undefined)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [applyResult, setApplyResult] = useState<ApplyCliAgentArtifactResult | undefined>(undefined)
  const [reviewDiff, setReviewDiff] = useState<GitDiffSummary | undefined>(undefined)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [merging, setMerging] = useState(false)
  const [mergeResult, setMergeResult] = useState<GitMergeResult | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)
  // True while the run record doesn't exist on disk yet (a just-started run
  // whose record is being written): the run is booting. Distinct from a loaded
  // `running` status and from a terminal status — lets the run view show
  // "Preparing…" during the container spin-up window before any status exists.
  const [notReady, setNotReady] = useState(false)
  const [fetchNonce, setFetchNonce] = useState(0)
  const { ws } = useApi()
  // Bumped whenever the target run changes; in-flight responses from a prior
  // epoch are discarded so a remounted-in-place panel never shows another run's
  // diff or result.
  const epochRef = useRef(0)
  // Highest transcript-entry timestamp surfaced so far; live appends older than
  // this (e.g. re-sent during the initial load race) are skipped.
  const lastAtRef = useRef(0)
  // A just-started run returns its runId (fast-return 202) BEFORE the run record
  // is written to disk, so the first `getCliAgentRun` can 404. That's "not ready
  // yet", not a failure — retry a few times instead of surfacing an error. The
  // live transcript still streams over the WS in the meantime.
  const notReadyRetriesRef = useRef(0)

  useEffect(() => {
    epochRef.current += 1
    lastAtRef.current = 0
    notReadyRetriesRef.current = 0
    setArtifact(undefined)
    setTranscript([])
    setStatus(undefined)
    setReview(undefined)
    setPreview(undefined)
    setApplyResult(undefined)
    setReviewDiff(undefined)
    setMergeResult(undefined)
    setError(undefined)
    setNotReady(false)
    setLoading(false)
    if (!runId) return
    const epoch = epochRef.current
    setLoading(true)
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    void getCliAgentRun({ path: { runId }, throwOnError: true })
      .then(({ data }) => {
        if (epoch !== epochRef.current) return
        setNotReady(false)
        setArtifact(filesEmittedArtifactOf(data.artifacts))
        const entries = data.transcript ?? []
        setTranscript(entries)
        lastAtRef.current = entries.reduce((m, e) => Math.max(m, e.at), lastAtRef.current)
        setStatus(data.status)
        setReview(data.review ?? undefined)
      })
      .catch((err: unknown) => {
        if (epoch !== epochRef.current) return
        // The run record may not be on disk yet (fast-return start race). Treat
        // a 404 as transient and retry quietly; only surface other failures.
        if (isNotReadyError(err) && notReadyRetriesRef.current < CLI_RUN_NOT_READY_MAX_RETRIES) {
          notReadyRetriesRef.current += 1
          setNotReady(true)
          retryTimer = setTimeout(() => setFetchNonce((n) => n + 1), CLI_RUN_NOT_READY_RETRY_MS)
          return
        }
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (epoch === epochRef.current) setLoading(false)
      })
    return () => {
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [runId, fetchNonce])

  // Live transcript: append entries as the run streams them. Filtered by runId
  // (the effect re-subscribes when runId changes), monotonic on `at` to drop
  // load-race re-sends. On terminal, refetch once to reconcile to the canonical
  // record (and surface the final artifact + review).
  useEffect(() => {
    if (!runId) return
    const off = ws.on('cli:run-update', (data: unknown) => {
      const d = data as {
        runId?: string
        type?: string
        event?: { entry?: CliRunTranscriptEntry; to?: CliRunStatus }
      }
      if (d.runId !== runId) return
      if (d.type === 'transcriptAppend' && d.event?.entry) {
        const entry = d.event.entry
        if (entry.at < lastAtRef.current) return
        lastAtRef.current = entry.at
        setTranscript((prev) => [...prev, entry])
      } else if (d.type === 'statusChanged' && d.event?.to) {
        setStatus(d.event.to)
      } else if (d.type === 'finished' || d.type === 'error') {
        void getCliAgentRun({ path: { runId }, throwOnError: true })
          .then(({ data: run }) => {
            setArtifact(filesEmittedArtifactOf(run.artifacts))
            const entries = run.transcript ?? []
            setTranscript(entries)
            lastAtRef.current = entries.reduce((m, e) => Math.max(m, e.at), 0)
            setStatus(run.status)
            setReview(run.review ?? undefined)
          })
          .catch(() => {})
      }
    })
    return () => off()
  }, [runId, ws])

  const reload = useCallback(() => setFetchNonce((n) => n + 1), [])

  const loadPreview = useCallback(async () => {
    if (!runId || !projectId || !artifact) return
    const epoch = epochRef.current
    setPreviewLoading(true)
    setError(undefined)
    try {
      const { data } = await previewCliAgentArtifact({
        path: { runId, artifactId: artifact.id },
        body: { projectId },
        throwOnError: true,
      })
      if (epoch === epochRef.current) setPreview(data)
    } catch (err: unknown) {
      if (epoch === epochRef.current) setError(err instanceof Error ? err.message : String(err))
    } finally {
      setPreviewLoading(false)
    }
  }, [runId, projectId, artifact])

  const apply = useCallback(async () => {
    if (!runId || !projectId || !artifact) return
    const epoch = epochRef.current
    setApplying(true)
    setError(undefined)
    try {
      const { data } = await applyCliAgentArtifact({
        path: { runId, artifactId: artifact.id },
        body: { projectId },
        throwOnError: true,
      })
      if (epoch === epochRef.current) setApplyResult(data)
    } catch (err: unknown) {
      if (epoch === epochRef.current) setError(err instanceof Error ? err.message : String(err))
    } finally {
      setApplying(false)
    }
  }, [runId, projectId, artifact])

  const loadReviewDiff = useCallback(async () => {
    if (!projectId || !review) return
    const epoch = epochRef.current
    setReviewLoading(true)
    setError(undefined)
    try {
      const { data } = await getGitBranchDiffSummary({
        path: { projectId },
        body: { baseRef: review.baseSha, headRef: review.headSha ?? review.branch, includePatch: true },
        throwOnError: true,
      })
      if (epoch === epochRef.current) setReviewDiff(data)
    } catch (err: unknown) {
      if (epoch === epochRef.current) setError(err instanceof Error ? err.message : String(err))
    } finally {
      setReviewLoading(false)
    }
  }, [projectId, review])

  const merge = useCallback(async () => {
    if (!runId || !projectId || !review) return
    const epoch = epochRef.current
    setMerging(true)
    setError(undefined)
    try {
      // Dedicated route: merges the run branch into the working branch, stamps
      // review.mergedAt durably, and broadcasts a git+files refresh.
      const { data } = await mergeCliRunReview({
        path: { runId },
        body: { projectId },
        throwOnError: true,
      })
      if (epoch === epochRef.current) setMergeResult(data)
    } catch (err: unknown) {
      if (epoch === epochRef.current) setError(err instanceof Error ? err.message : String(err))
    } finally {
      setMerging(false)
    }
  }, [runId, projectId, review])

  return {
    artifact,
    transcript,
    status,
    review,
    loading,
    notReady,
    preview,
    previewLoading,
    loadPreview,
    reload,
    apply,
    applying,
    applyResult,
    reviewDiff,
    reviewLoading,
    loadReviewDiff,
    merge,
    merging,
    mergeResult,
    error,
  }
}
