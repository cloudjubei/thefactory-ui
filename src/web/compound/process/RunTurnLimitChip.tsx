import { useState } from 'react'
import {
  PROCESS_TURN_LIMIT_CHIP,
  PROCESS_TURN_LIMIT_EDIT_LABEL,
  PROCESS_TURN_LIMIT_SAVE_LABEL,
  processRunTurnLimitView,
  processTurnLimitOfView,
  type ProcessRun,
  type ProcessTurnLimit,
} from '../../../headless'
import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'
import { TurnLimitField } from '../TurnLimitField'

export type RunTurnLimitChipProps = {
  run: ProcessRun
  /** Set the limit from the next step on; absent once the run has ended, when it only shows it. */
  onSet?: (limit: ProcessTurnLimit) => Promise<boolean>
}

/** A run's turn limit in its head — and, while it runs, the way to raise or lift it. */
export function RunTurnLimitChip({ run, onSet }: RunTurnLimitChipProps) {
  const view = processRunTurnLimitView(run)
  const [editing, setEditing] = useState<{ limited: boolean; maxTurns: number } | undefined>()
  const [saving, setSaving] = useState(false)
  const label = PROCESS_TURN_LIMIT_CHIP(view.limited, view.maxTurns)
  return (
    <>
      <button
        type="button"
        disabled={!onSet}
        onClick={() => setEditing({ limited: view.limited, maxTurns: view.maxTurns })}
        aria-label={onSet ? PROCESS_TURN_LIMIT_EDIT_LABEL : label}
        title={onSet ? PROCESS_TURN_LIMIT_EDIT_LABEL : view.hint}
        className="inline-flex h-7 items-center rounded-md border border-(--border-subtle) px-2 text-[11px] text-(--text-secondary) enabled:hover:bg-(--surface-hover)"
      >
        {label}
      </button>
      {editing && onSet ? (
        <Modal
          isOpen
          onClose={() => setEditing(undefined)}
          title={PROCESS_TURN_LIMIT_EDIT_LABEL}
          size="sm"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditing(undefined)}>
                Cancel
              </Button>
              <Button
                disabled={saving}
                onClick={() => {
                  setSaving(true)
                  void onSet(processTurnLimitOfView(editing))
                    .then((ok) => {
                      if (ok) setEditing(undefined)
                    })
                    .finally(() => setSaving(false))
                }}
              >
                {PROCESS_TURN_LIMIT_SAVE_LABEL}
              </Button>
            </div>
          }
        >
          <TurnLimitField
            {...view}
            limited={editing.limited}
            maxTurns={editing.maxTurns}
            onChange={setEditing}
          />
        </Modal>
      ) : null}
    </>
  )
}

export default RunTurnLimitChip
