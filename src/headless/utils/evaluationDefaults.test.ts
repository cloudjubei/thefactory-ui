import { describe, expect, it } from 'vitest'

import {
  evaluationDefaultsFieldView,
  evaluationDefaultsModelLabel,
  evaluationDefaultsSummary,
  evaluationDefaultsWithChoice,
  evaluationDefaultsWithConcurrency,
  evaluationDefaultsWithFocus,
  evaluationDefaultsWithModel,
  evaluationModelKind,
  readEvaluationDefaults,
  withEvaluationDefaults,
} from './evaluationDefaults'
import { EVALUATION_DEFAULT_NONE } from './evaluationDefaultsConstants'
import type { KnowledgeEvaluationSettings } from './knowledgeEvaluationTypes'

const SETTINGS: Pick<KnowledgeEvaluationSettings, 'tabDefaults' | 'choices'> = {
  tabDefaults: {
    preset: 'small-clean',
    promptMode: 'production',
    buildMode: 'heuristic',
    concurrency: 4,
  },
  choices: {
    stages: ['smoke', 'saturate'],
    presets: ['small-clean', 'wide'],
    capabilities: [
      { capability: 'grow', label: 'Grow', scenarios: 12 },
      { capability: 'issues', label: 'Issues', scenarios: 30 },
    ],
    fixtures: ['tiny', 'monorepo'],
    promptModes: ['neutral', 'production'],
    buildModes: ['heuristic', 'llm'],
    clis: ['claude-code', 'cursor-agent'],
    concurrencyMax: 16,
  },
}

describe('readEvaluationDefaults', () => {
  it('keeps every setting of the right shape', () => {
    expect(
      readEvaluationDefaults({
        stage: 'saturate',
        preset: ' small-clean ',
        focusCapabilities: ['grow', 'grow', ' issues '],
        focusFixtures: ['tiny'],
        promptMode: 'neutral',
        buildMode: 'llm',
        concurrency: 10,
        cli: 'cursor-agent',
        modelId: 'composer-2.5',
      }),
    ).toEqual({
      stage: 'saturate',
      preset: 'small-clean',
      focusCapabilities: ['grow', 'issues'],
      focusFixtures: ['tiny'],
      promptMode: 'neutral',
      buildMode: 'llm',
      concurrency: 10,
      cli: 'cursor-agent',
      modelId: 'composer-2.5',
    })
  })

  it('drops settings of the wrong shape, and reads none from nothing', () => {
    expect(
      readEvaluationDefaults({
        stage: 'marathon',
        preset: '  ',
        focusCapabilities: 'grow',
        focusFixtures: [3, ''],
        promptMode: 'loud',
        buildMode: 1,
        concurrency: 2.5,
        cli: 'vim',
        modelId: 'm',
      }),
    ).toBeUndefined()
    expect(readEvaluationDefaults({ concurrency: 0 })).toBeUndefined()
    expect(readEvaluationDefaults(null)).toBeUndefined()
    expect(readEvaluationDefaults(['stage'])).toBeUndefined()
    expect(readEvaluationDefaults({})).toBeUndefined()
  })

  it('takes a CLI over an API config, and an API config alone', () => {
    expect(readEvaluationDefaults({ cli: 'codex', llmConfigId: 'cfg' })).toEqual({ cli: 'codex' })
    expect(readEvaluationDefaults({ llmConfigId: ' cfg-1 ', modelId: 'm' })).toEqual({
      llmConfigId: 'cfg-1',
    })
  })
})

describe('withEvaluationDefaults', () => {
  it('sets the defaults under their key, keeping every other key', () => {
    expect(
      withEvaluationDefaults({ icon: 'x', workspaceIncludes: ['a'] }, { stage: 'smoke' }),
    ).toEqual({ icon: 'x', workspaceIncludes: ['a'], evaluationDefaults: { stage: 'smoke' } })
  })

  it('removes the key once nothing is set', () => {
    const metadata = { icon: 'x', evaluationDefaults: { stage: 'smoke' } }
    expect(withEvaluationDefaults(metadata, undefined)).toEqual({ icon: 'x' })
    expect(withEvaluationDefaults(metadata, {})).toEqual({ icon: 'x' })
    expect(withEvaluationDefaults(metadata, { focusCapabilities: [] })).toEqual({ icon: 'x' })
  })
})

