import { getModelEffortLevels } from 'thefactory-tools/utils'
import type { LLMProvider } from 'thefactory-tools/types'

import type { CliReasoningEffort } from '../api'
import { EFFORT_DEFAULT_LABEL, EFFORT_LEVEL_LABELS, EFFORT_LEVELS } from './modelEffortConstants'
import type { ModelInfo } from '../api'
import type { CliModelEffortRow, ModelEffortChoice, ModelEffortTarget } from './modelEffortTypes'

/** A string as an effort level, or `undefined` when it is not one. Pure. */
export function asEffortLevel(value: unknown): CliReasoningEffort | undefined {
  return EFFORT_LEVELS.find((level) => level === value)
}

/** The levels `levels` names, in ladder order, unknown ones left out. Pure. */
function ladder(levels: readonly string[]): CliReasoningEffort[] {
  return EFFORT_LEVELS.filter((level) => levels.includes(level))
}

/**
 * The levels the selected model offers: a listed CLI model's own (none when
 * it lists none), the CLI's for a model it does not list, an API model's by
 * its provider. Pure.
 */
export function modelEffortLevels(target: ModelEffortTarget): CliReasoningEffort[] {
  if (target.runner === 'api') {
    if (!target.provider || !target.model) return []
    return ladder(getModelEffortLevels(target.provider as LLMProvider, target.model))
  }
  const listed = target.modelId ? target.models.find((m) => m.id === target.modelId) : undefined
  return ladder(listed ? (listed.effortLevels ?? []) : target.cliLevels)
}

/**
 * The selected model's effort, as its switch shows it: the levels it offers,
 * the choice while it offers it, and the default that runs without one — the
 * model's then the CLI's for a CLI, the config's for an API model. A level the
 * model does not offer is never shown as chosen, the way a run drops it. Pure.
 */
export function modelEffortChoice(target: ModelEffortTarget): ModelEffortChoice {
  const levels = modelEffortLevels(target)
  const offered = (level: string | undefined) => {
    const known = asEffortLevel(level)
    return known && levels.includes(known) ? known : undefined
  }
  const defaults =
    target.runner === 'api' ? [target.configDefault] : [target.modelDefault, target.cliDefault]
  const value = offered(target.choice)
  const defaultValue = defaults.map(offered).find((level) => level !== undefined)
  return {
    levels,
    ...(value ? { value } : {}),
    ...(defaultValue ? { defaultValue } : {}),
  }
}

/** A level as a person reads it. Pure. */
export function effortLevelLabel(level: CliReasoningEffort): string {
  return EFFORT_LEVEL_LABELS[level]
}

/** The switch's default option, naming what it runs at when that is known. Pure. */
export function effortDefaultLabel(defaultValue: CliReasoningEffort | undefined): string {
  return defaultValue
    ? `${EFFORT_DEFAULT_LABEL} · ${effortLevelLabel(defaultValue)}`
    : EFFORT_DEFAULT_LABEL
}

/**
 * The CLI form's per-model defaults: a row for each model that offers effort,
 * with only its own levels and the default set for it. Pure.
 */
export function cliModelEffortRows(
  models: readonly ModelInfo[],
  defaults: Readonly<Record<string, string>> | undefined,
): CliModelEffortRow[] {
  return models.flatMap((m) => {
    const levels = ladder(m.effortLevels ?? [])
    if (levels.length === 0) return []
    const value = asEffortLevel(defaults?.[m.id])
    return [
      {
        modelId: m.id,
        label: m.label ?? m.id,
        levels,
        ...(value && levels.includes(value) ? { value } : {}),
      },
    ]
  })
}
