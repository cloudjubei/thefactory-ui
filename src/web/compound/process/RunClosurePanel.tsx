import { useState } from 'react'
import {
  PROCESS_RUN_CLOSURE_ACTION_COPY,
  useProcessRunClosure,
  type ProcessRun,
} from '../../../headless'
import { Button } from '../../primitives/Button'
import FeatureClosureList from './FeatureClosureList'

export type RunClosurePanelProps = {
  run: ProcessRun
  /** The run as it stands once its features are settled. */
  onSettled?: (run: ProcessRun) => void
}

/**
 * "Settle its features" on a story run that ended: each feature it
 * worked on, what it is now and what the run did, with a pick of what it is
 * left as — pending, blocked (with why), deferred or done. Nothing when there
 * is nothing to settle.
 */
export function RunClosurePanel({ run, onSettled }: RunClosurePanelProps) {
  const closure = useProcessRunClosure(run)
  const [open, setOpen] = useState(true)
  if (closure.rows.length === 0) return null
  return (
    <div className="mx-3 mt-3 flex flex-col gap-2 rounded-lg border border-(--status-on_hold-soft-border) bg-(--status-on_hold-soft-bg) p-3">
      <button
        type="button"
        className="flex flex-col items-start text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-[13px] font-semibold text-(--status-on_hold-soft-fg)">
          {PROCESS_RUN_CLOSURE_ACTION_COPY.label}
        </span>
        <span className="text-[11px] text-(--text-secondary)">
          {PROCESS_RUN_CLOSURE_ACTION_COPY.detail}
        </span>
      </button>
      {open ? (
        <>
          <FeatureClosureList rows={closure.rows} onPick={closure.pick} />
          {closure.problem || closure.actionError ? (
            <span className="text-[11px] text-(--status-stuck-soft-fg)">
              {closure.actionError ?? closure.problem}
            </span>
          ) : null}
          <Button
            size="sm"
            className="self-start"
            disabled={closure.busy || !!closure.problem}
            onClick={() =>
              void closure.settle().then((settled) => {
                if (settled) onSettled?.(settled)
              })
            }
          >
            Settle these features
          </Button>
        </>
      ) : null}
    </div>
  )
}

export default RunClosurePanel