describe('evaluationDefaultsSummary', () => {
  it('says the tab defaults apply when none is set', () => {
    expect(evaluationDefaultsSummary(undefined)).toBe('None set — tab defaults apply')
  })

  it('reads every setting in one line', () => {
    expect(
      evaluationDefaultsSummary({
        stage: 'saturate',
        preset: 'small-clean',
        focusCapabilities: ['grow', 'issues'],
        focusFixtures: ['tiny'],
        promptMode: 'neutral',
        buildMode: 'llm',
        concurrency: 10,
        cli: 'cursor-agent',
        modelId: 'composer-2.5',
      }),
    ).toBe(
      'Saturate · small-clean · 2 capabilities · 1 fixture · Neutral · LLM · 10 at once · cursor-agent/composer-2.5',
    )
    expect(evaluationDefaultsSummary({ focusCapabilities: ['grow'], llmConfigId: 'cfg' })).toBe(
      '1 capability · API config cfg',
    )
  })
})

describe('evaluationDefaultsModelLabel', () => {
  it('names a CLI with or without its model, an API config, or nothing', () => {
    expect(evaluationDefaultsModelLabel({ cli: 'codex' })).toBe('codex')
    expect(evaluationDefaultsModelLabel({ cli: 'codex', modelId: 'gpt-5' })).toBe('codex/gpt-5')
    expect(evaluationDefaultsModelLabel({ llmConfigId: 'cfg' })).toBe('API config cfg')
    expect(evaluationDefaultsModelLabel({ stage: 'smoke' })).toBeUndefined()
    expect(evaluationDefaultsModelLabel(undefined)).toBeUndefined()
  })
})

describe('editing the defaults', () => {
  it('sets a choice, and clears it with "not set"', () => {
    const set = evaluationDefaultsWithChoice(undefined, 'stage', 'saturate')
    expect(set).toEqual({ stage: 'saturate' })
    expect(evaluationDefaultsWithChoice(set, 'preset', 'wide')).toEqual({
      stage: 'saturate',
      preset: 'wide',
    })
    expect(evaluationDefaultsWithChoice(set, 'stage', EVALUATION_DEFAULT_NONE)).toBeUndefined()
    expect(evaluationDefaultsWithChoice(set, 'promptMode', 'loud')).toEqual({ stage: 'saturate' })
  })

  it('picks and unpicks a focus name', () => {
    const one = evaluationDefaultsWithFocus(undefined, 'focusCapabilities', 'grow')
    expect(one).toEqual({ focusCapabilities: ['grow'] })
    const two = evaluationDefaultsWithFocus(one, 'focusCapabilities', 'issues')
    expect(two).toEqual({ focusCapabilities: ['grow', 'issues'] })
    expect(evaluationDefaultsWithFocus(two, 'focusCapabilities', 'grow')).toEqual({
      focusCapabilities: ['issues'],
    })
    expect(evaluationDefaultsWithFocus(one, 'focusCapabilities', 'grow')).toBeUndefined()
    expect(evaluationDefaultsWithFocus(one, 'focusFixtures', 'tiny')).toEqual({
      focusCapabilities: ['grow'],
      focusFixtures: ['tiny'],
    })
  })

  it('takes a typed concurrency as a whole number, and clears it otherwise', () => {
    expect(evaluationDefaultsWithConcurrency(undefined, ' 12 ')).toEqual({ concurrency: 12 })
    expect(evaluationDefaultsWithConcurrency({ concurrency: 3, stage: 'smoke' }, '')).toEqual({
      stage: 'smoke',
    })
    expect(evaluationDefaultsWithConcurrency({ concurrency: 3 }, '2.5')).toBeUndefined()
    expect(evaluationDefaultsWithConcurrency({ concurrency: 3 }, 'abc')).toBeUndefined()
    expect(evaluationDefaultsWithConcurrency({ concurrency: 3 }, '0')).toBeUndefined()
  })

  it('sets the model as a CLI or an API config, never both, and clears it', () => {
    const cli = evaluationDefaultsWithModel(
      { stage: 'smoke', llmConfigId: 'cfg' },
      { kind: 'cli', cli: 'cursor-agent', modelId: 'composer-2.5' },
    )
    expect(cli).toEqual({ stage: 'smoke', cli: 'cursor-agent', modelId: 'composer-2.5' })
    expect(evaluationDefaultsWithModel(cli, { kind: 'api', llmConfigId: 'cfg-2' })).toEqual({
      stage: 'smoke',
      llmConfigId: 'cfg-2',
    })
    expect(evaluationDefaultsWithModel(cli, { kind: 'host' })).toEqual({ stage: 'smoke' })
    expect(evaluationDefaultsWithModel(cli, { kind: 'cli', modelId: 'orphan' })).toEqual({
      stage: 'smoke',
    })
    expect(evaluationDefaultsWithModel(undefined, { kind: 'api' })).toBeUndefined()
  })

  it('shows the model kind the defaults name, else the one last picked', () => {
    expect(evaluationModelKind({ cli: 'codex' }, 'api')).toBe('cli')
    expect(evaluationModelKind({ llmConfigId: 'cfg' }, 'host')).toBe('api')
    expect(evaluationModelKind(undefined, 'api')).toBe('api')
    expect(evaluationModelKind({ stage: 'smoke' }, 'host')).toBe('host')
  })
})

