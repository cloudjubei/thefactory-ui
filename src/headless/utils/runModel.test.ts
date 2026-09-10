import { describe, expect, it } from 'vitest'

import { runModelLabel, runModelOf } from './runModel'

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
