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

/**
 * The chat-side surface for a CLI agent's workspace diff: a collapsible panel
 * under the agent's reply listing every file the run changed, each rendered as a
 * real unified diff against the project's CURRENT checkout (with a conflict
 * badge when the file diverged since the run), and an Apply button that
 * materialises the changes onto the checkout. Apply stays disabled until the
 * preview has loaded — applying sight-unseen would bypass the conflict check.
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
    if (!expanded || error) return
    // Review mode (run landed on a branch) loads the branch diff; otherwise the
    // no-git path loads the files-emitted preview. `error` gates the retry so a
    // failing load doesn't refire forever.
    if (review) {
      if (!reviewDiff && !reviewLoading) void loadReviewDiff()
    } else if (!preview && !previewLoading) {
      void loadPreview()
    }
  }, [expanded, review, reviewDiff, reviewLoading, loadReviewDiff, preview, previewLoading, error, loadPreview])

  if (loading) return null
  if (!artifact) {
    // A failed run-fetch must be distinguishable from "the run changed no files".
    return error ? (
      <div className={`mt-2 text-[12px] ${DANGER_TEXT}`}>
        Failed to load agent changes: {error}{' '}
        <button type="button" className="underline" onClick={reload}>
          Retry
        </button>
      </div>
    ) : null
  }

  const files = artifact.payload.files
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
  const conflictCount = preview?.files.filter((f) => f.conflict).length ?? 0

  return (
    <div className="mt-2 rounded-md border border-(--border-default) bg-(--surface-raised) overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-(--surface-hover)"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="text-[13px] font-medium text-(--text-primary)">
          Agent changed {files.length} file{files.length === 1 ? '' : 's'}
        </span>
        <span className="text-[12px] text-(--text-secondary)">
          {counts.added > 0 ? `+${counts.added} ` : ''}
          {counts.modified > 0 ? `~${counts.modified} ` : ''}
          {counts.deleted > 0 ? `−${counts.deleted} ` : ''}
          {expanded ? '▾' : '▸'}
        </span>
      </button>

      {expanded && review ? (
        <div className="border-t border-(--border-subtle) px-3 py-2 flex flex-col gap-3">
          <div className="text-[11px] text-(--text-secondary) font-mono">
            {review.branch} ← {review.baseSha.slice(0, 8)}
          </div>
          {error ? (
            <div className={`text-[12px] ${DANGER_TEXT}`}>
              {error}{' '}
              {!reviewDiff && !reviewLoading ? (
                <button type="button" className="underline" onClick={() => void loadReviewDiff()}>
                  Retry
                </button>
              ) : null}
            </div>
          ) : null}
          {reviewLoading ? (
            <div className="text-[12px] text-(--text-secondary)">Loading diff…</div>
          ) : null}

          {(reviewDiff?.files ?? []).map((file) => (
            <div key={file.path} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-mono text-(--text-primary)">{file.path}</span>
                <span className="text-[11px] font-medium text-(--text-secondary)">{file.status}</span>
              </div>
              {file.patch ? (
                <StructuredUnifiedDiff patch={file.patch} />
              ) : (
                <div className="text-[12px] text-(--text-secondary)">
                  {file.binary ? 'Binary file.' : 'No textual diff.'}
                </div>
              )}
            </div>
          ))}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              className="px-3 py-1.5 rounded-md text-[13px] font-medium bg-(--accent-primary) text-(--text-inverted) hover:opacity-90 disabled:opacity-50"
              onClick={() => void merge()}
              disabled={merging || mergeResult?.ok === true || !reviewDiff}
            >
              {merging ? 'Merging…' : mergeResult?.ok ? 'Merged ✓' : 'Sign off & merge'}
            </button>
            {mergeResult?.conflicts && mergeResult.conflicts.length > 0 ? (
              <span className={`text-[12px] ${DANGER_TEXT}`}>
                {mergeResult.conflicts.length} conflict
                {mergeResult.conflicts.length === 1 ? '' : 's'} — resolve in the Git tab
              </span>
            ) : mergeResult && !mergeResult.ok ? (
              <span className={`text-[12px] ${DANGER_TEXT}`}>
                {mergeResult.message ?? 'Merge failed'}
              </span>
            ) : mergeResult?.ok ? (
              <span className="text-[12px] text-(--text-secondary)">
                Merged into your branch{mergeResult.mergeCommit ? ` (${mergeResult.mergeCommit.slice(0, 8)})` : ''}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {expanded && !review ? (
        <div className="border-t border-(--border-subtle) px-3 py-2 flex flex-col gap-3">
          {error ? (
            <div className={`text-[12px] ${DANGER_TEXT}`}>
              {error}{' '}
              {!preview && !previewLoading ? (
                <button type="button" className="underline" onClick={() => void loadPreview()}>
                  Retry
                </button>
              ) : null}
            </div>
          ) : null}
          {previewLoading ? (
            <div className="text-[12px] text-(--text-secondary)">Computing diff…</div>
          ) : null}

          {(preview?.files ?? []).map((file) => (
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

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              className="px-3 py-1.5 rounded-md text-[13px] font-medium bg-(--accent-primary) text-(--text-inverted) hover:opacity-90 disabled:opacity-50"
              onClick={() => void apply()}
              disabled={applying || isApplied || !preview}
            >
              {applying ? 'Applying…' : isApplied ? 'Applied' : 'Apply to project'}
            </button>
            {conflictCount > 0 && !isApplied ? (
              <span className={`text-[12px] ${DANGER_TEXT}`}>
                {conflictCount} conflict{conflictCount === 1 ? '' : 's'} — applying overwrites
                local edits
              </span>
            ) : null}
            {applyResultData ? (
              <span className="text-[12px] text-(--text-secondary)">
                {applyResultData.added.length} added, {applyResultData.modified.length} modified,{' '}
                {applyResultData.deleted.length} deleted
                {applyResultData.errors.length > 0 ? `, ${applyResultData.errors.length} failed` : ''}
              </span>
            ) : isApplied ? (
              <span className="text-[12px] text-(--text-secondary)">Applied to project</span>
            ) : null}
          </div>
          {applyResultData && applyResultData.errors.length > 0 ? (
            <div className={`text-[12px] ${DANGER_TEXT}`}>
              {applyResultData.errors.map((e) => (
                <div key={e.path}>
                  {e.path}: {e.reason}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
