import { describe, expect, it } from 'vitest'

import {
  launchAgentPickMetadata,
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
