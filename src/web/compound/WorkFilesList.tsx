import { workFilesHeading } from '../../headless/utils/workFiles'
import { WORK_FILES_HINT } from '../../headless/utils/workFilesConstants'

export type WorkFilesListProps = {
  /** Project-relative paths handed over with the work; nothing shows when empty. */
  files: readonly string[] | undefined
}

/**
 * The files that go with work the person is asked to start — each project path in full, so they
 * see exactly what its agents are handed. Purely presentational.
 */
export default function WorkFilesList({ files }: WorkFilesListProps) {
  if (!files?.length) return null
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{workFilesHeading(files.length)}</span>
      <ul className="flex max-h-40 flex-col gap-0.5 overflow-auto rounded-md border border-(--border-subtle) p-2 font-mono text-xs break-all text-(--text-primary)">
        {files.map((file) => (
          <li key={file}>{file}</li>
        ))}
      </ul>
      <p className="text-xs text-(--text-secondary)">{WORK_FILES_HINT}</p>
    </div>
  )
}
