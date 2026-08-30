import { useEffect, useState } from 'react'

import type { FilesEmittedFilePreview } from '../../../headless/api'
import {
  isReviewReasonValid,
  landFailureSummary,
  mergeNotice,
  reviewActionMode,
  reviewChangeCounts,
  runReviewFacts,
  verdictSummary,
  verificationCheckRows,
  verificationHeadline,
  useCliRunArtifact,
  type ReviewChangeCounts,
  type ReviewCheckRow,
  type ReviewTone,
  formatChangeRequestMessage,
} from '../../../headless'
import { Input } from '../../primitives/Input'
import { StructuredUnifiedDiff } from '../diff'

export type CliRunArtifactPanelProps = {
  /** The CLI run whose workspace diff to surface (from the message's `cliRunId`). */
  runId: string
  /** Project whose checkout the diff previews against + applies onto. */
  projectId: string
  /**
   * Sends a message into the chat this panel sits in.
   *
   * Wired so "Request changes" reaches the AGENT and not just the run record:
   * the notes are the whole point of the action, and a verdict nobody is told
   * about cannot produce the change the user asked for.
   */
  onSendMessage?: (text: string) => void | Promise<void>
}

const TONE_TEXT: Record<ReviewTone, string> = {
  positive: 'text-green-700 dark:text-green-400',
  warning: 'text-orange-700 dark:text-orange-400',
  danger: 'text-red-700 dark:text-red-400',
  neutral: 'text-(--text-secondary)',
}

const TONE_CHIP: Record<ReviewTone, string> = {
  positive: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  warning: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  danger: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  neutral: 'bg-(--surface-hover) text-(--text-secondary) border-(--border-subtle)',
}

function statusBadge(file: FilesEmittedFilePreview) {
  const map: Record<FilesEmittedFilePreview['status'], { label: string; cls: string }> = {
    added: { label: 'added', cls: 'text-(--color-green-700) dark:text-(--color-green-300)' },
    modified: {
      label: 'modified',
      cls: 'text-(--color-orange-700) dark:text-(--color-orange-300)',
    },
    deleted: { label: 'deleted', cls: 'text-(--color-red-700) dark:text-(--color-red-300)' },
  }
  const m = map[file.status]
  return <span className={`text-[11px] font-medium ${m.cls}`}>{m.label}</span>
}

const DANGER_TEXT = 'text-(--color-red-700) dark:text-(--color-red-300)'

const ACTION_BUTTON = 'shrink-0 px-3 py-1.5 rounded-md text-[13px] font-medium disabled:opacity-50'

/** Per-status file-count pills (added / modified / deleted), shown in the
 * always-visible summary head — mirrors the Git view's multi-file change
 * summary so the user sees the run's footprint without expanding. */
function FileCountChips({ counts }: { counts: ReviewChangeCounts }) {
  if (counts.total === 0) return null
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-medium leading-none">
      {counts.added > 0 ? (
        <span className="px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20">
          +{counts.added}
        </span>
      ) : null}
      {counts.modified > 0 ? (
        <span className="px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/20">
          ~{counts.modified}
        </span>
      ) : null}
      {counts.deleted > 0 ? (
        <span className="px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20">
          −{counts.deleted}
        </span>
      ) : null}
    </div>
  )
}

