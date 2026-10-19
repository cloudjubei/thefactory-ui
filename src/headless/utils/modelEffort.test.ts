import { describe, expect, it } from 'vitest'

import type { ModelInfo } from '../api'
import {
  asEffortLevel,
  cliModelEffortRows,
  effortDefaultLabel,
  effortLevelLabel,
  modelEffortChoice,
  modelEffortLevels,
} from './modelEffort'

const CLAUDE: ModelInfo[] = [
  { id: 'opus', label: 'Opus', effortLevels: ['low', 'medium', 'high', 'xhigh', 'max'] },
  { id: 'sonnet', label: 'Sonnet', effortLevels: ['max', 'low', 'high', 'medium'] },
  { id: 'haiku', label: 'Haiku' },
  { id: 'empty', label: 'Empty', effortLevels: [] },
] as ModelInfo[]
const LADDER = ['low', 'medium', 'high', 'xhigh', 'max']

describe('asEffortLevel', () => {
  it('reads a level and refuses anything else', () => {
    expect(asEffortLevel('xhigh')).toBe('xhigh')
    expect(asEffortLevel('turbo')).toBeUndefined()
    expect(asEffortLevel(undefined)).toBeUndefined()
    expect(asEffortLevel(3)).toBeUndefined()
  })
})

describe('modelEffortLevels', () => {
  it('reads a listed CLI model’s own levels, in ladder order', () => {
    expect(
      modelEffortLevels({ runner: 'cli', modelId: 'opus', models: CLAUDE, cliLevels: [] }),
    ).toEqual(LADDER)
    expect(
      modelEffortLevels({ runner: 'cli', modelId: 'sonnet', models: CLAUDE, cliLevels: LADDER }),
    ).toEqual(['low', 'medium', 'high', 'max'])
  })

  it('offers nothing for a listed model with no levels, however the CLI is', () => {
    for (const modelId of ['haiku', 'empty']) {
      expect(
        modelEffortLevels({ runner: 'cli', modelId, models: CLAUDE, cliLevels: LADDER }),
      ).toEqual([])
    }
  })

  it('falls back to the CLI’s levels for an unlisted model or none', () => {
    expect(
      modelEffortLevels({
        runner: 'cli',
        modelId: 'gpt-9',
        models: CLAUDE,
        cliLevels: ['high', 'low'],
      }),
    ).toEqual(['low', 'high'])
    expect(
      modelEffortLevels({ runner: 'cli', models: [], cliLevels: ['medium', 'turbo'] }),
    ).toEqual(['medium'])
  })

  it('reads an API model’s levels by its provider, and none for an unknown one', () => {
    expect(
      modelEffortLevels({ runner: 'api', provider: 'anthropic', model: 'claude-opus-5-5' }),
    ).toEqual(LADDER)
    expect(modelEffortLevels({ runner: 'api', provider: 'openai', model: 'gpt-5.5' })).toEqual([
      'low',
      'medium',
      'high',
      'xhigh',
    ])
    expect(modelEffortLevels({ runner: 'api', provider: 'openai', model: 'gpt-4o' })).toEqual([])
    expect(modelEffortLevels({ runner: 'api', model: 'claude-opus-5-5' })).toEqual([])
    expect(modelEffortLevels({ runner: 'api', provider: 'anthropic' })).toEqual([])
  })
})

describe('modelEffortChoice', () => {
  it('shows the choice the model offers, and the model default over the CLI’s', () => {
    expect(
      modelEffortChoice({
        runner: 'cli',
        modelId: 'opus',
        models: CLAUDE,
        cliLevels: LADDER,
        choice: 'max',
        modelDefault: 'xhigh',
        cliDefault: 'low',
      }),
    ).toEqual({ levels: LADDER, value: 'max', defaultValue: 'xhigh' })
  })

  it('drops a choice or a default the model does not offer, falling to the next default', () => {
    expect(
      modelEffortChoice({
        runner: 'cli',
        modelId: 'sonnet',
        models: CLAUDE,
        cliLevels: LADDER,
        choice: 'xhigh',
        modelDefault: 'xhigh',
        cliDefault: 'high',
      }),
    ).toEqual({ levels: ['low', 'medium', 'high', 'max'], defaultValue: 'high' })
  })

  it('has no levels, value or default for a model without effort', () => {
    expect(
      modelEffortChoice({
        runner: 'cli',
        modelId: 'haiku',
        models: CLAUDE,
        cliLevels: LADDER,
        choice: 'low',
        cliDefault: 'low',
      }),
    ).toEqual({ levels: [] })
  })

  it('reads an API config’s choice and its default against its model', () => {
    expect(
      modelEffortChoice({
        runner: 'api',
        provider: 'openai',
        model: 'gpt-5.5',
        choice: 'high',
        configDefault: 'xhigh',
      }),
    ).toEqual({ levels: ['low', 'medium', 'high', 'xhigh'], value: 'high', defaultValue: 'xhigh' })
    expect(
      modelEffortChoice({ runner: 'api', provider: 'openai', model: 'gpt-5.5', choice: 'max' }),
    ).toEqual({ levels: ['low', 'medium', 'high', 'xhigh'] })
    expect(
      modelEffortChoice({
        runner: 'api',
        provider: 'gemini',
        model: 'gemini-3-pro-preview',
        configDefault: 'turbo',
      }),
    ).toEqual({ levels: ['low', 'high'] })
  })
})

describe('labels', () => {
  it('names each level and the default with what it runs at', () => {
    expect(effortLevelLabel('xhigh')).toBe('X-high')
    expect(effortLevelLabel('low')).toBe('Low')
    expect(effortDefaultLabel('high')).toBe('Default · High')
    expect(effortDefaultLabel(undefined)).toBe('Default')
  })
})

describe('cliModelEffortRows', () => {
  it('lists only the models that offer effort, each with its own levels and default', () => {
    expect(cliModelEffortRows(CLAUDE, { opus: 'max', sonnet: 'high', haiku: 'low' })).toEqual([
      { modelId: 'opus', label: 'Opus', levels: LADDER, value: 'max' },
      {
        modelId: 'sonnet',
        label: 'Sonnet',
        levels: ['low', 'medium', 'high', 'max'],
        value: 'high',
      },
    ])
  })

  it('shows no default a model does not offer, and none where nothing is set', () => {
    expect(cliModelEffortRows(CLAUDE, { sonnet: 'xhigh' })[1]).toEqual({
      modelId: 'sonnet',
      label: 'Sonnet',
      levels: ['low', 'medium', 'high', 'max'],
    })
    expect(cliModelEffortRows(CLAUDE, undefined).map((r) => r.value)).toEqual([
      undefined,
      undefined,
    ])
  })

  it('names a model without a label by its id, and lists nothing for no models', () => {
    expect(
      cliModelEffortRows([{ id: 'gpt-5.5', effortLevels: ['high', 'low'] } as ModelInfo], {}),
    ).toEqual([{ modelId: 'gpt-5.5', label: 'gpt-5.5', levels: ['low', 'high'] }])
    expect(cliModelEffortRows([], { opus: 'max' })).toEqual([])
  })
})
