import type { ModelChoice } from 'thefactory-tools/types'
import type {
  ProjectOverviewModelConfig,
  ProjectOverviewModelView,
} from './projectOverviewModelTypes'
import { PROJECT_OVERVIEW_MODEL_TEXT } from './projectOverviewModelConstants'

const OFF: ProjectOverviewModelView = {
  off: true,
  useCli: false,
  activeConfig: null,
  cli: null,
  cliModelId: undefined,
  credentialId: undefined,
  effort: undefined,
}

/**
 * What the overview model chip shows for the stored choice: an API config — keyed or not — or a CLI with its model,
 * login and effort; Off when nothing is chosen or the choice cannot be used — its config gone, its CLI switched
 * off — which is how the backend reads it. Pure.
 */
export function projectOverviewModelView(
  choice: ModelChoice | null,
  configs: readonly ProjectOverviewModelConfig[],
  enabledClis: readonly string[],
): ProjectOverviewModelView {
  if (!choice) return OFF
  if (choice.runner === 'api') {
    const activeConfig = configs.find((c) => c.id === choice.llmConfigId)
    return activeConfig ? { ...OFF, off: false, activeConfig, effort: choice.effort } : OFF
  }
  if (!enabledClis.includes(choice.cli)) return OFF
  return {
    ...OFF,
    off: false,
    useCli: true,
    cli: choice.cli,
    cliModelId: choice.model,
    credentialId: choice.authCredentialId,
    effort: choice.effort,
  }
}

/** An API config chosen for the overviews, at the effort given. Pure. */
export function projectOverviewApiChoice(llmConfigId: string, effort?: string): ModelChoice {
  return { runner: 'api', llmConfigId, ...(effort ? { effort } : {}) }
}

/** A CLI chosen for the overviews, on the model given — its default, and its active login, otherwise. Pure. */
export function projectOverviewCliChoice(cli: string, model?: string): ModelChoice {
  return { runner: 'cli', cli, ...(model ? { model } : {}) }
}

/**
 * A CLI model chosen for the overviews: on the CLI chosen already it keeps that choice's login and effort; on any
 * other side it starts afresh on `cli`. Pure.
 */
export function projectOverviewCliModelChoice(
  choice: ModelChoice | null,
  cli: string,
  model: string,
): ModelChoice {
  if (choice?.runner === 'cli' && choice.cli === cli) return { ...choice, model }
  return projectOverviewCliChoice(cli, model)
}

/** The choice at an effort; `undefined` leaves it to the model's default. Pure. */
export function projectOverviewEffortChoice(
  choice: ModelChoice,
  effort: string | undefined,
): ModelChoice {
  const { effort: _before, ...rest } = choice
  return effort ? { ...rest, effort } : rest
}

/**
 * What a switch to the API or a CLI chooses: the config shown, else the first one; the active CLI while it is
 * switched on, else the first switched on — or why there is nothing to choose on that side. Pure.
 */
export function projectOverviewSwitch(
  useCli: boolean,
  input: {
    activeConfig: ProjectOverviewModelConfig | null
    configs: readonly ProjectOverviewModelConfig[]
    activeCli: string | null | undefined
    enabledClis: readonly string[]
  },
): { choice: ModelChoice } | { error: string } {
  if (useCli) {
    const cli =
      input.activeCli && input.enabledClis.includes(input.activeCli)
        ? input.activeCli
        : input.enabledClis[0]
    return cli
      ? { choice: projectOverviewCliChoice(cli) }
      : { error: PROJECT_OVERVIEW_MODEL_TEXT.noClis }
  }
  const config = input.activeConfig ?? input.configs[0]
  return config
    ? { choice: projectOverviewApiChoice(config.id) }
    : { error: PROJECT_OVERVIEW_MODEL_TEXT.noConfigs }
}