function CheckRow({ row }: { row: ReviewCheckRow }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start gap-2">
        <span
          className={`shrink-0 px-1.5 py-0.5 rounded-full border text-[10px] font-medium uppercase tracking-wide ${TONE_CHIP[row.tone]}`}
        >
          {row.status}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[12px] font-medium text-(--text-primary)">{row.label}</span>
            {row.optional ? (
              <span className="text-[11px] text-(--text-secondary)">optional</span>
            ) : null}
            {row.durationLabel ? (
              <span className="text-[11px] text-(--text-secondary)">{row.durationLabel}</span>
            ) : null}
          </div>
          <div className="text-[12px] text-(--text-secondary) break-words">{row.summary}</div>
          {row.details ? (
            <button
              type="button"
              className="mt-0.5 text-[11px] underline text-(--text-secondary)"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
            >
              {open ? 'Hide output' : 'Show output'}
            </button>
          ) : null}
          {open && row.details ? (
            <pre className="mt-1 max-h-60 overflow-auto rounded-md bg-(--surface-muted) p-2 text-[11px] font-mono whitespace-pre-wrap text-(--text-secondary)">
              {row.details}
            </pre>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/**
 * The chat-side surface for a CLI agent's workspace diff. Like a PR view: an
 * always-visible summary head (what changed, verification evidence, cost +
 * duration) sits above the diff, and a footer carries the review decision —
 * Approve & merge / Request changes / Reject in review mode, "Apply to project"
 * on the no-git path. Expanding only reveals the per-file unified diffs. The
 * diff is loaded eagerly so the action row isn't perma-disabled while collapsed;
 * approving stays disabled until the diff has loaded, since signing off
 * sight-unseen would bypass the conflict check.
 */
export default function CliRunArtifactPanel({ runId, projectId,
  onSendMessage,
}: CliRunArtifactPanelProps) {
  const {
    artifact,
    review,
    verification,
    verdict,
    landFailure,
    costUSD,
    durationMs,
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
    verify,
    verifying,
    reject,
    rejecting,
    requestChanges,
    requestingChanges,
    error,
  } = useCliRunArtifact(runId, projectId)
  const [expanded, setExpanded] = useState(false)
  const [reasonFor, setReasonFor] = useState<'rejected' | 'changes-requested' | undefined>(
    undefined,
  )
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (error) return
    // Load eagerly (not gated on `expanded`) so the always-visible action row
    // reflects the real diff state even while collapsed. Review mode (run landed
    // on a branch) loads the branch diff; otherwise the no-git path loads the
    // files-emitted preview. `error` gates the retry so a failing load doesn't
    // refire forever.
    if (review) {
      if (!reviewDiff && !reviewLoading) void loadReviewDiff()
    } else if (artifact && !preview && !previewLoading) {
      void loadPreview()
    }
  }, [
    review,
    reviewDiff,
    reviewLoading,
    loadReviewDiff,
    artifact,
    preview,
    previewLoading,
    error,
    loadPreview,
  ])

  if (loading) return null
  // A failed run-fetch must be distinguishable from "the run changed no files".
  if (!artifact && error) {
    return (
      <div className={`mt-2 text-[12px] ${DANGER_TEXT}`}>
        Failed to load agent changes: {error}{' '}
        <button type="button" className="underline" onClick={reload}>
          Retry
        </button>
      </div>
    )
  }
  // The panel surfaces the run's workspace changes; nothing to show without an
  // artifact — unless the run tried and failed to land them, which the user must
  // still be told about.
  if (!artifact && !landFailure) return null

  const files = artifact?.payload.files ?? []
  const counts = reviewChangeCounts(files)
  const applyResultData = applyResult?.kind === 'files-emitted' ? applyResult : undefined
  // "Applied" means the change actually landed: a fresh apply with no errors that
  // materialised ≥1 file, OR the durable `appliedAt` stamped on the run record
  // (so a reopened chat rehydrates it). A failed apply leaves it retryable.
  const appliedOk =
    !!applyResultData &&
    applyResultData.errors.length === 0 &&
    applyResultData.added.length +
      applyResultData.modified.length +
      applyResultData.deleted.length >
      0
  const isApplied = appliedOk || artifact?.appliedAt != null
  // Merge sign-off is durable: a fresh merge OR the persisted review.mergedAt
  // (so a reopened panel shows "Merged" instead of an active Approve button).
  const isMerged = mergeResult?.ok === true || review?.mergedAt != null
  const conflictCount = preview?.files.filter((f) => f.conflict).length ?? 0

  const head = verificationHeadline(verification)
  const checkRows = verificationCheckRows(verification)
  const facts = runReviewFacts({ costUSD, durationMs })
  const notice = mergeNotice(mergeResult)
  const decided = verdict ? verdictSummary(verdict) : undefined
  const landing = landFailure ? landFailureSummary(landFailure) : undefined
  const actionMode = reviewActionMode({ verdict, hasReviewBranch: !!review })
  const busy = merging || rejecting || requestingChanges
  const reasonValid = isReviewReasonValid(reason)

  const openReason = (decision: 'rejected' | 'changes-requested') => {
    setReasonFor(decision)
    setReason('')
  }

  const submitReason = () => {
    if (!reasonFor || !reasonValid) return
    const decision = reasonFor
    const text = reason
    setReasonFor(undefined)
    setReason('')
    if (decision === 'rejected') {
      void reject(text)
      return
    }
    // Record the verdict AND send the notes to the agent. Recording alone left
    // the user waiting on a message nobody had sent.
    void (async () => {
      await requestChanges(text)
      const message = formatChangeRequestMessage(text)
      if (message !== undefined) await onSendMessage?.(message)
    })()
  }

  return (
    <div className="mt-2 rounded-md border border-(--border-default) bg-(--surface-raised) overflow-hidden">
      {/* Header — always visible; toggles the per-file diffs. */}
      <button
        type="button"
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-(--surface-hover)"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="text-[13px] font-medium text-(--text-primary)">
          {artifact
            ? `Agent changed ${files.length} file${files.length === 1 ? '' : 's'}`
            : 'Agent changes were not landed'}
          {review ? (
            <span className="ml-2 text-[11px] font-normal text-(--text-secondary) font-mono">
              {review.branch} ← {review.baseSha.slice(0, 8)}
            </span>
          ) : null}
        </span>
        <span className="text-[12px] text-(--text-secondary)">{expanded ? '▾' : '▸'}</span>
      </button>

      {/* Summary head — always visible: what changed, what it cost, what the
          checks say. The evidence a reviewer needs before deciding. */}
      <div className="border-t border-(--border-subtle) px-3 py-2 flex flex-col gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <FileCountChips counts={counts} />
          {facts.costLabel ? (
            <span className="text-[11px] text-(--text-secondary)">{facts.costLabel}</span>
          ) : null}
          {facts.durationLabel ? (
            <span className="text-[11px] text-(--text-secondary)">{facts.durationLabel}</span>
          ) : null}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`px-2 py-0.5 rounded-full border text-[11px] font-medium ${TONE_CHIP[head.tone]}`}
          >
            {head.label}
          </span>
          <span className="text-[11px] text-(--text-secondary) min-w-0">{head.detail}</span>
          {head.durationLabel ? (
            <span className="text-[11px] text-(--text-secondary)">in {head.durationLabel}</span>
          ) : null}
          <button
            type="button"
            className="ml-auto shrink-0 text-[11px] underline text-(--text-secondary) disabled:opacity-50"
            onClick={() => void verify()}
            disabled={verifying}
          >
            {verifying ? 'Running checks…' : 'Re-run checks'}
          </button>
        </div>

        {checkRows.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {checkRows.map((row) => (
              <CheckRow key={row.id} row={row} />
            ))}
          </div>
        ) : null}

        {landing ? (
          <div className={`rounded-md border px-2 py-1.5 text-[12px] ${TONE_CHIP.warning}`}>
            <div className="font-medium">{landing.title}</div>
            <div>
              The agent produced changes but they were not committed to a review branch —{' '}
              {landing.message}.
            </div>
          </div>
        ) : null}
      </div>

      {/* Expanded — per-file unified diffs only. */}
      {expanded ? (
        <div className="border-t border-(--border-subtle) px-3 py-2 flex flex-col gap-3">
          {error ? (
            <div className={`text-[12px] ${DANGER_TEXT}`}>
              {error}{' '}
              {review && !reviewDiff && !reviewLoading ? (
                <button type="button" className="underline" onClick={() => void loadReviewDiff()}>
                  Retry
                </button>
              ) : !review && !preview && !previewLoading ? (
                <button type="button" className="underline" onClick={() => void loadPreview()}>
                  Retry
                </button>
              ) : null}
            </div>
          ) : null}
          {review && reviewLoading ? (
            <div className="text-[12px] text-(--text-secondary)">Loading diff…</div>
          ) : null}
          {!review && previewLoading ? (
            <div className="text-[12px] text-(--text-secondary)">Computing diff…</div>
          ) : null}

          {review
            ? (reviewDiff?.files ?? []).map((file) => (
                <div key={file.path} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-mono text-(--text-primary)">{file.path}</span>
                    <span className="text-[11px] font-medium text-(--text-secondary)">
                      {file.status}
                    </span>
                  </div>
                  {file.patch ? (
                    <StructuredUnifiedDiff patch={file.patch} />
                  ) : (
                    <div className="text-[12px] text-(--text-secondary)">
                      {file.binary ? 'Binary file.' : 'No textual diff.'}
                    </div>
                  )}
                </div>
              ))
            : (preview?.files ?? []).map((file) => (
                <div key={file.path} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-mono text-(--text-primary)">{file.path}</span>
                    {statusBadge(file)}
                    {file.conflict && !isApplied ? (
                      <span
                        className={`text-[11px] font-medium ${DANGER_TEXT}`}
                        title="This file changed in the project after the agent ran — applying overwrites that edit."
                      >
                        conflict
                      </span>
                    ) : null}
                  </div>
                  {file.patch ? (
                    <StructuredUnifiedDiff patch={file.patch} />
                  ) : (
                    <div className="text-[12px] text-(--text-secondary)">
                      {file.unsafePath
                        ? 'Unsafe path — will not be applied.'
                        : file.contentUnavailable
                          ? 'Binary or oversized content — cannot be applied from the artifact.'
                          : file.unchanged
                            ? 'No changes — already applied.'
                            : null}
                    </div>
                  )}
                </div>
              ))}
        </div>
      ) : null}

      {/* Footer — always visible: outcome message + the review decision. */}
      <div className="border-t border-(--border-subtle) px-3 py-2 flex flex-col gap-2">
        {decided ? (
          <div className="flex flex-col gap-0.5">
            <div className={`text-[12px] font-medium ${TONE_TEXT[decided.tone]}`}>
              {decided.label} by {decided.byLabel}
            </div>
            {decided.notes ? (
              <div className="text-[12px] text-(--text-secondary) break-words">{decided.notes}</div>
            ) : null}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {notice ? (
                <span className={`text-[12px] ${TONE_TEXT[notice.tone]}`}>{notice.message}</span>
              ) : actionMode === 'actions' && isMerged ? (
                <span className="text-[12px] text-(--text-secondary)">Merged into your branch</span>
              ) : applyResultData ? (
                <span className="text-[12px] text-(--text-secondary)">
                  {applyResultData.added.length} added, {applyResultData.modified.length} modified,{' '}
                  {applyResultData.deleted.length} deleted
                  {applyResultData.errors.length > 0
                    ? `, ${applyResultData.errors.length} failed`
                    : ''}
                </span>
              ) : conflictCount > 0 && !isApplied ? (
                <span className={`text-[12px] ${DANGER_TEXT}`}>
                  {conflictCount} conflict{conflictCount === 1 ? '' : 's'} — applying overwrites
                  local edits
                </span>
              ) : isApplied ? (
                <span className="text-[12px] text-(--text-secondary)">Applied to project</span>
              ) : null}
            </div>

            {actionMode === 'actions' ? (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  className={`${ACTION_BUTTON} border border-(--border-default) text-(--text-secondary) hover:bg-(--surface-hover)`}
                  onClick={() => openReason('changes-requested')}
                  disabled={busy || isMerged}
                >
                  {requestingChanges ? 'Sending…' : 'Request changes'}
                </button>
                <button
                  type="button"
                  className={`${ACTION_BUTTON} border border-red-500/30 ${TONE_TEXT.danger} hover:bg-red-500/10`}
                  onClick={() => openReason('rejected')}
                  disabled={busy || isMerged}
                >
                  {rejecting ? 'Rejecting…' : 'Reject'}
                </button>
                <button
                  type="button"
                  className={`${ACTION_BUTTON} bg-(--accent-primary) text-(--text-inverted) hover:opacity-90`}
                  onClick={() => void merge()}
                  disabled={busy || isMerged || !reviewDiff}
                >
                  {merging ? 'Merging…' : isMerged ? 'Merged ✓' : 'Approve & merge'}
                </button>
              </div>
            ) : actionMode === 'none' && artifact ? (
              <button
                type="button"
                className={`${ACTION_BUTTON} bg-(--accent-primary) text-(--text-inverted) hover:opacity-90`}
                onClick={() => void apply()}
                disabled={applying || isApplied || !preview}
              >
                {applying ? 'Applying…' : isApplied ? 'Applied' : 'Apply to project'}
              </button>
            ) : null}
          </div>
        )}

        {reasonFor ? (
          <div className="flex items-center gap-2">
            <Input
              size="sm"
              autoFocus
              value={reason}
              placeholder={
                reasonFor === 'rejected' ? 'Why is this rejected?' : 'What needs to change?'
              }
              onChange={(e) => setReason(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitReason()
                if (e.key === 'Escape') setReasonFor(undefined)
              }}
            />
            <button
              type="button"
              className={`${ACTION_BUTTON} bg-(--accent-primary) text-(--text-inverted) hover:opacity-90`}
              onClick={submitReason}
              disabled={!reasonValid || busy}
            >
              {reasonFor === 'rejected' ? 'Reject' : 'Send'}
            </button>
            <button
              type="button"
              className={`${ACTION_BUTTON} border border-(--border-default) text-(--text-secondary) hover:bg-(--surface-hover)`}
              onClick={() => setReasonFor(undefined)}
            >
              Cancel
            </button>
          </div>
        ) : null}
      </div>

      {applyResultData && applyResultData.errors.length > 0 ? (
        <div className={`border-t border-(--border-subtle) px-3 py-2 text-[12px] ${DANGER_TEXT}`}>
          {applyResultData.errors.map((e) => (
            <div key={e.path}>
              {e.path}: {e.reason}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
