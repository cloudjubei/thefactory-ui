import { describe, expect, it } from 'vitest'

import type { ProcessLedgerEntry, ProcessRunModelOverride } from 'thefactory-tools/types'

import {
  entryReportedModel,
  modelDisplayName,
  processRunHeaderModel,
  processRunModelChip,
  processStepModelChip,
  runModelKey,
  runModelLabel,
  runModelOf,
  uniqueRunModels,
} from './runModel'

describe('runModelOf', () => {
  it('reads the CLI tool, model and effort off the record', () => {
    const m = runModelOf({
      cli: { tool: 'claude-code', version: '1.2.3' },
      modelId: 'claude-opus-5',
      effort: 'high',
    })
    expect(m).toEqual({
      tool: 'claude-code',
      tag: 'CLI',
      model: 'claude-opus-5',
      effort: 'high',
    })
  })

  it('reads an absent `cli` as the API transport, not as missing data', () => {
    // Nothing else on the record distinguishes the two executors.
    const m = runModelOf({ modelId: 'gpt-5' })
    expect(m.tool).toBeUndefined()
    expect(m.tag).toBe('API')
    expect(m.model).toBe('gpt-5')
  })

  it('treats a blank model or effort as absent rather than rendering an empty line', () => {
    const m = runModelOf({ modelId: '   ', effort: undefined })
    expect(m.model).toBeUndefined()
    expect(m.effort).toBeUndefined()
  })

  it('carries no model when the record names none', () => {
    expect(runModelOf({}).model).toBeUndefined()
  })
})

describe('runModelOf — the model that ran', () => {
  it('shows the model the CLI reported, and keeps the one asked for as the request', () => {
    const m = runModelOf({
      cli: { tool: 'cursor-agent', version: '' },
      modelId: 'auto',
      reportedModel: 'Composer 2.5',
    })
    expect(m.model).toBe('Composer 2.5')
    expect(m.requested).toBe('auto')
  })

  it('names the reported model when the run asked for none', () => {
    const m = runModelOf({
      cli: { tool: 'claude-code', version: '2.1' },
      reportedModel: 'claude-sonnet-5',
    })
    expect(m.model).toBe('claude-sonnet-5')
    expect(m.requested).toBeUndefined()
  })

  it('does not repeat the request when it is what ran', () => {
    const m = runModelOf({ modelId: 'claude-opus-5', reportedModel: 'claude-opus-5' })
    expect(m.model).toBe('claude-opus-5')
    expect(m.requested).toBeUndefined()
  })

  it('falls back to the requested model when the CLI reported none', () => {
    const m = runModelOf({ modelId: 'composer-2.5', reportedModel: '  ' })
    expect(m.model).toBe('composer-2.5')
    expect(m.requested).toBeUndefined()
  })
})

describe('runModelOf — transport tag', () => {
  it('tags a CLI run CLI, not with the tool name', () => {
    // The tag slot is the transport; "CLAUDE-CODE" shouted in it is the tool's
    // name in the wrong place, and the model slot then had nothing to say.
    expect(runModelOf({ cli: { tool: 'claude-code', version: '1' } }).tag).toBe('CLI')
  })
})

describe('runModelLabel', () => {
  it('prefers the model', () => {
    expect(runModelLabel(runModelOf({ cli: { tool: 'codex', version: '1' }, modelId: 'o4' }))).toBe(
      'o4',
    )
  })

  it('falls back to the executor when no model was recorded', () => {
    expect(runModelLabel(runModelOf({ cli: { tool: 'codex', version: '1' } }))).toBe('codex')
  })

  it('is undefined when there is nothing to name', () => {
    expect(runModelLabel(runModelOf({}))).toBeUndefined()
    expect(runModelLabel(undefined)).toBeUndefined()
  })
})

describe('runModelLabel — as a person reads it', () => {
  it('names a Claude id by its family and version', () => {
    expect(runModelLabel(runModelOf({ modelId: 'claude-opus-5-5' }))).toBe('Opus 5.5')
  })
})

describe('modelDisplayName', () => {
  it.each([
    ['claude-opus-5-5', 'Opus 5.5'],
    ['claude-sonnet-4-6-20260101', 'Sonnet 4.6'],
    ['claude-haiku-5', 'Haiku 5'],
    ['claude-fable-1-0', 'Fable 1.0'],
    ['claude-3-5-sonnet-20241022', 'Sonnet 3.5'],
    ['anthropic/claude-opus-4-8', 'Opus 4.8'],
    ['claude-opus-5-5[1m]', 'Opus 5.5 (1M)'],
    ['opus', 'Opus'],
    ['Sonnet', 'Sonnet'],
  ])('reads %s as %s', (id, name) => {
    expect(modelDisplayName(id)).toBe(name)
  })

  it.each(['gpt-5.3-codex', 'Composer 2.5', 'claude-mystery-5-5', 'constructor', 'auto'])(
    'keeps %s as its tool names it',
    (id) => {
      expect(modelDisplayName(id)).toBe(id)
    },
  )

  it('keeps a context suffix on a name it does not know', () => {
    expect(modelDisplayName('gpt-5[400k]')).toBe('gpt-5 (400K)')
  })

  it('trims around the id', () => {
    expect(modelDisplayName('  claude-opus-5-5 ')).toBe('Opus 5.5')
  })
})

