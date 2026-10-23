import { describe, expect, it } from 'vitest'
import {
  projectOverviewApiChoice,
  projectOverviewCliChoice,
  projectOverviewCliModelChoice,
  projectOverviewEffortChoice,
  projectOverviewModelView,
  projectOverviewSwitch,
} from './projectOverviewModel'

const HOSTED = { id: 'cfg-hosted', name: 'Writer', provider: 'anthropic', model: 'claude-sonnet' }
const LOCAL = { id: 'cfg-local', name: 'LM Studio', provider: 'openai', model: 'qwen3-coder' }
const CONFIGS = [HOSTED, LOCAL]
const CLIS = ['claude-code', 'codex']

describe('projectOverviewModelView', () => {
  it('is Off while nothing is chosen', () => {
    expect(projectOverviewModelView(null, CONFIGS, CLIS)).toEqual({
      off: true,
      useCli: false,
      activeConfig: null,
      cli: null,
      cliModelId: undefined,
      credentialId: undefined,
      effort: undefined,
    })
  })

  it('shows a keyless local config like any other', () => {
    expect(
      projectOverviewModelView(
        { runner: 'api', llmConfigId: 'cfg-local', effort: 'high' },
        CONFIGS,
        CLIS,
      ),
    ).toEqual({
      off: false,
      useCli: false,
      activeConfig: LOCAL,
      cli: null,
      cliModelId: undefined,
      credentialId: undefined,
      effort: 'high',
    })
  })

  it('shows a CLI with its model and login', () => {
    expect(
      projectOverviewModelView(
        { runner: 'cli', cli: 'codex', model: 'gpt-5', authCredentialId: 'login-1' },
        CONFIGS,
        CLIS,
      ),
    ).toEqual({
      off: false,
      useCli: true,
      activeConfig: null,
      cli: 'codex',
      cliModelId: 'gpt-5',
      credentialId: 'login-1',
      effort: undefined,
    })
  })

  it('shows a CLI with no model as its default', () => {
    expect(
      projectOverviewModelView({ runner: 'cli', cli: 'claude-code' }, CONFIGS, CLIS),
    ).toMatchObject({
      off: false,
      useCli: true,
      cli: 'claude-code',
      cliModelId: undefined,
    })
  })

  it('shows Off when the chosen config was deleted, as the backend reads it', () => {
    expect(
      projectOverviewModelView({ runner: 'api', llmConfigId: 'gone' }, CONFIGS, CLIS),
    ).toMatchObject({ off: true, activeConfig: null })
  })

  it('shows Off when the chosen CLI is switched off, as the backend reads it', () => {
    expect(
      projectOverviewModelView({ runner: 'cli', cli: 'cursor-agent' }, CONFIGS, CLIS),
    ).toMatchObject({ off: true, useCli: false, cli: null })
  })
})

describe('the overview model picks', () => {
  it('picks an API config, at the effort given', () => {
    expect(projectOverviewApiChoice('cfg-local')).toEqual({
      runner: 'api',
      llmConfigId: 'cfg-local',
    })
    expect(projectOverviewApiChoice('cfg-hosted', 'high')).toEqual({
      runner: 'api',
      llmConfigId: 'cfg-hosted',
      effort: 'high',
    })
  })

  it('picks a CLI on its default model, or on the model given', () => {
    expect(projectOverviewCliChoice('codex')).toEqual({ runner: 'cli', cli: 'codex' })
    expect(projectOverviewCliChoice('claude-code', 'opus')).toEqual({
      runner: 'cli',
      cli: 'claude-code',
      model: 'opus',
    })
  })

  it('picks a CLI model on the CLI chosen, keeping its login and effort', () => {
    expect(
      projectOverviewCliModelChoice(
        {
          runner: 'cli',
          cli: 'claude-code',
          model: 'sonnet',
          authCredentialId: 'login-1',
          effort: 'high',
        },
        'claude-code',
        'opus',
      ),
    ).toEqual({
      runner: 'cli',
      cli: 'claude-code',
      model: 'opus',
      authCredentialId: 'login-1',
      effort: 'high',
    })
  })

  it('picks a CLI model on another CLI or side afresh', () => {
    expect(
      projectOverviewCliModelChoice(
        { runner: 'cli', cli: 'claude-code', authCredentialId: 'login-1', effort: 'high' },
        'codex',
        'gpt-5',
      ),
    ).toEqual({ runner: 'cli', cli: 'codex', model: 'gpt-5' })
    expect(
      projectOverviewCliModelChoice(
        { runner: 'api', llmConfigId: 'cfg-hosted', effort: 'high' },
        'codex',
        'gpt-5',
      ),
    ).toEqual({ runner: 'cli', cli: 'codex', model: 'gpt-5' })
    expect(projectOverviewCliModelChoice(null, 'codex', 'gpt-5')).toEqual({
      runner: 'cli',
      cli: 'codex',
      model: 'gpt-5',
    })
  })

  it('sets an effort on either side, and drops it for the default', () => {
    expect(
      projectOverviewEffortChoice({ runner: 'api', llmConfigId: 'cfg-hosted' }, 'high'),
    ).toEqual({
      runner: 'api',
      llmConfigId: 'cfg-hosted',
      effort: 'high',
    })
    expect(
      projectOverviewEffortChoice(
        { runner: 'cli', cli: 'codex', model: 'gpt-5', effort: 'low' },
        undefined,
      ),
    ).toEqual({ runner: 'cli', cli: 'codex', model: 'gpt-5' })
  })
})

describe('projectOverviewSwitch', () => {
  const base = { activeConfig: null, configs: CONFIGS, activeCli: 'codex', enabledClis: CLIS }

  it('switches to the API on the config shown, else the first, keyed or not', () => {
    expect(projectOverviewSwitch(false, { ...base, activeConfig: LOCAL })).toEqual({
      choice: { runner: 'api', llmConfigId: 'cfg-local' },
    })
    expect(projectOverviewSwitch(false, base)).toEqual({
      choice: { runner: 'api', llmConfigId: 'cfg-hosted' },
    })
  })

  it('switches to the active CLI on its default model, else the first switched on', () => {
    expect(projectOverviewSwitch(true, base)).toEqual({ choice: { runner: 'cli', cli: 'codex' } })
    expect(projectOverviewSwitch(true, { ...base, activeCli: 'cursor-agent' })).toEqual({
      choice: { runner: 'cli', cli: 'claude-code' },
    })
    expect(projectOverviewSwitch(true, { ...base, activeCli: null })).toEqual({
      choice: { runner: 'cli', cli: 'claude-code' },
    })
  })

  it('says why a side has nothing to choose', () => {
    expect(projectOverviewSwitch(false, { ...base, configs: [] })).toEqual({
      error: 'No LLM configs yet.',
    })
    expect(projectOverviewSwitch(true, { ...base, enabledClis: [] })).toEqual({
      error: 'No CLI agents switched on.',
    })
  })
})
