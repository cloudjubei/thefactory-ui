import type { CliRun } from '../api/generated'

/**
 * Which agent, on which model, actually carried out a run.
 *
 * A read-only FACT about work already done — deliberately not the composer's
 * `ModelChip`, which exists to CHANGE the model of a chat. Sign-off shows what
 * ran; nothing here is pickable.
 */
export type RunModel = {
  /** `claude-code`, `codex`, … for a CLI run; `undefined` for an API run. */
  tool: string | undefined
  /** The transport label the chip leads with: the CLI's name, or `API`. */
  tag: string
  /** The model the run was carried out on, when the record names one. */
  model: string | undefined
  /** Reasoning effort, when the runner reported one. */
  effort: string | undefined
}

function trimmedOrUndefined(value: string | undefined): string | undefined {
  const text = value?.trim()
  return text ? text : undefined
}

/**
 * Read the run's executor off its record.
 *
 * `cli` is absent for an API-transport run, which is the only thing that tells
 * the two apart — so its absence IS the "API" reading, not missing data.
 */
export function runModelOf(run: Pick<CliRun, 'cli' | 'modelId' | 'effort'>): RunModel {
  const tool = trimmedOrUndefined(run.cli?.tool)
  return {
    tool,
    tag: tool ?? 'API',
    model: trimmedOrUndefined(run.modelId),
    effort: trimmedOrUndefined(run.effort),
  }
}

/** The model line, falling back to the executor when no model was recorded. */
export function runModelLabel(model: RunModel | undefined): string | undefined {
  if (!model) return undefined
  return model.model ?? model.tool ?? undefined
}
