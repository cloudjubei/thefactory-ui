import { useMemo } from 'react'

import type { ProcessRun } from 'thefactory-tools/types'

import type { LaunchAgentPick, LaunchModelChipSlot } from '../utils/launchAgentPickTypes'
import { processRunModelChipView, runModelChipSlot } from '../utils/runModelChange'
import type { RunModelChipView } from '../utils/runModelChangeTypes'

/**
 * The run's model chip on every client: what it shows, and the slot the host's
 * chooser chip is handed — each pick sent as the run's new model.
 */
export function useRunModelChip(
  run: ProcessRun | undefined,
  setModel: (pick: LaunchAgentPick) => Promise<boolean>,
): { view: RunModelChipView; slot: LaunchModelChipSlot } | undefined {
  return useMemo(() => {
    if (!run) return undefined
    const view = processRunModelChipView(run)
    return { view, slot: runModelChipSlot(view.pick, (pick) => void setModel(pick)) }
  }, [run, setModel])
}
