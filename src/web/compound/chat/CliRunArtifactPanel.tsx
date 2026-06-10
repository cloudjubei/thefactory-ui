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
    added: { label: 'added', cls: 'text-(--accent-success)' },
    modified: { label: 'modified', cls: 'text-(--accent-warning)' },
    deleted: { label: 'deleted', cls: 'text-(--accent-danger)' },
  }
  const m = map[file.status]
  return <span className={`text-[11px] font-medium ${m.cls}`}>{m.label}</span>
}

/**
 * The chat-side surface for a CLI agent's workspace diff: a collapsible panel
 * under the agent's reply listing every file the run changed, each rendered as a
 * real unified diff against the project's CURRENT checkout (with a conflict
 * badge when the file diverged since the run), and an Apply button that
 * materialises the changes onto the checkout.
 */
export default function CliRunArtifactPanel({ runId, projectId }: CliRunArtifactPanelProps) {
  const {
    artifact,
    loading,
    preview,
    previewLoading,
    loadPreview,
    apply,
    applying,
    applyResult,
    error,
  } = useCliRunArtifact(runId, projectId)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (expanded && !preview && !previewLoading) void loadPreview()
  }, [expanded, preview, previewLoading, loadPreview])

  if (loading || !artifact) return null

  const files = artifact.payload.files
  const counts = {
    added: files.filter((f) => f.status === 'added').length,
    modified: files.filter((f) => f.status === 'modified').length,
    deleted: files.filter((f) => f.status === 'deleted').length,
  }
  const applied = applyResult?.kind === 'files-emitted' ? applyResult : undefined
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
          {error ? <div className="text-[12px] text-(--accent-danger)">{error}</div> : null}
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
                    className="text-[11px] font-medium text-(--accent-danger)"
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
              disabled={applying || !!applied}
            >
              {applying ? 'Applying…' : applied ? 'Applied' : 'Apply to project'}
            </button>
            {conflictCount > 0 && !applied ? (
              <span className="text-[12px] text-(--accent-danger)">
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
            ) : null}
          </div>
          {applied && applied.errors.length > 0 ? (
            <div className="text-[12px] text-(--accent-danger)">
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
