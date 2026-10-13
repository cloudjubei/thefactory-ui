import { describe, expect, it } from 'vitest'

import {
  activeLlmConfig,
  chatChipCliSelection,
  modelChipLabel,
  modelChipProviderLabel,
} from './modelChip'

describe('modelChipProviderLabel', () => {
  it('names a known provider as a person reads it, whatever its case', () => {
    expect(modelChipProviderLabel('OpenAI')).toBe('OpenAI')
    expect(modelChipProviderLabel('xai')).toBe('xAI')
  })

  it('keeps an unknown provider as given, and nothing as nothing', () => {
    expect(modelChipProviderLabel('mistral')).toBe('mistral')
    expect(modelChipProviderLabel(undefined)).toBe('')
  })
})

describe('modelChipLabel', () => {
  it('shows the active config of an API chat', () => {
    expect(
      modelChipLabel({
        activeConfig: { provider: 'openai', model: 'gpt-6.1-sol' },
        editable: true,
      }),
    ).toEqual({ provider: 'OpenAI', model: 'gpt-6.1-sol', title: 'OpenAI · gpt-6.1-sol' })
  })

  it('prefers the provider and model the caller names', () => {
    expect(
      modelChipLabel({
        provider: 'anthropic',
        model: 'claude-x',
        activeConfig: { provider: 'openai', model: 'gpt' },
      }),
    ).toMatchObject({ provider: 'Anthropic', model: 'claude-x' })
  })

  it('names a CLI chat by its CLI and the short label of its model', () => {
    expect(
      modelChipLabel({
        useCli: true,
        activeCli: 'claude-code',
        model: 'opus',
        cliModels: [{ id: 'opus', label: 'Claude Opus (alias for latest)' }],
        activeConfig: { provider: 'openai', model: 'gpt' },
      }),
    ).toEqual({ provider: 'Claude Code', model: 'Opus latest', title: 'Claude Code · Opus latest' })
  })

  it('names a CLI model the catalogue does not list by its id', () => {
    expect(modelChipLabel({ useCli: true, activeCli: 'codex', model: 'gpt-5.5' }).model).toBe(
      'gpt-5.5',
    )
  })

  it('invites a choice when an editable chip has nothing to show', () => {
    expect(modelChipLabel({ editable: true })).toEqual({
      provider: 'Select',
      model: 'model…',
      title: 'Select model',
    })
  })

  it('says unknown when a read-only chip has nothing to show', () => {
    expect(modelChipLabel({})).toEqual({ provider: '—', model: '', title: 'Unknown model' })
  })

  it('says in the title that the sign-in needs renewing', () => {
    expect(
      modelChipLabel({
        useCli: true,
        activeCli: 'codex',
        model: 'm',
        reauthMessage: 'token expired',
      }).title,
    ).toBe('Codex · m — token expired; re-authenticate in Settings')
    expect(
      modelChipLabel({ useCli: true, activeCli: 'codex', model: 'm', reauthMessage: '' }).title,
    ).toBe('Codex · m — sign-in expired; re-authenticate in Settings')
  })
})

describe('activeLlmConfig', () => {
  const configs = [
    { id: 'a', provider: 'openai', model: 'gpt-6.1-sol' },
    { id: 'b', provider: 'anthropic', model: 'claude' },
  ]

  it('is the chosen config while it exists', () => {
    expect(activeLlmConfig(configs, 'b')?.id).toBe('b')
  })

  it('is the first config when the chosen one is gone — what a send runs on', () => {
    expect(activeLlmConfig(configs, 'deleted')?.id).toBe('a')
  })

  it('is the first config when none was chosen on this device', () => {
    expect(activeLlmConfig(configs, null)?.id).toBe('a')
  })

  it('is nothing with no configs', () => {
    expect(activeLlmConfig([], 'a')).toBeNull()
  })
})

describe('chatChipCliSelection', () => {
  const clis = {
    activeCli: 'claude',
    activeCliCredentialId: 'cred-active',
    defaultModel: { claude: 'sonnet', codex: 'gpt-5' } as Record<string, string | undefined>,
  }

  it('shows an API chat as API, seeded on the active CLI', () => {
    expect(chatChipCliSelection({ ...clis })).toEqual({
      useCli: false,
      selectedCli: 'claude',
      selectedCliModelId: 'sonnet',
      credentialId: 'cred-active',
    })
  })

  it('shows the chat’s own CLI binding', () => {
    expect(
      chatChipCliSelection({
        ...clis,
        cliRunner: { tool: 'codex', model: 'gpt-5-mini', credentialId: 'cred-codex' },
      }),
    ).toEqual({
      useCli: true,
      selectedCli: 'codex',
      selectedCliModelId: 'gpt-5-mini',
      credentialId: 'cred-codex',
    })
  })

  it('shows the CLI chosen for a run over the chat’s, at that CLI’s default model', () => {
    expect(
      chatChipCliSelection({
        ...clis,
        cliRunner: { tool: 'claude', model: 'opus' },
        overrideCli: 'codex',
      }),
    ).toMatchObject({ useCli: true, selectedCli: 'codex', selectedCliModelId: 'gpt-5' })
  })

  it('shows the model chosen for a run over everything else', () => {
    expect(
      chatChipCliSelection({
        ...clis,
        cliRunner: { tool: 'claude', model: 'opus' },
        overrideModel: 'haiku',
      }),
    ).toMatchObject({ useCli: true, selectedCli: 'claude', selectedCliModelId: 'haiku' })
  })

  it('shows the API side when the API was chosen for a run, over the chat’s CLI', () => {
    expect(
      chatChipCliSelection({
        ...clis,
        cliRunner: { tool: 'codex', model: 'gpt-5-mini' },
        overrideApi: true,
      }),
    ).toMatchObject({ useCli: false, selectedCli: 'codex' })
  })

  it('has no CLI to show when none is active, bound or chosen', () => {
    expect(
      chatChipCliSelection({ activeCli: null, activeCliCredentialId: null, defaultModel: {} }),
    ).toEqual({
      useCli: false,
      selectedCli: null,
      selectedCliModelId: undefined,
      credentialId: undefined,
    })
  })
})