describe('evaluationDefaultsFieldView', () => {
  it('shows what every unset control falls back to', () => {
    const view = evaluationDefaultsFieldView(undefined, SETTINGS, 'host')
    expect(view.summary).toBe('None set — tab defaults apply')
    expect(view.stage).toEqual({
      label: 'Stage',
      value: EVALUATION_DEFAULT_NONE,
      options: [
        { value: EVALUATION_DEFAULT_NONE, label: 'None — the agent names it' },
        { value: 'smoke', label: 'Smoke' },
        { value: 'saturate', label: 'Saturate' },
      ],
    })
    expect(view.preset.options[0]).toEqual({
      value: EVALUATION_DEFAULT_NONE,
      label: 'small-clean (tab default)',
    })
    expect(view.promptMode.options[0].label).toBe('Production (tab default)')
    expect(view.buildMode.options[0].label).toBe('Heuristic (tab default)')
    expect(view.concurrency).toEqual({
      label: 'Concurrency',
      value: '',
      placeholder: '4 (tab default)',
      hint: '1 to 16',
    })
    expect(view.focusCapabilities.fallback).toBe('None picked — every capability')
    expect(view.focusFixtures.fallback).toBe('None picked — every fixture')
    expect(view.model).toMatchObject({
      label: 'Model',
      kind: 'host',
      fallback: 'The host’s agent model',
      cli: { value: '', options: [{ value: 'claude-code' }, { value: 'cursor-agent' }] },
    })
    expect(view.model.kinds.map((k) => k.label)).toEqual(['Host default', 'CLI', 'API config'])
    expect(view.clear).toBeUndefined()
  })

  it('shows the defaults set, focus with scenario counts, and a model with no fallback', () => {
    const view = evaluationDefaultsFieldView(
      {
        stage: 'saturate',
        preset: 'small-clean',
        focusCapabilities: ['issues', 'retired'],
        focusFixtures: ['tiny'],
        promptMode: 'neutral',
        buildMode: 'llm',
        concurrency: 10,
        cli: 'cursor-agent',
        modelId: 'composer-2.5',
      },
      SETTINGS,
      'host',
    )
    expect(view.stage.value).toBe('saturate')
    expect(view.preset.value).toBe('small-clean')
    expect(view.promptMode.value).toBe('neutral')
    expect(view.buildMode.value).toBe('llm')
    expect(view.concurrency.value).toBe('10')
    expect(view.focusCapabilities).toEqual({
      label: 'Focus',
      options: [
        { value: 'grow', label: 'Grow', count: '12', selected: false },
        { value: 'issues', label: 'Issues', count: '30', selected: true },
        { value: 'retired', label: 'retired', selected: true },
      ],
    })
    expect(view.focusFixtures.options).toEqual([
      { value: 'tiny', label: 'tiny', selected: true },
      { value: 'monorepo', label: 'monorepo', selected: false },
    ])
    expect(view.model).toMatchObject({
      kind: 'cli',
      cli: { value: 'cursor-agent' },
      modelId: { value: 'composer-2.5' },
    })
    expect(view.model.fallback).toBeUndefined()
    expect(view.clear).toBe('Clear defaults')
  })

  it('keeps a preset the battery no longer lists, and flags a concurrency over the most', () => {
    const view = evaluationDefaultsFieldView(
      { preset: 'retired', concurrency: 40 },
      SETTINGS,
      'host',
    )
    expect(view.preset.options.at(-1)).toEqual({ value: 'retired', label: 'retired' })
    expect(view.concurrency.error).toBe('Concurrency must be a whole number from 1 to 16.')
  })

  it('shows an API config model, and the API choice picked before an id is typed', () => {
    expect(
      evaluationDefaultsFieldView({ llmConfigId: 'cfg-1' }, SETTINGS, 'host').model,
    ).toMatchObject({ kind: 'api', llmConfigId: { value: 'cfg-1' } })
    const picked = evaluationDefaultsFieldView(undefined, SETTINGS, 'api').model
    expect(picked.kind).toBe('api')
    expect(picked.fallback).toBe('The host’s agent model')
  })
})
