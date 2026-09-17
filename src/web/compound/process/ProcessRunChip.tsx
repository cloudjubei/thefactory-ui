import { processRunChain, processRunChipLabel, useProcessRun } from '../../../headless'

export type ProcessRunChipProps = {
  processRunId: string
  /** Open the pipeline. The chip's only action, by design. */
  onOpen: (processRunId: string) => void
}

/**
 * The live state of a process run, in one line, on the chat card that launched it.
 *
 * It REPORTS and it never decides. A parked run says a decision is pending and
 * nothing more — the choices live in the pipeline, where their context is.
 * Answering here would put the same decision behind two doors, which is how
 * two surfaces drift apart.
 */
export default function ProcessRunChip({ processRunId, onOpen }: ProcessRunChipProps) {
  const { run } = useProcessRun(processRunId)
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2 rounded border px-2 py-1.5 text-left text-[11px]"
      style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-raised)' }}
      onClick={() => onOpen(processRunId)}
    >
      <span className="flex min-w-0 flex-col">
        <span className="font-medium">
          {run ? processRunChipLabel(run) : 'Loading the pipeline…'}
        </span>
        {run ? (
          <span className="truncate text-[10px] text-(--text-secondary)">
            {processRunChain(run)}
          </span>
        ) : null}
      </span>
      <span className="ml-auto shrink-0 text-(--text-secondary)">Open the pipeline →</span>
    </button>
  )
}
