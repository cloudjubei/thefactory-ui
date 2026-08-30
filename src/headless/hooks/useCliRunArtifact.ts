import { useCallback, useEffect, useRef, useState } from 'react'
import {
  applyCliAgentArtifact,
  getCliAgentRun,
  getGitBranchDiffSummary,
  mergeCliRunReview,
  previewCliAgentArtifact,
  rejectCliRunReview,
  verifyCliRunReview,
  type ApplyCliAgentArtifactResult,
  type CliRun,
  type CliRunLandFailure,
  type CliRunReview,
  type CliRunStatus,
  type CliRunTranscriptEntry,
  type CliRunVerdict,
  type FilesEmittedArtifact,
  type FilesEmittedPreview,
  type GitDiffSummary,
  type GitMergeResult,
  type RunVerification,
} from '../api/generated'
import { useApi } from '../api/ApiContext'
import { appendCliRunTranscript, mergeCliRunTranscript } from '../utils/cliRunActivity'
import { CLI_TRANSCRIPT_FLUSH_MS } from '../utils/cliRunActivityConstants'
import { cliRunTranscripts } from '../utils/cliRunTranscriptCache'
import { filesEmittedArtifactOf } from '../utils/cliRunner'
import { asRunVerification } from '../utils/runReview'

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
  /**
   * The run's verification evidence (compile / tests / command checks) stamped
   * by the backend, once it has run. `undefined` means "not verified yet" — the
   * panel offers a Re-run checks affordance either way.
   */
  verification: RunVerification | undefined
  /**
   * The recorded review decision. Present ⇒ the review is over; the panel shows
   * the verdict instead of the approve / request-changes / reject row.
   */
  verdict: CliRunVerdict | undefined
  /**
   * Set when the run produced changes that could NOT be landed on a review
   * branch (no git repo, detached HEAD, failed commit). The changes exist but
   * are not reviewable — the panel warns explicitly.
   */
  landFailure: CliRunLandFailure | undefined
  /**
   * Epoch ms the run record was created, once loaded. The live view measures
   * elapsed time from here rather than from mount, so a page opened mid-run
   * reports how long the agent has ACTUALLY been going.
   */
  startedAtMs: number | undefined
  /** The run's billed cost, when the runner reported one. */
  costUSD: number | undefined
  /** The run's wall-clock duration, when the runner reported one. */
  durationMs: number | undefined
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
  /**
   * Approve & merge: merge the run branch into the current working branch. The
   * optional note is recorded with the approval. When the project's
   * verification policy is `require` and checks have not passed, the backend
   * refuses and answers `{ ok: false, aborted: true, message }` — surfaced via
   * `mergeResult`, not thrown.
   */
  merge: (note?: string) => Promise<void>
  /** True while a merge is in flight. */
  merging: boolean
  /** Result of the last merge (ok / conflicts / mergeCommit), once attempted. */
  mergeResult: GitMergeResult | undefined
  /** Re-run the project's verification checks against the run's changes. */
  verify: () => Promise<void>
  /** True while verification is running. */
  verifying: boolean
  /** Reject the run outright, recording the (required) reason. */
  reject: (reason: string) => Promise<void>
  /** True while a rejection is in flight. */
  rejecting: boolean
  /** Send the run back for changes, recording the (required) reason. */
  requestChanges: (reason: string) => Promise<void>
  /** True while a change request is in flight. */
  requestingChanges: boolean
  /** Last fetch/preview/apply/merge/verify/decision failure, for inline display. */
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
  const [verification, setVerification] = useState<RunVerification | undefined>(undefined)
  const [verdict, setVerdict] = useState<CliRunVerdict | undefined>(undefined)
  const [landFailure, setLandFailure] = useState<CliRunLandFailure | undefined>(undefined)
  const [startedAtMs, setStartedAtMs] = useState<number | undefined>(undefined)
  const [costUSD, setCostUSD] = useState<number | undefined>(undefined)
  const [durationMs, setDurationMs] = useState<number | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<FilesEmittedPreview | undefined>(undefined)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [applyResult, setApplyResult] = useState<ApplyCliAgentArtifactResult | undefined>(undefined)
  const [reviewDiff, setReviewDiff] = useState<GitDiffSummary | undefined>(undefined)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [merging, setMerging] = useState(false)
  const [mergeResult, setMergeResult] = useState<GitMergeResult | undefined>(undefined)
  const [verifying, setVerifying] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [requestingChanges, setRequestingChanges] = useState(false)
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
  // Mirror of the rendered transcript, so the record fetch and the live stream
  // can both reconcile against the CURRENT value without reading through a
  // setState updater (which StrictMode double-invokes).
  const transcriptRef = useRef<CliRunTranscriptEntry[]>([])
  // Entries received since the last commit. A verbose turn streams far faster
  // than anyone can read; committing per entry re-derives the whole message list
  // each time, so they are batched onto one tick.
  const pendingEntriesRef = useRef<CliRunTranscriptEntry[]>([])
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  // A just-started run returns its runId (fast-return 202) BEFORE the run record
  // is written to disk, so the first `getCliAgentRun` can 404. That's "not ready
  // yet", not a failure — retry a few times instead of surfacing an error. The
  // live transcript still streams over the WS in the meantime.
  const notReadyRetriesRef = useRef(0)

  const commitTranscript = useCallback(
    (next: CliRunTranscriptEntry[]) => {
      if (next === transcriptRef.current) return
      transcriptRef.current = next
      // Remember it against the run id: this view is remounted on the
      // live→persisted handoff and on every navigation away and back, and the
      // record alone cannot restore a mid-run transcript.
      if (runId) cliRunTranscripts.set(runId, next)
      setTranscript(next)
    },
    [runId],
  )

  const flushPendingEntries = useCallback(() => {
    // Cancel the scheduled tick too: the terminal handler flushes early, and a
    // leftover timer would schedule a second flush against an empty buffer.
    if (flushTimerRef.current !== undefined) {
      clearTimeout(flushTimerRef.current)
      flushTimerRef.current = undefined
    }
    const batch = pendingEntriesRef.current
    if (batch.length === 0) return
    pendingEntriesRef.current = []
    commitTranscript(appendCliRunTranscript(transcriptRef.current, batch))
  }, [commitTranscript])

  const applyRunRecord = useCallback(
    (run: CliRun) => {
      setArtifact(filesEmittedArtifactOf(run.artifacts))
      // The record can legitimately hold FEWER entries than the live stream has
      // already delivered — the resident runner persists its transcript only at
      // the terminal write — so the record must never be allowed to shrink what
      // the user is watching.
      commitTranscript(mergeCliRunTranscript(transcriptRef.current, run.transcript ?? []))
      setStatus(run.status)
      setReview(run.review ?? undefined)
      setVerification(run.verification ?? undefined)
      setVerdict(run.verdict ?? undefined)
      setLandFailure(run.landFailure ?? undefined)
      setStartedAtMs(run.createdAt)
      setCostUSD(run.costUSD ?? undefined)
      setDurationMs(run.durationMs ?? undefined)
    },
    [commitTranscript],
  )

  // Reset on a CHANGE OF RUN only. A refetch (`fetchNonce`) must not wipe the
  // live transcript: while the record is still being written the retry fires
  // every 800ms, and resetting there threw away every entry streamed in between.
  useEffect(() => {
    epochRef.current += 1
    notReadyRetriesRef.current = 0
    pendingEntriesRef.current = []
    // Rehydrate from what an earlier mount of this same run streamed. The live
    // block hands over to the persisted row mid-turn and a navigation tears the
    // view down entirely; the record cannot restore a mid-run transcript, so
    // without this every step already watched would disappear.
    const remembered = runId ? cliRunTranscripts.get(runId) : undefined
    transcriptRef.current = remembered ?? []
    setArtifact(undefined)
    setTranscript(remembered ?? [])
    setStatus(undefined)
    setReview(undefined)
    setVerification(undefined)
    setVerdict(undefined)
    setLandFailure(undefined)
    setStartedAtMs(undefined)
    setCostUSD(undefined)
    setDurationMs(undefined)
    setPreview(undefined)
    setApplyResult(undefined)
    setReviewDiff(undefined)
    setMergeResult(undefined)
    setError(undefined)
    setNotReady(false)
    setLoading(false)
  }, [runId])

  useEffect(() => {
    if (!runId) return
    const epoch = epochRef.current
    setLoading(true)
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    void getCliAgentRun({ path: { runId }, throwOnError: true })
      .then(({ data }) => {
        if (epoch !== epochRef.current) return
        setNotReady(false)
        applyRunRecord(data)
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
  }, [runId, fetchNonce, applyRunRecord])

  // Live transcript: buffer entries as the run streams them and commit them on
  // one short tick, so a burst of tool calls costs one render, not twenty.
  // Filtered by runId (the effect re-subscribes when runId changes) and
  // monotonic on `at` to drop load-race re-sends. On terminal, refetch once to
  // reconcile to the canonical record (and surface the final artifact + review).
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
        pendingEntriesRef.current.push(d.event.entry)
        if (flushTimerRef.current === undefined) {
          flushTimerRef.current = setTimeout(flushPendingEntries, CLI_TRANSCRIPT_FLUSH_MS)
        }
      } else if (d.type === 'statusChanged' && d.event?.to) {
        setStatus(d.event.to)
      } else if (d.type === 'reviewUpdated') {
        // Verification stamped, a verdict recorded, or a landing failure
        // surfaced — the run record is the source of truth for all three.
        setFetchNonce((n) => n + 1)
      } else if (d.type === 'finished' || d.type === 'error') {
        // Land whatever is still buffered before the canonical record arrives,
        // so the final reconcile compares against everything that streamed.
        flushPendingEntries()
        const epoch = epochRef.current
        void getCliAgentRun({ path: { runId }, throwOnError: true })
          .then(({ data: run }) => {
            if (epoch !== epochRef.current) return
            applyRunRecord(run)
          })
          .catch(() => {})
      }
    })
    return () => {
      off()
      if (flushTimerRef.current !== undefined) {
        clearTimeout(flushTimerRef.current)
        flushTimerRef.current = undefined
      }
    }
  }, [runId, ws, applyRunRecord, flushPendingEntries])

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
        body: {
          baseRef: review.baseSha,
          headRef: review.headSha ?? review.branch,
          includePatch: true,
        },
        throwOnError: true,
      })
      if (epoch === epochRef.current) setReviewDiff(data)
    } catch (err: unknown) {
      if (epoch === epochRef.current) setError(err instanceof Error ? err.message : String(err))
    } finally {
      setReviewLoading(false)
    }
  }, [projectId, review])

  const merge = useCallback(
    async (note?: string) => {
      if (!runId || !projectId || !review) return
      const epoch = epochRef.current
      setMerging(true)
      setError(undefined)
      try {
        // Dedicated route: merges the run branch into the working branch, stamps
        // review.mergedAt durably, and broadcasts a git+files refresh. A policy
        // refusal answers `{ ok: false, aborted: true }` rather than throwing.
        const { data } = await mergeCliRunReview({
          path: { runId },
          body: { projectId, reason: note },
          throwOnError: true,
        })
        if (epoch === epochRef.current) setMergeResult(data)
      } catch (err: unknown) {
        if (epoch === epochRef.current) setError(err instanceof Error ? err.message : String(err))
      } finally {
        setMerging(false)
      }
    },
    [runId, projectId, review],
  )

  const verify = useCallback(async () => {
    if (!runId || !projectId) return
    const epoch = epochRef.current
    setVerifying(true)
    setError(undefined)
    try {
      const { data } = await verifyCliRunReview({
        path: { runId },
        body: { projectId },
        throwOnError: true,
      })
      if (epoch === epochRef.current) setVerification(asRunVerification(data))
    } catch (err: unknown) {
      if (epoch === epochRef.current) setError(err instanceof Error ? err.message : String(err))
    } finally {
      setVerifying(false)
    }
  }, [runId, projectId])

  const decide = useCallback(
    async (decision: 'rejected' | 'changes-requested', reason: string) => {
      if (!runId || !projectId) return
      const setBusy = decision === 'rejected' ? setRejecting : setRequestingChanges
      const epoch = epochRef.current
      setBusy(true)
      setError(undefined)
      try {
        const { data } = await rejectCliRunReview({
          path: { runId },
          body: { projectId, reason, decision },
          throwOnError: true,
        })
        if (epoch === epochRef.current) {
          setVerdict(data.verdict ?? undefined)
          setReview(data.review ?? undefined)
          setVerification(data.verification ?? undefined)
          setLandFailure(data.landFailure ?? undefined)
        }
      } catch (err: unknown) {
        if (epoch === epochRef.current) setError(err instanceof Error ? err.message : String(err))
      } finally {
        setBusy(false)
      }
    },
    [runId, projectId],
  )

  const reject = useCallback((reason: string) => decide('rejected', reason), [decide])
  const requestChanges = useCallback(
    (reason: string) => decide('changes-requested', reason),
    [decide],
  )

  return {
    artifact,
    transcript,
    status,
    review,
    verification,
    verdict,
    landFailure,
    startedAtMs,
    costUSD,
    durationMs,
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
    verify,
    verifying,
    reject,
    rejecting,
    requestChanges,
    requestingChanges,
    error,
  }
}
