import Surface from '../../primitives/Surface'

export type TestsProgressBarProps = {
  /** Heading shown to the left of the counts (e.g. "Unit tests running…"). */
  label: string
  /** Files processed so far. */
  completed: number
  /** Total files in this run, when known. Omit to render the count only. */
  total?: number | null
  /** Name of the file currently executing, when known. */
  currentFile?: string
}

export function TestsProgressBar({ label, completed, total, currentFile }: TestsProgressBarProps) {
  const pct =
    typeof total === 'number' && total > 0
      ? Math.min(100, Math.round((completed / total) * 100))
      : null

  return (
    <Surface className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs opacity-70 font-mono">
          {typeof total === 'number' ? `${completed} / ${total}` : `${completed} files`}
          {pct != null ? ` · ${pct}%` : ''}
        </span>
        <span className="text-xs opacity-70 truncate flex-1" title={currentFile}>
          {currentFile ?? ''}
        </span>
      </div>
      {pct != null && (
        <div
          className="h-1 rounded overflow-hidden"
          style={{ background: 'var(--surface-muted)' }}
        >
          <div
            className="h-full transition-all"
            style={{ width: `${pct}%`, background: 'var(--color-brand-700)' }}
          />
        </div>
      )}
    </Surface>
  )
}

export default TestsProgressBar
