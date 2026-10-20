import { describe, expect, it } from 'vitest'

import {
  launchAgentPickMetadata,
  launchModelChipSlotOf,
  launchAgentPickSuggestionAgent,
  launchAgentPickRunner,
  pickLaunchApi,
  pickLaunchCli,
  pickLaunchEffort,
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

describe('launch effort picks', () => {
  it('sends an effort picked alone, for the chat’s own agent', () => {
    expect(launchAgentPickMetadata(pickLaunchEffort(NO_LAUNCH_AGENT_PICK, 'high'))).toEqual({
      effort: 'high',
    })
  })

  it('sends the effort with the side picked', () => {
    expect(launchAgentPickMetadata(pickLaunchEffort(pickLaunchApi(), 'xhigh'))).toEqual({
      runner: 'api',
      effort: 'xhigh',
    })
    expect(
      launchAgentPickMetadata(pickLaunchEffort(pickLaunchCli('claude-code', 'c1', 'opus'), 'max')),
    ).toEqual({
      runner: 'cli',
      cliTool: 'claude-code',
      cliModel: 'opus',
      cliCredentialId: 'c1',
      effort: 'max',
    })
  })

  it('keeps the effort across a model picked after it, and drops it for another side', () => {
    const opusMax = pickLaunchEffort(pickLaunchCli('claude-code', undefined, 'opus'), 'max')
    expect(pickLaunchModel(opusMax, 'sonnet')).toEqual({
      api: false,
      cli: 'claude-code',
      model: 'sonnet',
      effort: 'max',
    })
    expect(pickLaunchCli('codex', undefined, undefined)).not.toHaveProperty('effort')
    expect(pickLaunchApi()).toEqual({ api: true })
  })

  it('clears the effort with undefined, leaving the rest', () => {
    const picked = pickLaunchEffort(pickLaunchApi('low'), undefined)
    expect(picked).toEqual({ api: true })
    expect(launchAgentPickMetadata(picked)).toEqual({ runner: 'api' })
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

describe('launchModelChipSlotOf', () => {
  const slot = {
    model: undefined,
    onPick: () => {},
    cli: undefined,
    onPickCli: () => {},
    api: false,
    onPickApi: () => {},
    effort: undefined,
    onPickEffort: () => {},
  }

  it('shows the CLI and model the launch asks for until the person picks', () => {
    expect(
      launchModelChipSlotOf(slot, { runner: 'cli', cliTool: 'codex', cliModel: 'gpt-5' }),
    ).toMatchObject({ cli: 'codex', model: 'gpt-5', api: false })
  })

  it('shows the API when the launch asks for it', () => {
    expect(launchModelChipSlotOf(slot, { runner: 'api', cliTool: 'codex' })).toMatchObject({
      api: true,
      cli: undefined,
    })
  })

  it('shows the chat’s own agent when the launch asks for none', () => {
    expect(launchModelChipSlotOf(slot, {})).toBe(slot)
  })

  it.each([
    ['a CLI', { cli: 'claude-code' }],
    ['a model', { model: 'opus' }],
    ['the API', { api: true }],
  ])('shows %s the person picked over what the launch asks for', (_label, picked) => {
    const mine = { ...slot, ...picked }
    expect(launchModelChipSlotOf(mine, { runner: 'cli', cliTool: 'codex' })).toBe(mine)
  })

  it('keeps the slot’s pickers, so a pick still reaches the card', () => {
    const shown = launchModelChipSlotOf(slot, { runner: 'cli', cliTool: 'codex' })
    expect(shown.onPickCli).toBe(slot.onPickCli)
    expect(shown.onPick).toBe(slot.onPick)
  })
})