const OPUS = { runner: 'cli' as const, cli: 'claude-code', model: 'opus' }
const SONNET = { runner: 'cli' as const, cli: 'claude-code', model: 'sonnet' }
const OPUS_INPUT = { runner: 'cli', cliRunner: { cli: 'claude-code', model: 'opus' } }
const SONNET_PICK: ProcessRunModelOverride = { ...SONNET, at: 1 }

const spent = (...models: string[]): ProcessLedgerEntry['cost'] => ({
  byModel: models.map((model) => ({
    provider: 'anthropic',
    model,
    billing: 'subscription',
    inputTokens: 1,
    outputTokens: 1,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  })),
})

describe('processRunModelChip', () => {
  it('names the model the spend reports, keeping the one asked for as the request', () => {
    expect(processRunModelChip({ ...OPUS, effort: 'high' }, 'claude-opus-5-5')).toEqual({
      tool: 'claude-code',
      tag: 'CLI',
      model: 'claude-opus-5-5',
      requested: 'opus',
      effort: 'high',
    })
  })

  it('names the model asked for when none was reported', () => {
    expect(processRunModelChip(OPUS)).toMatchObject({ model: 'opus', tag: 'CLI' })
    expect(processRunModelChip(OPUS).requested).toBeUndefined()
  })

  it('does not repeat a request that is what ran', () => {
    expect(processRunModelChip(OPUS, 'opus').requested).toBeUndefined()
  })

  it('tags an API run API, with no tool', () => {
    expect(processRunModelChip({ runner: 'api' })).toMatchObject({ tag: 'API', tool: undefined })
  })
})

describe('entryReportedModel', () => {
  it('is the one model an attempt spent on', () => {
    expect(entryReportedModel({ cost: spent('claude-opus-5-5', 'claude-opus-5-5') })).toBe(
      'claude-opus-5-5',
    )
  })

  it('is undefined for an attempt that spent on two', () => {
    expect(entryReportedModel({ cost: spent('a', 'b') })).toBeUndefined()
  })

  it('prefers the name the tool reported', () => {
    const cost = spent('composer-2.5')
    cost!.byModel![0].label = 'Composer 2.5'
    expect(entryReportedModel({ cost })).toBe('Composer 2.5')
  })

  it('is undefined with no spend', () => {
    expect(entryReportedModel({})).toBeUndefined()
  })
})

describe('processRunHeaderModel', () => {
  it('is the launch’s model, named by what its latest attempt on it reported', () => {
    expect(
      processRunHeaderModel({ input: OPUS_INPUT }, [
        { model: OPUS, cost: spent('claude-opus-5-1') },
        { model: OPUS, cost: spent('claude-opus-5-5') },
      ]),
    ).toMatchObject({ model: 'claude-opus-5-5', requested: 'opus' })
  })

  it('is the person’s choice once they switched, before any attempt ran on it', () => {
    expect(
      processRunHeaderModel({ input: OPUS_INPUT, modelOverride: SONNET_PICK }, [
        { model: OPUS, cost: spent('claude-opus-5-5') },
      ]),
    ).toMatchObject({ model: 'sonnet', tag: 'CLI', tool: 'claude-code' })
  })

  it('is undefined for a run that names no model', () => {
    expect(processRunHeaderModel({})).toBeUndefined()
  })
})

describe('processStepModelChip', () => {
  it('shows an attempt that ran on another model than the run’s now', () => {
    expect(
      processStepModelChip(
        { model: OPUS, cost: spent('claude-opus-5-5') },
        { input: OPUS_INPUT, modelOverride: SONNET_PICK },
      ),
    ).toMatchObject({ model: 'claude-opus-5-5', requested: 'opus' })
  })

  it('shows nothing for an attempt on the run’s model', () => {
    expect(
      processStepModelChip({ model: SONNET }, { input: OPUS_INPUT, modelOverride: SONNET_PICK }),
    ).toBeUndefined()
  })

  it('shows nothing for an attempt that kept no model', () => {
    expect(
      processStepModelChip({}, { input: OPUS_INPUT, modelOverride: SONNET_PICK }),
    ).toBeUndefined()
    expect(processStepModelChip(undefined, { input: OPUS_INPUT })).toBeUndefined()
  })
})

describe('uniqueRunModels', () => {
  it('keeps one chip per transport, tool and model line, in first-seen order', () => {
    const a = processRunModelChip(OPUS, 'claude-opus-5-5')
    const b = processRunModelChip(SONNET)
    expect(uniqueRunModels([a, b, { ...a, requested: undefined }])).toEqual([a, b])
  })

  it('tells the same model on two tools apart', () => {
    const a = processRunModelChip(OPUS)
    expect(runModelKey(a)).not.toBe(runModelKey({ ...a, tool: 'cursor-agent' }))
  })
})
