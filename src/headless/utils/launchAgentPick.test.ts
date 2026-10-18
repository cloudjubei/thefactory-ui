import { describe, expect, it } from 'vitest'

import {
  launchAgentPickMetadata,
  launchAgentPickSuggestionAgent,
  launchAgentPickRunner,
  pickLaunchApi,
  pickLaunchCli,
  pickLaunchModel,
} from './launchAgentPick'
import { NO_LAUNCH_AGENT_PICK } from './launchAgentPickConstants'

describe('launch agent picks', () => {
  it('sends nothing while the run keeps the chat’s agent', () => {
    expect(launchAgentPickMetadata(NO_LAUNCH_AGENT_PICK)).toEqual({})
    expect(launchAgentPickRunner(NO_LAUNCH_AGENT_PICK, 'cli')).toBe('cli')
  })

  it('sends a model picked on the chat’s CLI alone', () => {
    const pick = pickLaunchModel(NO_LAUNCH_AGENT_PICK, 'opus')
    expect(launchAgentPickMetadata(pick)).toEqual({ cliModel: 'opus' })
    expect(launchAgentPickRunner(pick, 'api')).toBe('api')
  })

  it('sends a CLI picked for the run as a CLI run, with its login and model', () => {
    const pick = pickLaunchCli('codex', 'cred-codex', 'gpt-5')
    expect(launchAgentPickMetadata(pick)).toEqual({
      runner: 'cli',
      cliTool: 'codex',
      cliModel: 'gpt-5',
      cliCredentialId: 'cred-codex',
    })
    expect(launchAgentPickRunner(pick, 'api')).toBe('cli')
  })

  it('switching CLI drops the model picked for the one before', () => {
    const pick = pickLaunchCli('codex', undefined, undefined)
    expect(
      launchAgentPickMetadata(pickLaunchModel(pickLaunchCli('claude', 'c', 'opus'), 'x')),
    ).toMatchObject({
      cliTool: 'claude',
      cliModel: 'x',
    })
    expect(launchAgentPickMetadata(pick)).toEqual({ runner: 'cli', cliTool: 'codex' })
  })

  it('sends the API for the run, forgetting any CLI picked before', () => {
    const pick = pickLaunchApi()
    expect(launchAgentPickMetadata(pick)).toEqual({ runner: 'api' })
    expect(launchAgentPickRunner(pick, 'cli')).toBe('api')
  })

  it('a model picked after the API was chosen returns the run to a CLI model', () => {
    expect(launchAgentPickMetadata(pickLaunchModel(pickLaunchApi(), 'opus'))).toEqual({
      cliModel: 'opus',
    })
  })
})

describe('launchAgentPickSuggestionAgent', () => {
  const asked = { cliTool: 'codex', cliModel: 'gpt-5', cliCredentialId: 'c1' }

  it('asks the CLI the agent asked for when nothing is picked', () => {
    expect(launchAgentPickSuggestionAgent(NO_LAUNCH_AGENT_PICK, asked)).toEqual({
      cliTool: 'codex',
      model: 'gpt-5',
      cliCredentialId: 'c1',
    })
    expect(launchAgentPickSuggestionAgent(NO_LAUNCH_AGENT_PICK, {})).toEqual({})
  })

  it('asks the CLI picked, with its own sign-in and model, never the agent’s for another CLI', () => {
    expect(
      launchAgentPickSuggestionAgent(pickLaunchCli('claude-code', 'c2', 'opus'), asked),
    ).toEqual({ cliTool: 'claude-code', model: 'opus', cliCredentialId: 'c2' })
    expect(
      launchAgentPickSuggestionAgent(pickLaunchCli('claude-code', undefined, undefined), asked),
    ).toEqual({ cliTool: 'claude-code' })
  })

  it('asks a model picked on the agent’s own CLI', () => {
    expect(
      launchAgentPickSuggestionAgent(pickLaunchModel(NO_LAUNCH_AGENT_PICK, 'o3'), asked),
    ).toEqual({ cliTool: 'codex', model: 'o3', cliCredentialId: 'c1' })
  })

  it('asks no CLI when the API is picked', () => {
    expect(launchAgentPickSuggestionAgent(pickLaunchApi(), asked)).toEqual({})
  })
})
