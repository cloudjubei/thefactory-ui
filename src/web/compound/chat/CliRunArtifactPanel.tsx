import { useEffect, useState } from 'react'

import type { FilesEmittedFilePreview } from '../../../headless/api'
import { useCliRunArtifact } from '../../../headless'
import { StructuredUnifiedDiff } from '../diff'

export type CliRunArtifactPanelProps = {
  /** The CLI run whose workspace diff to surface (from the message's `cliRunId`). */
  runId: string
  /** Project whose checkout the diff previews against + applies onto. */
  projectId: string
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

/** Per-status file-count pills (added / modified / deleted), shown in the
 * always-visible footer — mirrors the Git view's multi-file change summary so
 * the user sees the run's footprint without expanding. */
function FileCountChips({
  counts,
}: {
  counts: { added: number; modified: number; deleted: number }
}) {
  if (counts.added + counts.modified + counts.deleted === 0) return null
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

/**
 * The chat-side surface for a CLI agent's workspace diff. Like a PR view: the
 * header (file count, expandable) is always shown, and a footer with the
 * per-file change chips + the primary action ("Sign off & merge" in review mode,
 * "Apply to project" in the no-git path) is ALWAYS visible — expanding only
 * reveals the per-file unified diffs. The diff is loaded eagerly so the action
 * button isn't perma-disabled while collapsed. Apply/merge stay disabled until
 * the diff has loaded — acting sight-unseen would bypass the conflict check.
 */
export default function CliRunArtifactPanel({ runId, projectId }: CliRunArtifactPanelProps) {
  const {
    artifact,
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
  } = useCliRunArtifact(runId, projectId)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (error) return
    // Load eagerly (not gated on `expanded`) so the always-visible footer's
    // merge/apply button reflects the real diff state even while collapsed.
    // Review mode (run landed on a branch) loads the branch diff; otherwise the
    // no-git path loads the files-emitted preview. `error` gates the retry so a
    // failing load doesn't refire forever.
    if (review) {
      if (!reviewDiff && !reviewLoading) void loadReviewDiff()
    } else if (artifact && !preview && !previewLoading) {
      void loadPreview()
    }
  }, [review, reviewDiff, reviewLoading, loadReviewDiff, artifact, preview, previewLoading, error, loadPreview])

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
  // The panel surfaces the run's workspace changes; nothing to show without an artifact.
  if (!artifact) return null

  const files = artifact.payload.files ?? []
  const counts = {
    added: files.filter((f) => f.status === 'added').length,
    modified: files.filter((f) => f.status === 'modified').length,
    deleted: files.filter((f) => f.status === 'deleted').length,
  }
  const applyResultData = applyResult?.kind === 'files-emitted' ? applyResult : undefined
  // "Applied" means the change actually landed: a fresh apply with no errors that
  // materialised ≥1 file, OR the durable `appliedAt` stamped on the run record
  // (so a reopened chat rehydrates it). A failed apply leaves it retryable.
  const appliedOk =
    !!applyResultData &&
    applyResultData.errors.length === 0 &&
    applyResultData.added.length + applyResultData.modified.length + applyResultData.deleted.length >
      0
  const isApplied = appliedOk || artifact.appliedAt != null
  // Merge sign-off is durable: a fresh merge OR the persisted review.mergedAt
  // (so a reopened panel shows "Merged" instead of an active Sign-off button).
  const isMerged = mergeResult?.ok === true || review?.mergedAt != null
  const conflictCount = preview?.files.filter((f) => f.conflict).length ?? 0

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
          {`Agent changed ${files.length} file${files.length === 1 ? '' : 's'}`}
          {review ? (
            <span className="ml-2 text-[11px] font-normal text-(--text-secondary) font-mono">
              {review.branch} ← {review.baseSha.slice(0, 8)}
            </span>
          ) : null}
        </span>
        <span className="text-[12px] text-(--text-secondary)">{expanded ? '▾' : '▸'}</span>
      </button>

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

      {/* Footer — always visible: change chips + status + the primary action. */}
      <div className="border-t border-(--border-subtle) px-3 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <FileCountChips counts={counts} />
          {review ? (
            mergeResult?.conflicts && mergeResult.conflicts.length > 0 ? (
              <span className={`text-[12px] ${DANGER_TEXT}`}>
                {mergeResult.conflicts.length} conflict
                {mergeResult.conflicts.length === 1 ? '' : 's'} — resolve in the Git tab
              </span>
            ) : mergeResult && !mergeResult.ok ? (
              <span className={`text-[12px] ${DANGER_TEXT}`}>
                {mergeResult.message ?? 'Merge failed'}
              </span>
            ) : isMerged ? (
              <span className="text-[12px] text-(--text-secondary)">Merged into your branch</span>
            ) : null
          ) : applyResultData ? (
            <span className="text-[12px] text-(--text-secondary)">
              {applyResultData.added.length} added, {applyResultData.modified.length} modified,{' '}
              {applyResultData.deleted.length} deleted
              {applyResultData.errors.length > 0 ? `, ${applyResultData.errors.length} failed` : ''}
            </span>
          ) : conflictCount > 0 && !isApplied ? (
            <span className={`text-[12px] ${DANGER_TEXT}`}>
              {conflictCount} conflict{conflictCount === 1 ? '' : 's'} — applying overwrites local
              edits
            </span>
          ) : isApplied ? (
            <span className="text-[12px] text-(--text-secondary)">Applied to project</span>
          ) : null}
        </div>

        {review ? (
          <button
            type="button"
            className="shrink-0 px-3 py-1.5 rounded-md text-[13px] font-medium bg-(--accent-primary) text-(--text-inverted) hover:opacity-90 disabled:opacity-50"
            onClick={() => void merge()}
            disabled={merging || isMerged || !reviewDiff}
          >
            {merging ? 'Merging…' : isMerged ? 'Merged ✓' : 'Sign off & merge'}
          </button>
        ) : (
          <button
            type="button"
            className="shrink-0 px-3 py-1.5 rounded-md text-[13px] font-medium bg-(--accent-primary) text-(--text-inverted) hover:opacity-90 disabled:opacity-50"
            onClick={() => void apply()}
            disabled={applying || isApplied || !preview}
          >
            {applying ? 'Applying…' : isApplied ? 'Applied' : 'Apply to project'}
          </button>
        )}
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
