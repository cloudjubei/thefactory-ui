import { useMemo } from 'react'

import type { CliReasoningEffort } from '../api'
import { modelEffortChoice } from '../utils/modelEffort'
import type { ModelEffortSwitch, ModelEffortTarget } from '../utils/modelEffortTypes'

/**
 * The selected model's effort switch, for a CLI model or an API config alike:
 * the levels it offers, the effort chosen and the default that runs without
 * one, and `onPick` to change it. Every chip on every client reads its effort
 * through this hook, so the switch behaves the same whatever the model.
 */
export function useModelEffort(
  target: ModelEffortTarget,
  onPick: (effort: CliReasoningEffort | undefined) => void,
): ModelEffortSwitch {
  const cli = target.runner === 'cli' ? target : undefined
  const api = target.runner === 'api' ? target : undefined
  return useMemo(
    () => ({ ...modelEffortChoice(target), onPick }),
    [
      cli?.modelId,
      cli?.models,
      cli?.cliLevels,
      cli?.modelDefault,
      cli?.cliDefault,
      api?.provider,
      api?.model,
      api?.configDefault,
      target.runner,
      target.choice,
      onPick,
    ],
  )
}
