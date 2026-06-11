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
    loading,
    preview,
    previewLoading,
    loadPreview,
    reload,
    apply,
    applying,
    applyResult,
    error,
  } = useCliRunArtifact(runId, projectId)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    // `error` gates the retry: without it a failing preview refires forever
    // (each failure resets previewLoading with preview still unset).
    if (expanded && !preview && !previewLoading && !error) void loadPreview()
  }, [expanded, preview, previewLoading, error, loadPreview])

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
  const applied = applyResult?.kind === 'files-emitted' ? applyResult : undefined
  // Applied-state is durable: the run record stamps `appliedAt`, so a reopened
  // chat shows "Applied" rather than reverting to a live Apply button.
  const isApplied = !!applied || artifact.appliedAt != null
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

      {expanded ? (
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
                {file.conflict ? (
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
            {applied ? (
              <span className="text-[12px] text-(--text-secondary)">
                {applied.added.length} added, {applied.modified.length} modified,{' '}
                {applied.deleted.length} deleted
                {applied.errors.length > 0 ? `, ${applied.errors.length} failed` : ''}
              </span>
            ) : isApplied ? (
              <span className="text-[12px] text-(--text-secondary)">Applied to project</span>
            ) : null}
          </div>
          {applied && applied.errors.length > 0 ? (
            <div className={`text-[12px] ${DANGER_TEXT}`}>
              {applied.errors.map((e) => (
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
