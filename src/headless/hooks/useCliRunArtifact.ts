import { useCallback, useEffect, useRef, useState } from 'react'
import {
  applyCliAgentArtifact,
  getCliAgentRun,
  getGitBranchDiffSummary,
  mergeCliRunReview,
  previewCliAgentArtifact,
  type ApplyCliAgentArtifactResult,
  type CliRunReview,
  type CliRunTranscriptEntry,
  type FilesEmittedArtifact,
  type FilesEmittedPreview,
  type GitDiffSummary,
  type GitMergeResult,
} from '../api/generated'
import { useApi } from '../api/ApiContext'
import { filesEmittedArtifactOf } from '../utils/cliRunner'

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
   * Branch-landing state when the run was committed to a per-run branch (git
   * projects). When present the panel is in PR-review mode (review the branch
   * diff + Sign off & merge); when absent it's the no-git direct-apply path.
   */
  review: CliRunReview | undefined
  /** True while the run record is being fetched. */
  loading: boolean
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
  const [fetchNonce, setFetchNonce] = useState(0)
  const { ws } = useApi()
  // Bumped whenever the target run changes; in-flight responses from a prior
  // epoch are discarded so a remounted-in-place panel never shows another run's
  // diff or result.
  const epochRef = useRef(0)
  // Highest transcript-entry timestamp surfaced so far; live appends older than
  // this (e.g. re-sent during the initial load race) are skipped.
  const lastAtRef = useRef(0)

  useEffect(() => {
    epochRef.current += 1
    lastAtRef.current = 0
    setArtifact(undefined)
    setTranscript([])
    setReview(undefined)
    setPreview(undefined)
    setApplyResult(undefined)
    setReviewDiff(undefined)
    setMergeResult(undefined)
    setError(undefined)
    setLoading(false)
    if (!runId) return
    const epoch = epochRef.current
    setLoading(true)
    void getCliAgentRun({ path: { runId }, throwOnError: true })
      .then(({ data }) => {
        if (epoch !== epochRef.current) return
        setArtifact(filesEmittedArtifactOf(data.artifacts))
        const entries = data.transcript ?? []
        setTranscript(entries)
        lastAtRef.current = entries.reduce((m, e) => Math.max(m, e.at), lastAtRef.current)
        setReview(data.review ?? undefined)
      })
      .catch((err: unknown) => {
        if (epoch === epochRef.current) setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (epoch === epochRef.current) setLoading(false)
      })
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
        event?: { entry?: CliRunTranscriptEntry }
      }
      if (d.runId !== runId) return
      if (d.type === 'transcriptAppend' && d.event?.entry) {
        const entry = d.event.entry
        if (entry.at < lastAtRef.current) return
        lastAtRef.current = entry.at
        setTranscript((prev) => [...prev, entry])
      } else if (d.type === 'finished' || d.type === 'error') {
        void getCliAgentRun({ path: { runId }, throwOnError: true })
          .then(({ data: run }) => {
            setArtifact(filesEmittedArtifactOf(run.artifacts))
            const entries = run.transcript ?? []
            setTranscript(entries)
            lastAtRef.current = entries.reduce((m, e) => Math.max(m, e.at), 0)
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
    review,
    loading,
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
