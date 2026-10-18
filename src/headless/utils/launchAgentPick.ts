// The agent a launch card's chip picks for one run: the API, a CLI and its
// login, a model — carried on the decision, never written back to the chat.

import type {
  LaunchAgentAsked,
  LaunchAgentPick,
  LaunchAgentPickMetadata,
  LaunchSuggestionAgent,
} from './launchAgentPickTypes'

/** The API for the run, forgetting any CLI picked before. Pure. */
export function pickLaunchApi(): LaunchAgentPick {
  return { api: true }
}

/** A CLI for the run, at the model given — that CLI's default when none. Pure. */
export function pickLaunchCli(
  cli: string,
  credentialId: string | undefined,
  model: string | undefined,
): LaunchAgentPick {
  return {
    api: false,
    cli,
    ...(credentialId ? { credentialId } : {}),
    ...(model ? { model } : {}),
  }
}

/** A CLI model for the run, on the CLI already picked, else the chat's. Pure. */
export function pickLaunchModel(pick: LaunchAgentPick, model: string): LaunchAgentPick {
  return { ...pick, api: false, model }
}

/** What the decision carries: the side when one was picked, the CLI, its login and model. Pure. */
export function launchAgentPickMetadata(pick: LaunchAgentPick): LaunchAgentPickMetadata {
  if (pick.api) return { runner: 'api' }
  return {
    ...(pick.cli ? { runner: 'cli' as const, cliTool: pick.cli } : {}),
    ...(pick.model ? { cliModel: pick.model } : {}),
    ...(pick.cli && pick.credentialId ? { cliCredentialId: pick.credentialId } : {}),
  }
}

/** Which side the run works on: the one picked, else `fallback` — the agent's or the chat's. Pure. */
export function launchAgentPickRunner(
  pick: LaunchAgentPick,
  fallback: 'api' | 'cli',
): 'api' | 'cli' {
  if (pick.api) return 'api'
  return pick.cli ? 'cli' : fallback
}

/**
 * The CLI agent a launch's suggested setup is asked of: the one picked on the card,
 * else the one the agent asked for — the picked CLI never takes the agent's sign-in
 * or model for another. None when the API is picked. Pure.
 */
export function launchAgentPickSuggestionAgent(
  pick: LaunchAgentPick,
  asked: LaunchAgentAsked,
): LaunchSuggestionAgent {
  if (pick.api) return {}
  const cliTool = pick.cli ?? asked.cliTool
  const model = pick.model ?? (pick.cli ? undefined : asked.cliModel)
  const cliCredentialId = pick.cli ? pick.credentialId : asked.cliCredentialId
  return {
    ...(cliTool ? { cliTool } : {}),
    ...(model ? { model } : {}),
    ...(cliCredentialId ? { cliCredentialId } : {}),
  }
}
